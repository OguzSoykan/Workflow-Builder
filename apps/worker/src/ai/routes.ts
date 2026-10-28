import type { Context, Hono } from 'hono';
import { errorResponse, type AppEnv } from '../http';
import { budgetClient } from './budget-object';

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
