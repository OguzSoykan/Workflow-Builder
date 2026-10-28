import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { validateWorkflow } from '@workflow-builder/workflow-core';
import { createApp, type Bindings } from '../src/index';
import { AiBudget, budgetClient, type DurableObjectNamespaceLike } from '../src/ai/budget-object';
import { mockDraft, workflowFromDraft } from '../src/ai/draft';
import { utcDay } from '../src/ai/routes';
import type { KeySource } from '../src/auth/firebase-token';
import { keyPair, NOW, PROJECT, signToken } from './auth-helpers';
import { sqliteStore } from './sqlite-store';

let pair: CryptoKeyPair;
let keys: KeySource;
beforeAll(async () => {
  pair = await keyPair();
  keys = async (kid) => (kid === 'test-key' ? pair.publicKey : null);
});
afterEach(() => vi.restoreAllMocks());

const budget = (): DurableObjectNamespaceLike => {
  const object = new AiBudget({ storage: { sql: sqliteStore() } });
  return { idFromName: (name) => name, get: () => ({ fetch: (request) => object.fetch(request) }) };
};
async function generate(
  env: Bindings,
  options: { key?: string | null; body?: unknown; raw?: string; type?: string; sub?: string } = {},
) {
  const token = await signToken(pair.privateKey, { sub: options.sub ?? 'user-a' });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': options.type ?? 'application/json',
  };
  if (options.key !== null) headers['Idempotency-Key'] = options.key ?? 'key-00000001';
  const response = await createApp({ keys, now: () => NOW }).request(
    '/api/v1/ai/workflows/generate',
    {
      method: 'POST',
      headers,
      body:
        options.raw ?? JSON.stringify(options.body ?? { prompt: 'Satın alma onayı', locale: 'tr' }),
    },
    env,
  );
  return {
    status: response.status,
    body: (await response.json()) as {
      data: { proposalId: string; validation: unknown; candidateWorkflow: { nodes: unknown[] } };
      error?: { code: string };
    },
  };
}
const openAi = (env: Partial<Bindings> = {}): Bindings => ({
  FIREBASE_PROJECT_ID: PROJECT,
  AI_ENABLED: 'true',
  AI_PROVIDER: 'openai',
  OPENAI_API_KEY: 'sk-test-placeholder',
  AI_BUDGET: budget(),
  ...env,
});
function stubOpenAi(reply: () => Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => reply());
}
const completed = (value: unknown) =>
  new Response(
    JSON.stringify({
      status: 'completed',
      output: [
        { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] },
      ],
      usage: { input_tokens: 2000, output_tokens: 1000 },
    }),
  );

describe('AI generate route', () => {
  it('returns a validated proposal from the mock provider and consumes the daily request', async () => {
    const env = {
      FIREBASE_PROJECT_ID: PROJECT,
      AI_ENABLED: 'true',
      AI_PROVIDER: 'mock',
      AI_BUDGET: budget(),
    };
    const result = await generate(env);
    expect(result.status).toBe(200);
    expect(result.body.data.proposalId).toBe('key-00000001');
    expect(result.body.data.validation).toEqual({ valid: true, issues: [] });
    expect(result.body.data.candidateWorkflow.nodes).toHaveLength(5);
    expect((await generate(env, { key: 'key-00000002' })).body.error?.code).toBe(
      'AI_DAILY_QUOTA_REACHED',
    );
  });

  it('calls OpenAI once, bills real usage and replays the same key without a second call', async () => {
    const env = openAi();
    const spy = stubOpenAi(() => completed(mockDraft('Satın alma')));
    const first = await generate(env);
    expect(first.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    const totals = await budgetClient(env.AI_BUDGET).totals();
    expect(totals?.committedMicros).toBe(700);
    const replay = await generate(env);
    expect(replay.body).toEqual(first.body);
    expect(spy).toHaveBeenCalledTimes(1);
    // Keys are scoped per user: another member's identical key is an independent request.
    expect((await generate(env, { sub: 'user-b' })).status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('refunds the request when OpenAI refuses before generating', async () => {
    const env = openAi();
    stubOpenAi(() => new Response('{}', { status: 429 }));
    expect((await generate(env)).body.error?.code).toBe('AI_PROVIDER_UNAVAILABLE');
    const quota = await budgetClient(env.AI_BUDGET).quota('user-a', utcDay(NOW));
    expect(quota?.used).toBe(0);
    expect((await budgetClient(env.AI_BUDGET).totals())?.committedMicros).toBe(0);
  });

  it('charges unknown costs and reports invalid or refused answers', async () => {
    const env = openAi();
    stubOpenAi(() => new Response('{}', { status: 502 }));
    expect((await generate(env)).status).toBe(503);
    expect((await budgetClient(env.AI_BUDGET).totals())?.committedMicros).toBeGreaterThan(0);

    stubOpenAi(() => completed({ nonsense: true }));
    expect((await generate(openAi())).body.error?.code).toBe('AI_PROVIDER_INVALID_RESPONSE');
    stubOpenAi(
      () =>
        new Response(
          JSON.stringify({
            status: 'completed',
            output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }],
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
        ),
    );
    expect((await generate(openAi())).body.error?.code).toBe('AI_REFUSED');
  });

  it('stops at the budget and when the ledger or provider is unavailable', async () => {
    const env = openAi();
    await budgetClient(env.AI_BUDGET).reserve({
      requestId: 'big',
      subject: 'other',
      day: 'd',
      maxMicros: 4_499_990,
    });
    const spy = stubOpenAi(() => completed(mockDraft('x')));
    expect((await generate(env)).body.error?.code).toBe('AI_BUDGET_EXHAUSTED');
    expect(spy).not.toHaveBeenCalled();
    const noLedger = openAi();
    delete noLedger.AI_BUDGET;
    expect((await generate(noLedger)).body.error?.code).toBe('AI_LEDGER_UNAVAILABLE');
    expect((await generate(openAi({ OPENAI_API_KEY: '' }))).body.error?.code).toBe(
      'AI_PROVIDER_UNAVAILABLE',
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([
    [{ type: 'text/plain' }, 415, 'UNSUPPORTED_MEDIA_TYPE'],
    [{ key: null }, 400, 'INVALID_REQUEST'],
    [{ key: 'short' }, 400, 'INVALID_REQUEST'],
    [{ raw: '{' }, 400, 'INVALID_JSON'],
    [{ body: { prompt: '   ' } }, 400, 'INVALID_REQUEST'],
    [{ body: { prompt: 'x', owner_uid: 'b' } }, 400, 'INVALID_REQUEST'],
    [{ body: { prompt: 'x'.repeat(2001) } }, 413, 'PROMPT_TOO_LONG'],
  ] as const)('rejects %j before any reservation', async (options, status, code) => {
    const env = openAi();
    const spy = stubOpenAi(() => completed({}));
    const result = await generate(env, options as never);
    expect(result).toMatchObject({ status, body: { error: { code } } });
    expect(spy).not.toHaveBeenCalled();
    expect((await budgetClient(env.AI_BUDGET).quota('user-a', utcDay(NOW)))?.used).toBe(0);
  });
});

describe('draft conversion', () => {
  it('builds a valid workflow with server IDs and a layered layout', () => {
    const result = workflowFromDraft(mockDraft('Satın alma'), 'wf', 'tr');
    if (!result.ok) throw new Error('invalid');
    expect(result.workflow.nodes.map((node) => node.id)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
    expect(result.workflow.nodes.map((node) => node.position.x)).toEqual([40, 340, 640, 640, 940]);
    expect(validateWorkflow(result.workflow).valid).toBe(true);
  });

  it('drops dangling and duplicate edges and reports gaps instead of failing', () => {
    const draft = mockDraft('x');
    draft.edges.push(
      { from: 's', handle: 'next', to: 'no' },
      { from: 'ghost', handle: 'next', to: 's' },
    );
    draft.edges = draft.edges.filter((edge) => !(edge.from === 'a' && edge.handle === 'rejected'));
    const result = workflowFromDraft(draft, 'wf', 'en');
    if (!result.ok) throw new Error('invalid');
    expect(result.workflow.edges).toHaveLength(4);
    expect(result.validation.issues.map((issue) => issue.code)).toContain('HANDLE_MISSING');
  });

  it.each([
    null,
    {},
    { nodes: [], edges: [], inputs: 'x' },
    {
      ...mockDraft('x'),
      inputs: [{ key: '1bad', label: 'x', type: 'number', required: true, options: [] }],
    },
  ])('treats schema-invalid output as an invalid response', (value) => {
    expect(workflowFromDraft(value, 'wf', 'tr')).toEqual({ ok: false });
  });
});
