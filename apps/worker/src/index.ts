import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

export const app = new Hono<{ Variables: { requestId: string } }>();

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
app.notFound((context) =>
  context.json(
    {
      error: { code: 'ROUTE_NOT_FOUND', messageKey: 'errors.routeNotFound' },
      requestId: context.get('requestId'),
    },
    404,
  ),
);
app.onError((_error, context) =>
  context.json(
    {
      error: { code: 'INTERNAL_ERROR', messageKey: 'errors.internal' },
      requestId: context.get('requestId'),
    },
    500,
  ),
);

export default app;
