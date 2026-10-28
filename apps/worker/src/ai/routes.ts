import type { Context, Hono } from 'hono';
import { errorResponse, type AppEnv } from '../http';
import { budgetClient } from './budget-object';
import { CREATE_INSTRUCTIONS, DRAFT_SCHEMA, mockDraft, workflowFromDraft } from './draft';
import { providerFromEnv } from './provider';

/** Coarse budget flag for clients; exact ledger totals are never exposed (API Contract §5). */
export function budgetState(
  remainingMicros: number,
  typicalRequestMicros: number,
): 'ok' | 'low' | 'exhausted' {
  if (remainingMicros < typicalRequestMicros) return 'exhausted';
  return remainingMicros < typicalRequestMicros * 10 ? 'low' : 'ok';
}

export const utcDay = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);
export const aiEnabled = (context: Context<AppEnv>) => context.env?.AI_ENABLED === 'true';

/** Upper bound of one request's cost; WB-018 replaces it with the configured model price. */
export const TYPICAL_REQUEST_MICROS = 50_000;

export function registerAiRoutes(app: Hono<AppEnv>, now: () => number) {
  // Members only (no guest AI): disabled AI and unverified email are refused before any ledger call.
  app.use('/api/v1/ai/*', async (context, next) => {
    if (context.req.path === '/api/v1/ai/limits') return next();
    if (!aiEnabled(context)) return errorResponse(context, 403, 'AI_DISABLED', 'errors.aiDisabled');
    if (!context.get('user').emailVerified)
      return errorResponse(context, 403, 'EMAIL_NOT_VERIFIED', 'errors.emailNotVerified');
    await next();
  });

  app.get('/api/v1/ai/limits', async (context) => {
    const user = context.get('user');
    const meta = { requestId: context.get('requestId') };
    if (!aiEnabled(context) || !user.emailVerified)
      return context.json({
        data: { aiEnabled: false, memberRemaining: 0, budgetState: 'unavailable' },
        meta,
      });
    const client = budgetClient(context.env?.AI_BUDGET);
    const [quota, totals] = await Promise.all([
      client.quota(user.uid, utcDay(now())),
      client.totals(),
    ]);
    // Ledger unavailable: AI stays off (fail-closed) and the manual editor keeps working.
    if (!quota || !totals)
      return context.json({
        data: { aiEnabled: false, memberRemaining: 0, budgetState: 'unavailable' },
        meta,
      });
    const state = budgetState(totals.remainingMicros, TYPICAL_REQUEST_MICROS);
    return context.json({
      data: {
        aiEnabled: state !== 'exhausted',
        memberRemaining: Math.max(0, quota.limit - quota.used),
        budgetState: state,
      },
      meta,
    });
  });
}

const MAX_PROMPT = 2000;
type GenerateBody = { prompt?: unknown; locale?: unknown };

/** POST /api/v1/ai/workflows/generate: reserve → call once → settle → validated proposal. */
export function registerGenerateRoute(app: Hono<AppEnv>, now: () => number) {
  app.post('/api/v1/ai/workflows/generate', async (context) => {
    const user = context.get('user');
    const fail = (
      status: 400 | 409 | 413 | 415 | 422 | 429 | 502 | 503,
      code: string,
      key: string,
    ) => errorResponse(context, status, code, key);
    if (!/^application\/json(\s*;|$)/i.test(context.req.header('Content-Type') ?? ''))
      return fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'errors.unsupportedMediaType');
    const key = context.req.header('Idempotency-Key') ?? '';
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(key))
      return fail(400, 'INVALID_REQUEST', 'errors.idempotencyKeyRequired');
    const text = await context.req.text();
    if (text.length > MAX_PROMPT * 4 + 256)
      return fail(413, 'PROMPT_TOO_LONG', 'errors.promptTooLong');
    let body: GenerateBody;
    try {
      body = JSON.parse(text) as GenerateBody;
    } catch {
      return fail(400, 'INVALID_JSON', 'errors.invalidJson');
    }
    if (
      !body ||
      typeof body !== 'object' ||
      Object.keys(body).some((field) => field !== 'prompt' && field !== 'locale')
    )
      return fail(400, 'INVALID_REQUEST', 'errors.invalidRequest');
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const locale = body.locale === 'en' ? 'en' : 'tr';
    if (!prompt) return fail(400, 'INVALID_REQUEST', 'errors.invalidRequest');
    if (prompt.length > MAX_PROMPT) return fail(413, 'PROMPT_TOO_LONG', 'errors.promptTooLong');

    const provider = providerFromEnv(context.env, (request) => mockDraft(request.input));
    if (!provider) return fail(503, 'AI_PROVIDER_UNAVAILABLE', 'errors.aiProviderUnavailable');
    const ledger = budgetClient(context.env?.AI_BUDGET);
    const requestId = `${user.uid}:${key}`;
    const request = {
      instructions: `${CREATE_INSTRUCTIONS}\nLanguage for labels: ${locale === 'en' ? 'English' : 'Turkish'}.`,
      input: prompt,
      schemaName: 'workflow_draft',
      schema: DRAFT_SCHEMA as unknown as Record<string, unknown>,
    };
    const reservation = await ledger.reserve({
      requestId,
      subject: user.uid,
      day: utcDay(now()),
      maxMicros: Math.max(1, provider.maxCostMicros(request)),
    });
    if (!reservation.ok) {
      if (reservation.code === 'AI_LEDGER_UNAVAILABLE')
        return fail(503, reservation.code, 'errors.aiLedgerUnavailable');
      if (reservation.code === 'IDEMPOTENCY_CONFLICT')
        return fail(409, reservation.code, 'errors.idempotencyConflict');
      return fail(
        429,
        reservation.code,
        reservation.code === 'AI_DAILY_QUOTA_REACHED'
          ? 'errors.aiDailyQuota'
          : 'errors.aiBudgetExhausted',
      );
    }
    if (reservation.replay) {
      // Same request again: return the stored answer, never a second provider call.
      const stored = await ledger.result(requestId);
      return stored?.result
        ? context.json(JSON.parse(stored.result) as object)
        : fail(409, 'IDEMPOTENCY_CONFLICT', 'errors.requestInProgress');
    }

    const result = await provider.generate(request);
    const draft =
      result.kind === 'ok'
        ? workflowFromDraft(result.value, `workflow_${crypto.randomUUID()}`, locale)
        : null;
    const payload = draft?.ok
      ? {
          data: {
            proposalId: key,
            candidateWorkflow: draft.workflow,
            validation: draft.validation,
            warnings: draft.validation.valid ? [] : ['AI_PROPOSAL_INCOMPLETE'],
          },
          meta: { requestId: context.get('requestId') },
        }
      : null;
    await ledger.settle(requestId, result.settlement, payload ? JSON.stringify(payload) : null);
    if (payload) return context.json(payload);
    if (result.kind === 'failed' && result.code === 'AI_PROVIDER_UNAVAILABLE')
      return fail(503, 'AI_PROVIDER_UNAVAILABLE', 'errors.aiProviderUnavailable');
    if (result.kind === 'failed' && result.code === 'AI_REFUSED')
      return fail(422, 'AI_REFUSED', 'errors.aiRefused');
    return fail(502, 'AI_PROVIDER_INVALID_RESPONSE', 'errors.aiInvalidResponse');
  });
}
