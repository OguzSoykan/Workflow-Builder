import { Hono, type Context } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import {
  googleKeySource,
  verifyFirebaseToken,
  type KeySource,
  type VerifiedUser,
} from './auth/firebase-token';

export type Bindings = { FIREBASE_PROJECT_ID?: string };
export type AppEnv = {
  Bindings: Bindings;
  Variables: { requestId: string; user: VerifiedUser };
};
export interface AppDependencies {
  keys?: KeySource;
  now?: () => number;
}

export function errorResponse(
  context: Context<AppEnv>,
  status: 401 | 403 | 404 | 409 | 413 | 415 | 422 | 500 | 503,
  code: string,
  messageKey: string,
) {
  return context.json({ error: { code, messageKey }, requestId: context.get('requestId') }, status);
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = new Hono<AppEnv>();
  // One key cache per isolate; tests inject their own source and clock.
  const keys = dependencies.keys ?? googleKeySource();
  const now = dependencies.now ?? (() => Math.floor(Date.now() / 1000));

  app.use('*', secureHeaders());
  app.use('*', async (context, next) => {
    const requestId = crypto.randomUUID();
    context.set('requestId', requestId);
    context.header('X-Request-ID', requestId);
    context.header('Cache-Control', 'no-store');
    await next();
  });
  app.get('/api/health', (context) =>
    context.json({
      data: { status: 'ok' },
      meta: { requestId: context.get('requestId') },
    }),
  );

  // Member routes: the owner is always the verified token subject, never a client field.
  app.use('/api/v1/*', async (context, next) => {
    const projectId = context.env?.FIREBASE_PROJECT_ID;
    if (!projectId)
      return errorResponse(context, 503, 'AUTH_NOT_CONFIGURED', 'errors.authNotConfigured');
    const header = context.req.header('Authorization') ?? '';
    const match = /^Bearer ([^\s]+)$/.exec(header);
    if (!match?.[1])
      return errorResponse(context, 401, 'UNAUTHENTICATED', 'errors.unauthenticated');
    const result = await verifyFirebaseToken(match[1], { projectId, keys, now });
    if (!result.ok)
      return errorResponse(
        context,
        401,
        result.code,
        result.code === 'TOKEN_EXPIRED' ? 'errors.tokenExpired' : 'errors.unauthenticated',
      );
    context.set('user', result.user);
    await next();
  });
  app.get('/api/v1/me', (context) => {
    const user = context.get('user');
    return context.json({
      data: {
        uid: user.uid,
        emailVerified: user.emailVerified,
        preferredLocale: 'tr',
        cloudSyncAllowed: user.emailVerified,
      },
      meta: { requestId: context.get('requestId') },
    });
  });

  app.notFound((context) => errorResponse(context, 404, 'ROUTE_NOT_FOUND', 'errors.routeNotFound'));
  app.onError((_error, context) =>
    errorResponse(context, 500, 'INTERNAL_ERROR', 'errors.internal'),
  );
  return app;
}

export const app = createApp();
export default app;
