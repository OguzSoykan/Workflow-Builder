import type { Workflow } from '@workflow-builder/workflow-contract';
import type { D1Database } from './d1';

export type RevisionSource = 'manual' | 'ai_create' | 'ai_edit' | 'import' | 'restore';
export interface StoredRevision {
  workflow: Workflow;
  revision: number;
  contentHash: string;
  updatedAt: string;
}
export interface RevisionMeta {
  revision: number;
  contentHash: string;
  source: RevisionSource;
  createdAt: string;
}
export interface WorkflowSummary {
  id: string;
  title: string;
  revision: number;
  updatedAt: string;
}
export type Snapshot = {
  workflow: Workflow;
  json: string;
  contentHash: string;
  source: RevisionSource;
};

// Every query is scoped by owner_uid; IDs are never authority on their own (Architecture §6).
export class WorkflowRepository {
  private readonly db: D1Database;
  private readonly timestamp: () => string;
  constructor(db: D1Database, timestamp: () => string) {
    this.db = db;
    this.timestamp = timestamp;
  }

  async ensureUser(uid: string): Promise<{ preferredLocale: 'tr' | 'en' }> {
    const now = this.timestamp();
    await this.db
      .prepare(
        'INSERT INTO users (firebase_uid, preferred_locale, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (firebase_uid) DO NOTHING',
      )
      .bind(uid, 'tr', now, now)
      .run();
    const row = await this.db
      .prepare('SELECT preferred_locale FROM users WHERE firebase_uid = ?')
      .bind(uid)
      .first<{ preferred_locale: 'tr' | 'en' }>();
    return { preferredLocale: row?.preferred_locale ?? 'tr' };
  }

  private insertRevision(
    owner: string,
    id: string,
    revision: number,
    snapshot: Snapshot,
    now: string,
  ) {
    return this.db
      .prepare(
        'INSERT INTO workflow_revisions (owner_uid, workflow_id, revision_number, schema_version, content_hash, graph_json, source, created_by_uid, created_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)',
      )
      .bind(owner, id, revision, snapshot.contentHash, snapshot.json, snapshot.source, owner, now);
  }

  /** Creates the workflow and revision 1 atomically; false when the owner already has this ID. */
  async create(owner: string, snapshot: Snapshot): Promise<StoredRevision | null> {
    const id = snapshot.workflow.workflowId;
    const now = this.timestamp();
    try {
      await this.db.batch([
        this.db
          .prepare(
            'INSERT INTO workflows (owner_uid, id, title, current_revision_number, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
          )
          .bind(owner, id, snapshot.workflow.title, now, now),
        this.insertRevision(owner, id, 1, snapshot, now),
      ]);
    } catch (error) {
      if (await this.exists(owner, id, true)) return null;
      throw error;
    }
    return {
      workflow: snapshot.workflow,
      revision: 1,
      contentHash: snapshot.contentHash,
      updatedAt: now,
    };
  }

  /**
   * Appends revision expected+1 only while the current revision is still `expected`.
   * Both statements run in one D1 transaction, so parallel writers yield exactly one winner.
   */
  async update(
    owner: string,
    id: string,
    expected: number,
    snapshot: Snapshot,
  ): Promise<{ ok: true; stored: StoredRevision } | { ok: false; current: number | null }> {
    const now = this.timestamp();
    const next = expected + 1;
    try {
      const [inserted] = await this.db.batch([
        this.db
          .prepare(
            'INSERT INTO workflow_revisions (owner_uid, workflow_id, revision_number, schema_version, content_hash, graph_json, source, created_by_uid, created_at) SELECT ?, ?, ?, 1, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM workflows WHERE owner_uid = ? AND id = ? AND current_revision_number = ? AND deleted_at IS NULL)',
          )
          .bind(
            owner,
            id,
            next,
            snapshot.contentHash,
            snapshot.json,
            snapshot.source,
            owner,
            now,
            owner,
            id,
            expected,
          ),
        this.db
          .prepare(
            'UPDATE workflows SET current_revision_number = ?, title = ?, updated_at = ? WHERE owner_uid = ? AND id = ? AND current_revision_number = ? AND deleted_at IS NULL',
          )
          .bind(next, snapshot.workflow.title, now, owner, id, expected),
      ]);
      if (inserted?.meta.changes === 1)
        return {
          ok: true,
          stored: {
            workflow: snapshot.workflow,
            revision: next,
            contentHash: snapshot.contentHash,
            updatedAt: now,
          },
        };
    } catch {
      // A concurrent writer already created revision `next` (unique key); report the conflict.
    }
    return { ok: false, current: await this.currentRevision(owner, id) };
  }

  async currentRevision(owner: string, id: string): Promise<number | null> {
    const row = await this.db
      .prepare(
        'SELECT current_revision_number AS revision FROM workflows WHERE owner_uid = ? AND id = ? AND deleted_at IS NULL',
      )
      .bind(owner, id)
      .first<{ revision: number }>();
    return row?.revision ?? null;
  }

  private async exists(owner: string, id: string, includeDeleted: boolean): Promise<boolean> {
    const row = await this.db
      .prepare(
        `SELECT 1 AS found FROM workflows WHERE owner_uid = ? AND id = ?${includeDeleted ? '' : ' AND deleted_at IS NULL'}`,
      )
      .bind(owner, id)
      .first();
    return row !== null;
  }

  async get(owner: string, id: string): Promise<StoredRevision | null> {
    const row = await this.db
      .prepare(
        'SELECT r.graph_json AS json, r.revision_number AS revision, r.content_hash AS hash, w.updated_at AS updatedAt FROM workflows w JOIN workflow_revisions r ON r.owner_uid = w.owner_uid AND r.workflow_id = w.id AND r.revision_number = w.current_revision_number WHERE w.owner_uid = ? AND w.id = ? AND w.deleted_at IS NULL',
      )
      .bind(owner, id)
      .first<{ json: string; revision: number; hash: string; updatedAt: string }>();
    return row
      ? {
          workflow: JSON.parse(row.json) as Workflow,
          revision: row.revision,
          contentHash: row.hash,
          updatedAt: row.updatedAt,
        }
      : null;
  }

  async list(owner: string, limit: number, after: { updatedAt: string; id: string } | null) {
    const rows = await this.db
      .prepare(
        `SELECT id, title, current_revision_number AS revision, updated_at AS updatedAt FROM workflows WHERE owner_uid = ? AND deleted_at IS NULL${
          after ? ' AND (updated_at < ? OR (updated_at = ? AND id < ?))' : ''
        } ORDER BY updated_at DESC, id DESC LIMIT ?`,
      )
      .bind(...(after ? [owner, after.updatedAt, after.updatedAt, after.id] : [owner]), limit + 1)
      .all<WorkflowSummary>();
    return { items: rows.results.slice(0, limit), more: rows.results.length > limit };
  }

  async softDelete(owner: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        'UPDATE workflows SET deleted_at = ? WHERE owner_uid = ? AND id = ? AND deleted_at IS NULL',
      )
      .bind(this.timestamp(), owner, id)
      .run();
    return result.meta.changes === 1;
  }

  async revisions(owner: string, id: string, limit: number, before: number | null) {
    if (!(await this.exists(owner, id, false))) return null;
    const rows = await this.db
      .prepare(
        `SELECT revision_number AS revision, content_hash AS contentHash, source, created_at AS createdAt FROM workflow_revisions WHERE owner_uid = ? AND workflow_id = ?${
          before === null ? '' : ' AND revision_number < ?'
        } ORDER BY revision_number DESC LIMIT ?`,
      )
      .bind(...(before === null ? [owner, id] : [owner, id, before]), limit + 1)
      .all<RevisionMeta>();
    return { items: rows.results.slice(0, limit), more: rows.results.length > limit };
  }

  async revision(owner: string, id: string, revision: number) {
    if (!(await this.exists(owner, id, false))) return null;
    const row = await this.db
      .prepare(
        'SELECT graph_json AS json, content_hash AS contentHash, source, created_at AS createdAt FROM workflow_revisions WHERE owner_uid = ? AND workflow_id = ? AND revision_number = ?',
      )
      .bind(owner, id, revision)
      .first<{ json: string; contentHash: string; source: RevisionSource; createdAt: string }>();
    return row
      ? {
          workflow: JSON.parse(row.json) as Workflow,
          revision,
          contentHash: row.contentHash,
          source: row.source,
          createdAt: row.createdAt,
        }
      : null;
  }
}
