// Post-deploy smoke test against a deployed origin (WB-023). Read-only: no writes, no AI calls.
export async function smoke(origin, fetcher = fetch) {
  const results = [];
  const check = async (name, path, expect) => {
    try {
      const response = await fetcher(new URL(path, origin), {
        headers: { Accept: 'application/json' },
      });
      const body = await response.text();
      const problem = expect(response, body);
      results.push({ name, ok: !problem, detail: problem ?? `HTTP ${response.status}` });
    } catch (error) {
      results.push({ name, ok: false, detail: `request failed: ${error.message}` });
    }
  };
  await check('health', '/api/health', (r, b) =>
    r.status === 200 && JSON.parse(b).data?.status === 'ok' ? null : `unexpected ${r.status}`,
  );
  await check('spa', '/', (r, b) =>
    r.status === 200 && b.includes('<div id="root"') ? null : `unexpected ${r.status}`,
  );
  await check('config', '/api/config', (r, b) =>
    r.status === 200 && 'firebase' in (JSON.parse(b).data ?? {}) ? null : `unexpected ${r.status}`,
  );
  await check('unknown api route', '/api/missing', (r, b) =>
    r.status === 404 && JSON.parse(b).error?.code === 'ROUTE_NOT_FOUND'
      ? null
      : `unexpected ${r.status}`,
  );
  await check('member route without token', '/api/v1/me', (r) =>
    [401, 503].includes(r.status) ? null : `unexpected ${r.status}`,
  );
  await check('security headers', '/api/health', (r) =>
    r.headers.get('x-content-type-options') === 'nosniff' &&
    r.headers.get('cache-control') === 'no-store'
      ? null
      : 'missing headers',
  );
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const origin = process.argv[2];
  if (!origin) {
    console.error('Usage: node scripts/smoke.mjs https://example.workers.dev');
    process.exit(1);
  }
  const results = await smoke(origin);
  for (const result of results)
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}: ${result.detail}`);
  if (results.some((result) => !result.ok)) process.exit(1);
}
