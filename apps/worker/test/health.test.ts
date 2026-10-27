import { describe, expect, it } from 'vitest';
import { app } from '../src/index';

app.get('/test-only-failure', () => {
  throw new Error('sensitive details');
});

describe('health API', () => {
  it('does not leak error messages or stacks', async () => {
    const response = await app.request('/test-only-failure');
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain('INTERNAL_ERROR');
    expect(body).not.toContain('sensitive details');
  });
  it('returns health without bindings, with a correlated request ID and safe headers', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    const requestId = response.headers.get('x-request-id');
    expect(requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(await response.json()).toEqual({ data: { status: 'ok' }, meta: { requestId } });
  });

  it.each(['/api', '/api/missing', '/api/v1/workflows', '/api/health/extra'])(
    'returns JSON 404 for %s even for navigation requests',
    async (path) => {
      const response = await app.request(path, { headers: { Accept: 'text/html' } });
      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(await response.json()).toEqual({
        error: { code: 'ROUTE_NOT_FOUND', messageKey: 'errors.routeNotFound' },
        requestId: response.headers.get('x-request-id'),
      });
    },
  );

  it('does not accept writes to the health route', async () => {
    expect((await app.request('/api/health', { method: 'POST' })).status).toBe(404);
  });

  it('creates request IDs server-side for each request', async () => {
    const request = { headers: { 'X-Request-ID': 'untrusted' } };
    const first = await app.request('/api/health', request);
    const second = await app.request('/api/health', request);
    expect(first.headers.get('x-request-id')).not.toBe('untrusted');
    expect(first.headers.get('x-request-id')).not.toBe(second.headers.get('x-request-id'));
  });
});
