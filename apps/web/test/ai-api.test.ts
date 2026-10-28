import { describe, expect, it } from 'vitest';
import { computeContentHash } from '@workflow-builder/workflow-contract';
import {
  diffText,
  editWorkflow,
  fetchLimits,
  generateWorkflow,
  proposalMatches,
} from '../src/account/ai-api';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

function fetcher(
  reply: { status?: number; body: unknown } | 'offline',
  seen: { init?: RequestInit | undefined } = {},
) {
  return (async (_url: RequestInfo | URL, init?: RequestInit) => {
    seen.init = init;
    if (reply === 'offline') throw new Error('offline');
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  }) as typeof fetch;
}

describe('AI client', () => {
  it('sends the idempotency key and re-validates the proposal', async () => {
    const seen: { init?: RequestInit | undefined } = {};
    const result = await generateWorkflow(
      'tok',
      'Satın alma',
      'ui_key_1234',
      fetcher(
        {
          body: {
            data: {
              candidateWorkflow: purchaseWorkflow(),
              validation: { valid: true, issues: [] },
            },
          },
        },
        seen,
      ),
    );
    expect(result).toMatchObject({
      ok: true,
      proposal: { issueCount: 0, workflow: { title: 'Satın alma' } },
    });
    const headers = new Headers(seen.init?.headers);
    expect(headers.get('idempotency-key')).toBe('ui_key_1234');
    expect(headers.get('authorization')).toBe('Bearer tok');
    expect(JSON.parse(String(seen.init?.body))).toEqual({ prompt: 'Satın alma', locale: 'tr' });
  });

  it.each([
    [{ status: 429, body: { error: { code: 'AI_DAILY_QUOTA_REACHED' } } }, 'Bugünkü AI hakkınızı'],
    [{ status: 429, body: { error: { code: 'AI_BUDGET_EXHAUSTED' } } }, 'bütçesi doldu'],
    [{ status: 422, body: { error: { code: 'AI_REFUSED' } } }, 'yanıtlamadı'],
    [{ status: 500, body: {} }, 'tamamlanamadı'],
    [{ body: { data: { candidateWorkflow: { title: 'bozuk' } } } }, 'geçerli bir akış üretemedi'],
    ['offline', 'Taslağınız değişmedi'],
  ] as const)('maps %j to a safe message', async (reply, text) => {
    expect(await generateWorkflow('t', 'p', 'k', fetcher(reply))).toEqual({
      ok: false,
      message: expect.stringContaining(text),
    });
  });

  it('reads limits and fails quietly', async () => {
    const limits = { aiEnabled: true, memberRemaining: 1, budgetState: 'ok' };
    expect(await fetchLimits('t', fetcher({ body: { data: limits } }))).toEqual(limits);
    expect(await fetchLimits('t', fetcher({ status: 401, body: {} }))).toBeNull();
    expect(await fetchLimits('t', fetcher('offline'))).toBeNull();
  });
});

describe('AI edit client', () => {
  const diff = {
    addedNodes: ['ai-1'],
    removedNodes: [],
    changedNodes: ['manager'],
    addedEdges: ['e-ai-1', 'e-ai-2'],
    removedEdges: ['e-approved'],
    addedInputs: [],
    removedInputs: [],
    changedInputs: [],
    metadataChanged: true,
  };
  it('sends the shown document with its content hash and keeps the base for apply', async () => {
    const base = { ...purchaseWorkflow(), contentHash: 'a'.repeat(64) };
    const seen: { init?: RequestInit | undefined } = {};
    const hash = computeContentHash(purchaseWorkflow());
    const result = await editWorkflow(
      'tok',
      'Finans onayı ekle',
      base,
      'ui_key_edit',
      fetcher(
        {
          body: {
            data: {
              candidateWorkflow: purchaseWorkflow(),
              validation: { issues: [] },
              baseContentHash: hash,
              diffSummary: diff,
            },
          },
        },
        seen,
      ),
    );
    const sent = JSON.parse(String(seen.init?.body)) as {
      workflow: { contentHash?: string };
      baseContentHash: string;
    };
    expect(sent.baseContentHash).toBe(hash);
    expect(sent.workflow.contentHash).toBeUndefined();
    if (!result.ok) throw new Error('failed');
    expect(result.proposal).toMatchObject({ baseContentHash: hash, diff });
    expect(proposalMatches(result.proposal, purchaseWorkflow())).toBe(true);
    expect(proposalMatches(result.proposal, { ...purchaseWorkflow(), title: 'Değişti' })).toBe(
      false,
    );
    expect(
      proposalMatches(
        { workflow: purchaseWorkflow(), issueCount: 0 },
        { ...purchaseWorkflow(), title: 'x' },
      ),
    ).toBe(true);
  });

  it('summarizes the semantic diff and maps stale errors', async () => {
    expect(diffText(diff)).toBe(
      '+1 adım · 1 adım değişti · bağlantı +2/−1 · başlık/açıklama değişti',
    );
    expect(
      diffText({
        ...diff,
        addedNodes: [],
        changedNodes: [],
        addedEdges: [],
        removedEdges: [],
        metadataChanged: false,
        removedNodes: ['x'],
        changedInputs: ['k'],
      }),
    ).toBe('−1 adım · alan +0/−0/~1');
    expect(
      diffText({
        ...diff,
        addedNodes: [],
        changedNodes: [],
        addedEdges: [],
        removedEdges: [],
        metadataChanged: false,
      }),
    ).toBe('Değişiklik yok');
    expect(
      await editWorkflow(
        't',
        'p',
        purchaseWorkflow(),
        'k',
        fetcher({ status: 409, body: { error: { code: 'STALE_PROPOSAL' } } }),
      ),
    ).toEqual({
      ok: false,
      message: expect.stringContaining('Taslak değişti'),
    });
  });
});
