import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { googleKeySource, verifyFirebaseToken, type KeySource } from './auth/firebase-token';
import { errorResponse, type AppEnv } from './http';
import { WorkflowRepository } from './workflows/repository';
import { registerWorkflowRoutes } from './workflows/routes';
import { registerAiRoutes, registerEditRoute, registerGenerateRoute } from './ai/routes';

export type { AppEnv, Bindings } from './http';
export { AiBudget } from './ai/budget-object';
export interface AppDependencies {
  keys?: KeySource;
  now?: () => number;
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

  // Public browser configuration only: no secrets are exposed here (ADR-020).
  app.get('/api/config', (context) => {
    const { FIREBASE_PROJECT_ID: projectId, FIREBASE_WEB_API_KEY: apiKey } = context.env ?? {};
    const emulator = context.env?.FIREBASE_AUTH_EMULATOR_URL;
    return context.json({
      data: {
        firebase:
          projectId && apiKey
            ? {
                projectId,
                apiKey,
                ...(emulator && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(emulator)
                  ? { authEmulatorUrl: emulator }
                  : {}),
              }
            : null,
      },
      meta: { requestId: context.get('requestId') },
    });
  });

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
  app.get('/api/v1/me', async (context) => {
    const user = context.get('user');
    // The profile row is created on first sight; without storage the default locale applies.
    const db = context.env?.DB;
    const profile = db
      ? await new WorkflowRepository(db, () => new Date(now() * 1000).toISOString()).ensureUser(
          user.uid,
        )
      : { preferredLocale: 'tr' as const };
    return context.json({
      data: {
        uid: user.uid,
        emailVerified: user.emailVerified,
        preferredLocale: profile.preferredLocale,
        cloudSyncAllowed: user.emailVerified,
      },
      meta: { requestId: context.get('requestId') },
    });
  });
  registerWorkflowRoutes(app, now);
  registerAiRoutes(app, now);
  registerGenerateRoute(app, now);
  registerEditRoute(app, now);

  app.notFound((context) => errorResponse(context, 404, 'ROUTE_NOT_FOUND', 'errors.routeNotFound'));
  app.onError((_error, context) =>
    errorResponse(context, 500, 'INTERNAL_ERROR', 'errors.internal'),
  );
  return app;
}

export const app = createApp();
export default app;
