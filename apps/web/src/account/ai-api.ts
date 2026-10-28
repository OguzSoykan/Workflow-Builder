import { parseWorkflow, type Workflow } from '@workflow-builder/workflow-contract';

export interface AiLimits {
  aiEnabled: boolean;
  memberRemaining: number;
  budgetState: 'ok' | 'low' | 'exhausted' | 'unavailable';
}
export type Proposal = { workflow: Workflow; issueCount: number };
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
};

// The proposal is only shown; nothing is applied or saved until the user confirms (AC-06).
export async function generateWorkflow(
  token: string,
  prompt: string,
  key: string,
  fetcher: typeof fetch = (input, init) => fetch(input, init),
): Promise<GenerateResult> {
  let response: Response;
  try {
    response = await fetcher('/api/v1/ai/workflows/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ prompt, locale: 'tr' }),
    });
  } catch {
    return { ok: false, message: 'Sunucuya ulaşılamadı. Taslağınız değişmedi.' };
  }
  const body = (await response.json().catch(() => ({}))) as {
    data?: { candidateWorkflow?: unknown; validation?: { issues?: unknown[] } };
    error?: { code?: string };
  };
  if (!response.ok)
    return { ok: false, message: ERRORS[body.error?.code ?? ''] ?? 'AI isteği tamamlanamadı.' };
  // Server output is re-checked against the shared contract before it can reach the editor.
  const parsed = parseWorkflow(body.data?.candidateWorkflow);
  if (!parsed.success) return { ok: false, message: ERRORS.AI_PROVIDER_INVALID_RESPONSE as string };
  return {
    ok: true,
    proposal: { workflow: parsed.data, issueCount: body.data?.validation?.issues?.length ?? 0 },
  };
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
