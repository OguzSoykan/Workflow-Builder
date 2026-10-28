import type { Context } from 'hono';
import type { VerifiedUser } from './auth/firebase-token';
import type { D1Database } from './workflows/d1';
import type { DurableObjectNamespaceLike } from './ai/budget-object';

export type Bindings = {
  FIREBASE_PROJECT_ID?: string;
  /** Public Firebase web API key (not a secret); enables the browser account UI. */
  FIREBASE_WEB_API_KEY?: string;
  /** Local Firebase Auth emulator origin for development only. */
  FIREBASE_AUTH_EMULATOR_URL?: string;
  DB?: D1Database;
  AI_BUDGET?: DurableObjectNamespaceLike;
  /** "true" enables AI routes; anything else keeps them off (Architecture §4.8). */
  AI_ENABLED?: string;
  /** "openai" (needs OPENAI_API_KEY secret) or "mock" (no network, no cost). */
  AI_PROVIDER?: string;
  /** Secret: set with `wrangler secret put` or a local .dev.vars file; never committed or logged. */
  OPENAI_API_KEY?: string;
  AI_MODEL?: string;
};
export type AppEnv = {
  Bindings: Bindings;
  Variables: { requestId: string; user: VerifiedUser };
};

export function errorResponse(
  context: Context<AppEnv>,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 500 | 503,
  code: string,
  messageKey: string,
) {
  return context.json({ error: { code, messageKey }, requestId: context.get('requestId') }, status);
}
