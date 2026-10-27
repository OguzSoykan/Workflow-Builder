import type { Context } from 'hono';
import type { VerifiedUser } from './auth/firebase-token';
import type { D1Database } from './workflows/d1';

export type Bindings = {
  FIREBASE_PROJECT_ID?: string;
  /** Public Firebase web API key (not a secret); enables the browser account UI. */
  FIREBASE_WEB_API_KEY?: string;
  /** Local Firebase Auth emulator origin for development only. */
  FIREBASE_AUTH_EMULATOR_URL?: string;
  DB?: D1Database;
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
