import { describe, expect, it } from 'vitest';
import { app } from '../src/index';

// Register before Hono compiles its router on the first request.
app.get('/test-only-failure', () => {
  throw new Error('sensitive details');
});

describe('health API', () => {
  it('works without any cloud bindings or credentials', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body).toEqual({ data: { status: 'ok' }, meta: { requestId: expect.any(String) } });
    expect(response.headers.get('X-Request-ID')).toBe(body.meta.requestId);
  });

  it.each(['/api/missing', '/api/v1/workflows', '/api'])(
    'returns a JSON 404 for %s',
    async (path) => {
      const response = await app.request(path, { headers: { 'Sec-Fetch-Mode': 'navigate' } });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: { code: 'ROUTE_NOT_FOUND', messageKey: 'errors.routeNotFound' },
        requestId: response.headers.get('X-Request-ID'),
      });
    },
  );

  it('does not trust a caller supplied request id', async () => {
    const response = await app.request('/api/health', { headers: { 'X-Request-ID': 'untrusted' } });
    expect(response.headers.get('X-Request-ID')).not.toBe('untrusted');
  });

  it('does not leak error messages or stacks', async () => {
    const response = await app.request('/test-only-failure');
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain('INTERNAL_ERROR');
    expect(body).not.toContain('sensitive details');
  });
});
