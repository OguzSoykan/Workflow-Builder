import type { Context, Hono } from 'hono';
import {
  computeContentHash,
  parseWorkflow,
  WORKFLOW_LIMITS,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';
import { errorResponse, type AppEnv } from '../http';
import { WorkflowRepository, type RevisionSource, type Snapshot } from './repository';

// The workflow itself is ≤256 KiB; the envelope adds a few small fields.
const MAX_BODY_CHARS = WORKFLOW_LIMITS.bytes + 4096;
const PAGE_LIMIT = 25;
const CLIENT_SOURCES: readonly RevisionSource[] = ['manual', 'import'];

type Body = Record<string, unknown>;
type Parsed = { ok: true; body: Body } | { ok: false; response: Response };

async function readBody(context: Context<AppEnv>, allowed: readonly string[]): Promise<Parsed> {
  const reject = (status: 400 | 413 | 415, code: string, key: string) => ({
    ok: false as const,
    response: errorResponse(context, status, code, key),
  });
  if (!/^application\/json(\s*;|$)/i.test(context.req.header('Content-Type') ?? ''))
    return reject(415, 'UNSUPPORTED_MEDIA_TYPE', 'errors.unsupportedMediaType');
  if (Number(context.req.header('Content-Length') ?? 0) > MAX_BODY_CHARS * 4)
    return reject(413, 'GRAPH_TOO_LARGE', 'errors.graphTooLarge');
  const text = await context.req.text();
  if (text.length > MAX_BODY_CHARS) return reject(413, 'GRAPH_TOO_LARGE', 'errors.graphTooLarge');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reject(400, 'INVALID_JSON', 'errors.invalidJson');
  }
  // Unknown fields (e.g. owner_uid) are rejected: ownership always comes from the token.
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !allowed.includes(key))
  )
    return reject(400, 'INVALID_REQUEST', 'errors.invalidRequest');
  return { ok: true, body: body as Body };
}

/** Full schema + semantic validation before any cloud write (D-03). */
function snapshotFrom(
  context: Context<AppEnv>,
  body: Body,
): { ok: true; snapshot: Snapshot } | { ok: false; response: Response } {
  const source = body.source ?? 'manual';
  if (typeof source !== 'string' || !CLIENT_SOURCES.includes(source as RevisionSource))
    return {
      ok: false,
      response: errorResponse(context, 400, 'INVALID_REQUEST', 'errors.invalidRequest'),
    };
  const validation = validateWorkflow(body.workflow);
  const parsed = parseWorkflow(body.workflow);
  if (!validation.valid || !parsed.success) {
    const code = validation.issues.some((issue) => issue.code === 'SCHEMA_VERSION_UNSUPPORTED')
      ? 'SCHEMA_VERSION_UNSUPPORTED'
      : 'GRAPH_VALIDATION_FAILED';
    return {
      ok: false,
      response: context.json(
        {
          error: {
            code,
            messageKey:
              code === 'GRAPH_VALIDATION_FAILED'
                ? 'errors.graphValidationFailed'
                : 'errors.schemaVersionUnsupported',
            details: { issues: validation.issues.slice(0, 50) },
          },
          requestId: context.get('requestId'),
        },
        code === 'GRAPH_VALIDATION_FAILED' ? 422 : 400,
      ),
    };
  }
  const workflow: Workflow = { ...parsed.data };
  delete workflow.contentHash;
  return {
    ok: true,
    snapshot: {
      workflow,
      json: JSON.stringify(workflow),
      contentHash: computeContentHash(workflow),
      source: source as RevisionSource,
    },
  };
}

function cursor<T>(
  raw: string | undefined,
  check: (value: unknown) => value is T,
): T | null | undefined {
  if (raw === undefined) return null;
  try {
    const value: unknown = JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/')));
    return check(value) ? value : undefined;
  } catch {
    return undefined;
  }
}
const encodeCursor = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function pageLimit(raw: string | undefined): number | undefined {
  if (raw === undefined) return PAGE_LIMIT;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= PAGE_LIMIT ? value : undefined;
}

export function registerWorkflowRoutes(app: Hono<AppEnv>, now: () => number) {
  const repository = (context: Context<AppEnv>) =>
    context.env?.DB
      ? new WorkflowRepository(context.env.DB, () => new Date(now() * 1000).toISOString())
      : null;
  const notFound = (context: Context<AppEnv>) =>
    errorResponse(context, 404, 'WORKFLOW_NOT_FOUND', 'errors.workflowNotFound');
  const invalid = (context: Context<AppEnv>) =>
    errorResponse(context, 400, 'INVALID_REQUEST', 'errors.invalidRequest');
  const meta = (context: Context<AppEnv>, extra: Record<string, unknown> = {}) => ({
    requestId: context.get('requestId'),
    ...extra,
  });

  const guard = async (context: Context<AppEnv>, next: () => Promise<void>) => {
    const repo = repository(context);
    if (!repo)
      return errorResponse(context, 503, 'STORAGE_NOT_CONFIGURED', 'errors.storageNotConfigured');
    // D-05: writes need a verified email; reads only ever return the caller's own data.
    if (context.req.method !== 'GET' && !context.get('user').emailVerified)
      return errorResponse(context, 403, 'EMAIL_NOT_VERIFIED', 'errors.emailNotVerified');
    await repo.ensureUser(context.get('user').uid);
    await next();
  };
  app.use('/api/v1/workflows', guard);
  app.use('/api/v1/workflows/*', guard);

  app.get('/api/v1/workflows', async (context) => {
    const limit = pageLimit(context.req.query('limit'));
    const after = cursor(
      context.req.query('cursor'),
      (value): value is { updatedAt: string; id: string } =>
        !!value &&
        typeof value === 'object' &&
        typeof (value as { updatedAt?: unknown }).updatedAt === 'string' &&
        typeof (value as { id?: unknown }).id === 'string',
    );
    if (limit === undefined || after === undefined) return invalid(context);
    const page = await repository(context)!.list(context.get('user').uid, limit, after);
    const last = page.items.at(-1);
    return context.json({
      data: {
        items: page.items,
        ...(page.more && last
          ? { nextCursor: encodeCursor({ updatedAt: last.updatedAt, id: last.id }) }
          : {}),
      },
      meta: meta(context),
    });
  });

  app.post('/api/v1/workflows', async (context) => {
    const read = await readBody(context, ['workflow', 'source']);
    if (!read.ok) return read.response;
    const built = snapshotFrom(context, read.body);
    if (!built.ok) return built.response;
    const stored = await repository(context)!.create(context.get('user').uid, built.snapshot);
    if (!stored) return errorResponse(context, 409, 'WORKFLOW_EXISTS', 'errors.workflowExists');
    return context.json(
      {
        data: {
          workflowId: built.snapshot.workflow.workflowId,
          revision: 1,
          contentHash: stored.contentHash,
          updatedAt: stored.updatedAt,
        },
        meta: meta(context, { revision: 1 }),
      },
      201,
    );
  });

  app.get('/api/v1/workflows/:id', async (context) => {
    const stored = await repository(context)!.get(context.get('user').uid, context.req.param('id'));
    if (!stored) return notFound(context);
    return context.json({ data: stored, meta: meta(context, { revision: stored.revision }) });
  });

  app.put('/api/v1/workflows/:id', async (context) => {
    const read = await readBody(context, [
      'workflow',
      'expectedRevision',
      'baseContentHash',
      'source',
    ]);
    if (!read.ok) return read.response;
    const expected = read.body.expectedRevision;
    if (!Number.isSafeInteger(expected) || (expected as number) < 1) return invalid(context);
    const built = snapshotFrom(context, read.body);
    if (!built.ok) return built.response;
    const id = context.req.param('id');
    if (built.snapshot.workflow.workflowId !== id) return invalid(context);
    const result = await repository(context)!.update(
      context.get('user').uid,
      id,
      expected as number,
      built.snapshot,
    );
    if (result.ok)
      return context.json({
        data: {
          revision: result.stored.revision,
          contentHash: result.stored.contentHash,
          updatedAt: result.stored.updatedAt,
        },
        meta: meta(context, { revision: result.stored.revision }),
      });
    if (result.current === null) return notFound(context);
    return context.json(
      {
        error: {
          code: 'REVISION_CONFLICT',
          messageKey: 'errors.revisionConflict',
          details: { currentRevision: result.current },
        },
        requestId: context.get('requestId'),
      },
      409,
    );
  });

  app.delete('/api/v1/workflows/:id', async (context) => {
    if (!(await repository(context)!.softDelete(context.get('user').uid, context.req.param('id'))))
      return notFound(context);
    return context.body(null, 204);
  });

  app.get('/api/v1/workflows/:id/revisions', async (context) => {
    const limit = pageLimit(context.req.query('limit'));
    const before = cursor(
      context.req.query('cursor'),
      (value): value is number => Number.isSafeInteger(value) && (value as number) > 1,
    );
    if (limit === undefined || before === undefined) return invalid(context);
    const page = await repository(context)!.revisions(
      context.get('user').uid,
      context.req.param('id'),
      limit,
      before,
    );
    if (!page) return notFound(context);
    const last = page.items.at(-1);
    return context.json({
      data: {
        items: page.items,
        ...(page.more && last ? { nextCursor: encodeCursor(last.revision) } : {}),
      },
      meta: meta(context),
    });
  });

  app.get('/api/v1/workflows/:id/revisions/:n', async (context) => {
    const revision = Number(context.req.param('n'));
    if (!/^[1-9]\d{0,8}$/.test(context.req.param('n'))) return invalid(context);
    const found = await repository(context)!.revision(
      context.get('user').uid,
      context.req.param('id'),
      revision,
    );
    if (!found) return notFound(context);
    return context.json({ data: found, meta: meta(context, { revision }) });
  });
}
