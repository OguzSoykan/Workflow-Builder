import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startD1 } from '../../../tests/platform/d1-proxy.mjs';
import { computeContentHash, type Workflow } from '@workflow-builder/workflow-contract';
import { createApp, type Bindings } from '../src/index';
import type { KeySource } from '../src/auth/firebase-token';
import { keyPair, NOW, PROJECT, signToken } from './auth-helpers';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

let d1: Awaited<ReturnType<typeof startD1>>;
let env: Bindings;
let pair: CryptoKeyPair;
let clock = NOW;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  d1 = await startD1();
  env = { FIREBASE_PROJECT_ID: PROJECT, DB: d1.db };
  pair = await keyPair();
  const keys: KeySource = async (kid) => (kid === 'test-key' ? pair.publicKey : null);
  app = createApp({ keys, now: () => clock });
}, 60_000);
afterAll(async () => {
  await d1?.dispose();
});

async function call(
  method: string,
  path: string,
  options: {
    user?: string;
    verified?: boolean;
    body?: unknown;
    raw?: string;
    type?: string;
    bindings?: Bindings;
  } = {},
) {
  const token = await signToken(pair.privateKey, {
    sub: options.user ?? 'user-a',
    email_verified: options.verified ?? true,
    iat: clock - 60,
    exp: clock + 3000,
  });
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const body =
    options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
  if (body !== undefined) headers['Content-Type'] = options.type ?? 'application/json';
  const response = await app.request(
    path,
    { method, headers, ...(body === undefined ? {} : { body }) },
    options.bindings ?? env,
  );
  const text = await response.text();
  return { status: response.status, json: text ? (JSON.parse(text) as ApiBody) : null };
}
interface ApiBody {
  data: {
    items: { id: string; revision: number }[];
    nextCursor?: string;
    [key: string]: unknown;
  };
  error: { code: string; details: { issues: { code: string }[]; currentRevision?: number } };
}
function workflow(id: string, title = 'Satın alma'): Workflow {
  return { ...purchaseWorkflow(), workflowId: id, title };
}

describe('workflow creation', () => {
  it('creates revision 1 for a verified owner', async () => {
    const created = await call('POST', '/api/v1/workflows', {
      body: { workflow: workflow('wf-create') },
    });
    expect(created.status).toBe(201);
    expect(created.json?.data).toMatchObject({
      workflowId: 'wf-create',
      revision: 1,
      contentHash: computeContentHash(workflow('wf-create')),
    });
    const again = await call('POST', '/api/v1/workflows', {
      body: { workflow: workflow('wf-create') },
    });
    expect(again).toMatchObject({ status: 409, json: { error: { code: 'WORKFLOW_EXISTS' } } });
    // The same client ID belongs to a different user independently.
    expect(
      (
        await call('POST', '/api/v1/workflows', {
          user: 'user-b',
          body: { workflow: workflow('wf-create') },
        })
      ).status,
    ).toBe(201);
  });

  it.each([
    [{ verified: false, body: { workflow: workflow('x') } }, 403, 'EMAIL_NOT_VERIFIED'],
    [{ type: 'text/plain', raw: '{}' }, 415, 'UNSUPPORTED_MEDIA_TYPE'],
    [{ raw: '{' }, 400, 'INVALID_JSON'],
    [{ raw: '[]' }, 400, 'INVALID_REQUEST'],
    [{ body: { workflow: workflow('x'), owner_uid: 'user-b' } }, 400, 'INVALID_REQUEST'],
    [{ body: { workflow: workflow('x'), source: 'ai_create' } }, 400, 'INVALID_REQUEST'],
    [
      { raw: JSON.stringify({ workflow: workflow('x'), pad: 'x'.repeat(270_000) }) },
      413,
      'GRAPH_TOO_LARGE',
    ],
    [
      { body: { workflow: { ...workflow('x'), schemaVersion: 2 } } },
      400,
      'SCHEMA_VERSION_UNSUPPORTED',
    ],
    [{ body: { workflow: { ...workflow('x'), edges: [] } } }, 422, 'GRAPH_VALIDATION_FAILED'],
    [{ body: {} }, 422, 'GRAPH_VALIDATION_FAILED'],
  ])('rejects %#', async (options, status, code) => {
    const response = await call('POST', '/api/v1/workflows', options);
    expect(response.status).toBe(status);
    expect(response.json?.error.code).toBe(code);
  });

  it('returns validator issue codes for a semantically incomplete graph', async () => {
    const response = await call('POST', '/api/v1/workflows', {
      body: { workflow: { ...workflow('x'), edges: [] } },
    });
    expect(
      response.json?.error.details.issues.map((issue: { code: string }) => issue.code),
    ).toContain('HANDLE_MISSING');
  });
});

describe('ownership, revisions and optimistic locking', () => {
  beforeAll(async () => {
    await call('POST', '/api/v1/workflows', {
      user: 'owner',
      body: { workflow: workflow('wf-lock') },
    });
  });

  it("hides another user's workflow behind 404 on every route", async () => {
    for (const [method, path, body] of [
      ['GET', '/api/v1/workflows/wf-lock', undefined],
      ['PUT', '/api/v1/workflows/wf-lock', { workflow: workflow('wf-lock'), expectedRevision: 1 }],
      ['DELETE', '/api/v1/workflows/wf-lock', undefined],
      ['GET', '/api/v1/workflows/wf-lock/revisions', undefined],
      ['GET', '/api/v1/workflows/wf-lock/revisions/1', undefined],
    ] as const)
      expect((await call(method, path, { user: 'intruder', body })).json?.error.code).toBe(
        'WORKFLOW_NOT_FOUND',
      );
    expect((await call('GET', '/api/v1/workflows', { user: 'intruder' })).json?.data.items).toEqual(
      [],
    );
  });

  it('appends immutable revisions and rejects stale writes with the current revision', async () => {
    clock += 10;
    const updated = await call('PUT', '/api/v1/workflows/wf-lock', {
      user: 'owner',
      body: {
        workflow: workflow('wf-lock', 'Satın alma v2'),
        expectedRevision: 1,
        source: 'import',
      },
    });
    expect(updated).toMatchObject({ status: 200, json: { data: { revision: 2 } } });
    const stale = await call('PUT', '/api/v1/workflows/wf-lock', {
      user: 'owner',
      body: { workflow: workflow('wf-lock', 'Kayıp yazım'), expectedRevision: 1 },
    });
    expect(stale).toMatchObject({
      status: 409,
      json: { error: { code: 'REVISION_CONFLICT', details: { currentRevision: 2 } } },
    });
    const current = await call('GET', '/api/v1/workflows/wf-lock', { user: 'owner' });
    expect(current.json?.data).toMatchObject({ revision: 2, workflow: { title: 'Satın alma v2' } });
    const first = await call('GET', '/api/v1/workflows/wf-lock/revisions/1', { user: 'owner' });
    expect(first.json?.data).toMatchObject({
      revision: 1,
      source: 'manual',
      workflow: { title: 'Satın alma' },
    });
    expect(
      (await call('GET', '/api/v1/workflows/wf-lock/revisions/9', { user: 'owner' })).status,
    ).toBe(404);
    expect(
      (await call('GET', '/api/v1/workflows/wf-lock/revisions/0', { user: 'owner' })).status,
    ).toBe(400);
  });

  it('lets exactly one of two parallel writers win', async () => {
    const write = (title: string) =>
      call('PUT', '/api/v1/workflows/wf-lock', {
        user: 'owner',
        body: { workflow: workflow('wf-lock', title), expectedRevision: 2 },
      });
    const results = await Promise.all([write('A'), write('B'), write('C')]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409, 409]);
    const revisions = await call('GET', '/api/v1/workflows/wf-lock/revisions', { user: 'owner' });
    expect(revisions.json?.data.items.map((item: { revision: number }) => item.revision)).toEqual([
      3, 2, 1,
    ]);
  });

  it('rejects mismatched IDs and invalid expected revisions', async () => {
    for (const body of [
      { workflow: workflow('other-id'), expectedRevision: 3 },
      { workflow: workflow('wf-lock'), expectedRevision: 0 },
      { workflow: workflow('wf-lock'), expectedRevision: '3' },
    ])
      expect((await call('PUT', '/api/v1/workflows/wf-lock', { user: 'owner', body })).status).toBe(
        400,
      );
    const missing = await call('PUT', '/api/v1/workflows/nope', {
      user: 'owner',
      body: { workflow: workflow('nope'), expectedRevision: 1 },
    });
    expect(missing.status).toBe(404);
  });
});

describe('listing, pagination and soft delete', () => {
  it("pages the owner's workflows newest first and excludes deleted ones", async () => {
    for (const id of ['p-1', 'p-2', 'p-3']) {
      clock += 1;
      await call('POST', '/api/v1/workflows', { user: 'pager', body: { workflow: workflow(id) } });
    }
    const first = await call('GET', '/api/v1/workflows?limit=2', { user: 'pager' });
    expect(first.json?.data.items.map((item: { id: string }) => item.id)).toEqual(['p-3', 'p-2']);
    const second = await call(
      'GET',
      `/api/v1/workflows?limit=2&cursor=${first.json?.data.nextCursor}`,
      { user: 'pager' },
    );
    expect(second.json?.data).toEqual({
      items: [expect.objectContaining({ id: 'p-1', revision: 1 })],
    });
    for (const query of ['limit=0', 'limit=26', 'limit=x', 'cursor=@@', 'cursor=eyJ4IjoxfQ'])
      expect((await call('GET', `/api/v1/workflows?${query}`, { user: 'pager' })).status).toBe(400);

    expect((await call('DELETE', '/api/v1/workflows/p-2', { user: 'pager' })).status).toBe(204);
    expect((await call('DELETE', '/api/v1/workflows/p-2', { user: 'pager' })).status).toBe(404);
    expect((await call('GET', '/api/v1/workflows/p-2', { user: 'pager' })).status).toBe(404);
    expect(
      (await call('DELETE', '/api/v1/workflows/p-1', { user: 'pager', verified: false })).status,
    ).toBe(403);
    const after = await call('GET', '/api/v1/workflows', { user: 'pager' });
    expect(after.json?.data.items.map((item: { id: string }) => item.id)).toEqual(['p-3', 'p-1']);
    // Soft delete keeps the ID reserved; revisions stay stored (D-09).
    expect(
      (
        await call('POST', '/api/v1/workflows', {
          user: 'pager',
          body: { workflow: workflow('p-2') },
        })
      ).status,
    ).toBe(409);
  });

  it('pages revisions with a cursor', async () => {
    await call('POST', '/api/v1/workflows', { user: 'rev', body: { workflow: workflow('r') } });
    for (const expectedRevision of [1, 2])
      await call('PUT', '/api/v1/workflows/r', {
        user: 'rev',
        body: { workflow: workflow('r', `v${expectedRevision + 1}`), expectedRevision },
      });
    const first = await call('GET', '/api/v1/workflows/r/revisions?limit=2', { user: 'rev' });
    expect(first.json?.data.items.map((item: { revision: number }) => item.revision)).toEqual([
      3, 2,
    ]);
    const next = await call(
      'GET',
      `/api/v1/workflows/r/revisions?limit=2&cursor=${first.json?.data.nextCursor}`,
      { user: 'rev' },
    );
    expect(next.json?.data).toEqual({
      items: [expect.objectContaining({ revision: 1, source: 'manual' })],
    });
    expect(
      (await call('GET', '/api/v1/workflows/r/revisions?cursor=MQ', { user: 'rev' })).status,
    ).toBe(400);
  });
});

describe('profile and configuration', () => {
  it('stores the profile on first /me call', async () => {
    const me = await call('GET', '/api/v1/me', { user: 'profile-user', verified: false });
    expect(me.json?.data).toEqual({
      uid: 'profile-user',
      emailVerified: false,
      preferredLocale: 'tr',
      cloudSyncAllowed: false,
    });
    const row = await d1.db
      .prepare('SELECT preferred_locale FROM users WHERE firebase_uid = ?')
      .bind('profile-user')
      .first();
    expect(row).toEqual({ preferred_locale: 'tr' });
  });

  it('reports missing storage as 503', async () => {
    const response = await call('GET', '/api/v1/workflows', {
      bindings: { FIREBASE_PROJECT_ID: PROJECT },
    });
    expect(response).toMatchObject({
      status: 503,
      json: { error: { code: 'STORAGE_NOT_CONFIGURED' } },
    });
  });
});

describe('OpenAPI conformance', () => {
  it('matches the documented success and error envelopes', async () => {
    const { Ajv2020 } = await import('ajv/dist/2020.js');
    const spec = JSON.parse(
      readFileSync(new URL('../../../docs/openapi.json', import.meta.url), 'utf8'),
    ) as object;
    const ajv = new Ajv2020({ strict: false });
    ajv.addFormat('date-time', true);
    ajv.addSchema(spec, 'workflow-api');
    const check = (schema: string, value: unknown) => {
      const validate = ajv.compile({ $ref: `workflow-api#/components/schemas/${schema}` });
      expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
    };
    const created = await call('POST', '/api/v1/workflows', {
      user: 'spec',
      body: { workflow: workflow('spec-wf') },
    });
    check('WorkflowCreated', created.json);
    const saved = await call('PUT', '/api/v1/workflows/spec-wf', {
      user: 'spec',
      body: { workflow: workflow('spec-wf'), expectedRevision: 1 },
    });
    check('WorkflowSaved', saved.json);
    check(
      'WorkflowRecord',
      (await call('GET', '/api/v1/workflows/spec-wf', { user: 'spec' })).json,
    );
    check('WorkflowList', (await call('GET', '/api/v1/workflows', { user: 'spec' })).json);
    check(
      'RevisionList',
      (await call('GET', '/api/v1/workflows/spec-wf/revisions', { user: 'spec' })).json,
    );
    check(
      'RevisionRecord',
      (await call('GET', '/api/v1/workflows/spec-wf/revisions/1', { user: 'spec' })).json,
    );
    check('Profile', (await call('GET', '/api/v1/me', { user: 'spec' })).json);
    check('Error', (await call('GET', '/api/v1/workflows/none', { user: 'spec' })).json);
    check(
      'Error',
      (
        await call('PUT', '/api/v1/workflows/spec-wf', {
          user: 'spec',
          body: { workflow: workflow('spec-wf'), expectedRevision: 1 },
        })
      ).json,
    );
  });
});
