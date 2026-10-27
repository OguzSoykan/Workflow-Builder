import { describe, expect, it } from 'vitest';
import { CloudApi, knownRevision, rememberRevision } from '../src/account/cloud-api';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

type Reply = { status: number; body?: unknown } | 'offline';
function api(replies: Reply[], token: string | null = 'tok') {
  const calls: { method: string; url: string; body: unknown; auth: string | null }[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      method: String(init?.method),
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: new Headers(init?.headers).get('authorization'),
    });
    const reply = replies.shift();
    if (!reply || reply === 'offline') throw new Error('offline');
    return new Response(reply.body === undefined ? '' : JSON.stringify(reply.body), {
      status: reply.status,
    });
  }) as typeof fetch;
  return { client: new CloudApi(async () => token, fetcher), calls };
}
const workflow = { ...purchaseWorkflow(), workflowId: 'wf 1' };

describe('cloud save', () => {
  it('creates the first revision with the bearer token', async () => {
    const { client, calls } = api([{ status: 201, body: { data: { revision: 1 } } }]);
    expect(await client.save(workflow, null)).toEqual({ kind: 'saved', revision: 1 });
    expect(calls[0]).toEqual({
      method: 'POST',
      url: '/api/v1/workflows',
      body: { workflow, source: 'manual' },
      auth: 'Bearer tok',
    });
  });

  it('turns an existing record into an explicit conflict instead of overwriting', async () => {
    const { client, calls } = api([
      { status: 409, body: { error: { code: 'WORKFLOW_EXISTS' } } },
      { status: 200, body: { data: { revision: 4 } } },
    ]);
    expect(await client.save(workflow, null)).toEqual({ kind: 'conflict', currentRevision: 4 });
    expect(calls[1]).toMatchObject({ method: 'GET', url: '/api/v1/workflows/wf%201' });
    const deleted = api([
      { status: 409, body: { error: { code: 'WORKFLOW_EXISTS' } } },
      { status: 404, body: { error: { code: 'WORKFLOW_NOT_FOUND' } } },
    ]);
    expect(await deleted.client.save(workflow, null)).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('silinmiş'),
    });
  });

  it('updates with the known revision and reports stale writes', async () => {
    const { client, calls } = api([
      { status: 200, body: { data: { revision: 3 } } },
      {
        status: 409,
        body: { error: { code: 'REVISION_CONFLICT', details: { currentRevision: 5 } } },
      },
      { status: 200, body: { data: { revision: 6 } } },
    ]);
    expect(await client.save(workflow, 2)).toEqual({ kind: 'saved', revision: 3 });
    expect(calls[0]).toMatchObject({
      method: 'PUT',
      url: '/api/v1/workflows/wf%201',
      body: { workflow, expectedRevision: 2, source: 'manual' },
    });
    expect(await client.save(workflow, 3)).toEqual({ kind: 'conflict', currentRevision: 5 });
    expect(await client.overwrite(workflow, 5)).toEqual({ kind: 'saved', revision: 6 });
    expect(calls[2]?.body).toMatchObject({ expectedRevision: 5 });
  });

  it.each([
    [{ status: 403, body: { error: { code: 'EMAIL_NOT_VERIFIED' } } }, 'e-postanızı doğrulayın'],
    [
      { status: 422, body: { error: { code: 'GRAPH_VALIDATION_FAILED' } } },
      'doğrulama sorunu olmayan',
    ],
    [{ status: 503, body: { error: { code: 'STORAGE_NOT_CONFIGURED' } } }, 'yapılandırılmadı'],
    [{ status: 500 }, 'tamamlanamadı'],
    ['offline', 'Yerel taslağınız korunuyor'],
  ] as const)('maps %j to a message', async (reply, text) => {
    expect(await api([reply]).client.save(workflow, null)).toMatchObject({
      kind: 'error',
      message: expect.stringContaining(text),
    });
    expect(await api([reply]).client.save(workflow, 1)).toMatchObject({ kind: 'error' });
  });

  it('does not call the API without a session token', async () => {
    const { client, calls } = api([], null);
    expect(await client.save(workflow, null)).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('Tekrar giriş'),
    });
    expect(calls).toHaveLength(0);
  });

  it('lists revisions', async () => {
    const items = [
      {
        revision: 2,
        contentHash: 'a'.repeat(64),
        source: 'manual',
        createdAt: '2026-10-28T00:00:00.000Z',
      },
    ];
    expect(await api([{ status: 200, body: { data: { items } } }]).client.revisions('wf')).toEqual(
      items,
    );
    expect(await api([{ status: 404, body: {} }]).client.revisions('wf')).toBeNull();
  });
});

describe('known revisions', () => {
  it('are kept per user and workflow and survive broken storage', () => {
    const values = new Map<string, string>();
    const store = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => void values.set(k, v),
    };
    expect(knownRevision(store, 'u', 'wf')).toBeNull();
    rememberRevision(store, 'u', 'wf', 3);
    rememberRevision(store, 'v', 'wf', 7);
    expect(knownRevision(store, 'u', 'wf')).toBe(3);
    expect(knownRevision(store, 'v', 'wf')).toBe(7);
    values.set('workflow-builder:cloud-revisions:v1', '{');
    expect(knownRevision(store, 'u', 'wf')).toBeNull();
    expect(() => rememberRevision(store, 'u', 'wf', 1)).not.toThrow();
    expect(knownRevision(null, 'u', 'wf')).toBeNull();
  });
});
