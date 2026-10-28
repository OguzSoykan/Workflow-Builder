import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { computeContentHash, type Workflow } from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';
import { createApp, type Bindings } from '../src/index';
import { AiBudget, budgetClient, type DurableObjectNamespaceLike } from '../src/ai/budget-object';
import { proposalFromModel } from '../src/ai/edit';
import { utcDay } from '../src/ai/routes';
import type { KeySource } from '../src/auth/firebase-token';
import { keyPair, NOW, PROJECT, signToken } from './auth-helpers';
import { sqliteStore } from './sqlite-store';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

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
type Body = {
  data: {
    baseContentHash: string;
    candidateWorkflow: Workflow;
    diffSummary: Record<string, unknown>;
    validation: { valid: boolean };
    operations: unknown[];
  };
  error?: { code: string };
};
async function edit(env: Bindings, body: Record<string, unknown>) {
  const token = await signToken(pair.privateKey);
  const response = await createApp({ keys, now: () => NOW }).request(
    '/api/v1/ai/workflows/edit',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'edit-key-0001',
      },
      body: JSON.stringify(body),
    },
    env,
  );
  return { status: response.status, body: (await response.json()) as Body };
}
const base = purchaseWorkflow();
const request = (extra: Record<string, unknown> = {}) => ({
  prompt: 'Yönetici onayından sonra finans onayı ekle',
  workflow: base,
  baseContentHash: computeContentHash(base),
  ...extra,
});
const env = (extra: Partial<Bindings> = {}): Bindings => ({
  FIREBASE_PROJECT_ID: PROJECT,
  AI_ENABLED: 'true',
  AI_PROVIDER: 'mock',
  AI_BUDGET: budget(),
  ...extra,
});
const financeOps = {
  explanation: 'Finans onayı eklendi.',
  operations: [
    { op: 'addEdge', from: 'fin', handle: 'approved', to: 'completed' },
    {
      op: 'addNode',
      ref: 'fin',
      type: 'approval',
      label: 'Finans onayı',
      roleLabel: 'Finans',
      outcome: null,
      condition: null,
    },
    { op: 'deleteEdge', id: 'e-approved' },
    { op: 'addEdge', from: 'manager', handle: 'approved', to: 'fin' },
    { op: 'addEdge', from: 'fin', handle: 'rejected', to: 'rejected' },
  ],
};

describe('AI edit route', () => {
  it('returns a diffed proposal on the same base hash with unchanged IDs (mock)', async () => {
    const result = await edit(env(), request());
    expect(result.status).toBe(200);
    expect(result.body.data.baseContentHash).toBe(computeContentHash(base));
    expect(result.body.data.candidateWorkflow.title).toBe('Satın alma (düzenlendi)');
    expect(result.body.data.candidateWorkflow.nodes.map((node) => node.id)).toEqual(
      base.nodes.map((node) => node.id),
    );
    expect(result.body.data.diffSummary).toMatchObject({
      changedNodes: ['manager'],
      metadataChanged: true,
      addedNodes: [],
      removedNodes: [],
    });
  });

  it('rejects a stale or mismatched base before reserving anything', async () => {
    const target = env();
    expect(
      (await edit(target, request({ baseContentHash: 'f'.repeat(64) }))).body.error?.code,
    ).toBe('STALE_PROPOSAL');
    expect(
      (await edit(target, request({ workflow: { ...base, title: 'Başka' } }))).body.error?.code,
    ).toBe('STALE_PROPOSAL');
    expect((await edit(target, request({ workflow: { nodes: 'x' } }))).body.error?.code).toBe(
      'INVALID_REQUEST',
    );
    expect((await budgetClient(target.AI_BUDGET).quota('user-a', utcDay(NOW)))?.used).toBe(0);
  });

  it('applies model operations with refs, new IDs and canonical order (OpenAI stub)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            status: 'completed',
            output: [
              {
                type: 'message',
                content: [{ type: 'output_text', text: JSON.stringify(financeOps) }],
              },
            ],
            usage: { input_tokens: 3000, output_tokens: 500 },
          }),
        ),
    );
    const result = await edit(
      env({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test-placeholder' }),
      request(),
    );
    expect(result.status).toBe(200);
    const candidate = result.body.data.candidateWorkflow;
    expect(validateWorkflow(candidate)).toEqual({ valid: true, issues: [] });
    expect(candidate.nodes.slice(0, 5)).toEqual(base.nodes);
    expect(result.body.data.diffSummary).toMatchObject({
      addedNodes: ['ai-1'],
      removedEdges: ['e-approved'],
    });
  });

  it('treats operations on unknown nodes as an invalid response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            status: 'completed',
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      explanation: '',
                      operations: [{ op: 'deleteNode', id: 'ghost' }],
                    }),
                  },
                ],
              },
            ],
            usage: { input_tokens: 10, output_tokens: 10 },
          }),
        ),
    );
    const target = env({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test-placeholder' });
    expect((await edit(target, request())).body.error?.code).toBe('AI_PROVIDER_INVALID_RESPONSE');
    expect((await budgetClient(target.AI_BUDGET).totals())?.committedMicros).toBeGreaterThan(0);
  });
});

describe('model operation conversion', () => {
  it.each([
    [null],
    [{ operations: 'x' }],
    [{ operations: [{ op: 'explode' }] }],
    [
      {
        operations: [
          {
            op: 'updateNode',
            id: 'ghost',
            label: 'x',
            roleLabel: null,
            outcome: null,
            condition: null,
          },
        ],
      },
    ],
    [
      {
        operations: Array.from({ length: 101 }, () => ({
          op: 'updateMetadata',
          title: 'x',
          description: null,
        })),
      },
    ],
    [{ operations: [{ op: 'removeInputField', key: 'amount' }] }],
  ])('rejects %j', (value) => {
    expect(proposalFromModel(value, base)).toEqual({ ok: false });
  });

  it('updates roles, outcomes, conditions, fields and metadata', () => {
    const result = proposalFromModel(
      {
        operations: [
          {
            op: 'updateNode',
            id: 'manager',
            label: 'Müdür onayı',
            roleLabel: 'Müdür',
            outcome: null,
            condition: null,
          },
          {
            op: 'updateNode',
            id: 'rejected',
            label: null,
            roleLabel: null,
            outcome: 'completed',
            condition: null,
          },
          {
            op: 'updateNode',
            id: 'threshold',
            label: null,
            roleLabel: null,
            outcome: null,
            condition: { fieldKey: 'amount', operator: 'gte', value: 5000 },
          },
          {
            op: 'upsertInputField',
            key: 'dept',
            label: 'Departman',
            type: 'enum',
            required: true,
            options: ['IT'],
          },
          { op: 'updateMetadata', title: null, description: 'Yeni açıklama' },
        ],
      },
      base,
    );
    if (!result.ok) throw new Error('invalid');
    expect(result.workflow.nodes.find((node) => node.id === 'manager')).toMatchObject({
      label: 'Müdür onayı',
      config: { roleLabel: 'Müdür' },
    });
    expect(result.workflow.nodes.find((node) => node.id === 'rejected')).toMatchObject({
      config: { outcome: 'completed' },
    });
    expect(result.workflow.inputs.map((field) => field.key)).toEqual(['amount', 'dept']);
    expect(result.workflow.description).toBe('Yeni açıklama');
    expect(result.workflow.title).toBe(base.title);
  });
});
