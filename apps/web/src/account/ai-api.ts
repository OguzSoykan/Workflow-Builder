import {
  computeContentHash,
  parseWorkflow,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import { getLocale, t } from '../i18n/i18n';

export interface AiLimits {
  aiEnabled: boolean;
  memberRemaining: number;
  budgetState: 'ok' | 'low' | 'exhausted' | 'unavailable';
}
export interface DiffSummary {
  addedNodes: string[];
  removedNodes: string[];
  changedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
  addedInputs: string[];
  removedInputs: string[];
  changedInputs: string[];
  metadataChanged: boolean;
}
export type Proposal = {
  workflow: Workflow;
  issueCount: number;
  baseContentHash?: string;
  diff?: DiffSummary;
};
export type GenerateResult = { ok: true; proposal: Proposal } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  AI_DAILY_QUOTA_REACHED: 'Bugünkü AI hakkınızı kullandınız. Yarın (UTC) yeniden deneyebilirsiniz.',
  AI_BUDGET_EXHAUSTED: 'AI bütçesi doldu. Akışı elle düzenlemeye devam edebilirsiniz.',
  AI_DISABLED: 'AI şu an kapalı. Akışı elle düzenleyebilirsiniz.',
  AI_LEDGER_UNAVAILABLE: 'AI geçici olarak kullanılamıyor. Akışı elle düzenleyebilirsiniz.',
  AI_PROVIDER_UNAVAILABLE: 'AI hizmetine ulaşılamadı. Biraz sonra tekrar deneyin.',
  AI_PROVIDER_INVALID_RESPONSE:
    'AI geçerli bir akış üretemedi. Açıklamayı sadeleştirip tekrar deneyin.',
  AI_REFUSED: 'AI bu isteği yanıtlamadı. Açıklamayı iş akışına odaklayarak yeniden yazın.',
  EMAIL_NOT_VERIFIED: 'AI için önce e-postanızı doğrulayın.',
  PROMPT_TOO_LONG: 'Açıklama en fazla 2000 karakter olabilir.',
  STALE_PROPOSAL: 'Taslak değişti; düzenleme önerisini yeniden isteyin.',
};

// The proposal is only shown; nothing is applied or saved until the user confirms (AC-06).
async function propose(
  path: string,
  token: string,
  key: string,
  body: Record<string, unknown>,
  fetcher: typeof fetch,
): Promise<GenerateResult> {
  let response: Response;
  try {
    response = await fetcher(path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: t('Sunucuya ulaşılamadı. Taslağınız değişmedi.') };
  }
  const json = (await response.json().catch(() => ({}))) as {
    data?: {
      candidateWorkflow?: unknown;
      validation?: { issues?: unknown[] };
      baseContentHash?: string;
      diffSummary?: DiffSummary;
    };
    error?: { code?: string };
  };
  if (!response.ok)
    return {
      ok: false,
      message:
        (ERRORS[json.error?.code ?? ''] && t(ERRORS[json.error?.code ?? ''] as string)) ??
        t('AI isteği tamamlanamadı.'),
    };
  // Server output is re-checked against the shared contract before it can reach the editor.
  const parsed = parseWorkflow(json.data?.candidateWorkflow);
  if (!parsed.success)
    return { ok: false, message: t(ERRORS.AI_PROVIDER_INVALID_RESPONSE as string) };
  return {
    ok: true,
    proposal: {
      workflow: parsed.data,
      issueCount: json.data?.validation?.issues?.length ?? 0,
      ...(json.data?.baseContentHash ? { baseContentHash: json.data.baseContentHash } : {}),
      ...(json.data?.diffSummary ? { diff: json.data.diffSummary } : {}),
    },
  };
}

/** Sends the shown document with its content hash; the server rejects a mismatch as stale. */
export function editWorkflow(
  token: string,
  prompt: string,
  workflow: Workflow,
  key: string,
  fetcher: typeof fetch = (input, init) => fetch(input, init),
): Promise<GenerateResult> {
  const document = { ...workflow };
  delete document.contentHash;
  return propose(
    '/api/v1/ai/workflows/edit',
    token,
    key,
    {
      prompt,
      locale: getLocale(),
      workflow: document,
      baseContentHash: computeContentHash(document),
    },
    fetcher,
  );
}

/** True while the editor still shows exactly the document the edit proposal was made for. */
export function proposalMatches(proposal: Proposal, current: Workflow): boolean {
  if (!proposal.baseContentHash) return true;
  const document = { ...current };
  delete document.contentHash;
  return computeContentHash(document) === proposal.baseContentHash;
}

export function diffText(diff: DiffSummary): string {
  const parts = [
    diff.addedNodes.length && t('+{length} adım', { length: diff.addedNodes.length }),
    diff.removedNodes.length && t('−{length} adım', { length: diff.removedNodes.length }),
    diff.changedNodes.length && t('{length} adım değişti', { length: diff.changedNodes.length }),
    (diff.addedEdges.length || diff.removedEdges.length) &&
      t('bağlantı +{length}/−{length1}', {
        length: diff.addedEdges.length,
        length1: diff.removedEdges.length,
      }),
    (diff.addedInputs.length || diff.removedInputs.length || diff.changedInputs.length) &&
      `alan +${diff.addedInputs.length}/−${diff.removedInputs.length}/~${diff.changedInputs.length}`,
    diff.metadataChanged && t('başlık/açıklama değişti'),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : t('Değişiklik yok');
}

export function generateWorkflow(
  token: string,
  prompt: string,
  key: string,
  fetcher: typeof fetch = (input, init) => fetch(input, init),
): Promise<GenerateResult> {
  return propose(
    '/api/v1/ai/workflows/generate',
    token,
    key,
    { prompt, locale: getLocale() },
    fetcher,
  );
}

export async function fetchLimits(
  token: string,
  fetcher: typeof fetch = (input, init) => fetch(input, init),
): Promise<AiLimits | null> {
  try {
    const response = await fetcher('/api/v1/ai/limits', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return ((await response.json()) as { data: AiLimits }).data;
  } catch {
    return null;
  }
}
