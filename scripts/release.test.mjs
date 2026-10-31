import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deployProblems } from './check-deploy-config.mjs';
import { smoke } from './smoke.mjs';

const config = readFileSync(new URL('../infra/wrangler.jsonc', import.meta.url), 'utf8');

test('deploy guard refuses placeholder IDs and unknown environments', () => {
  // Both environments have real D1 IDs; placeholders are injected synthetically below.
  assert.deepEqual(deployProblems(config, 'staging'), []);
  assert.deepEqual(deployProblems(config, 'production'), []);
  assert.deepEqual(deployProblems(config, 'nope'), ['Unknown environment "nope".']);
  const placeholder = config.replace(
    /("database_name": "workflow-builder-staging",\s*"database_id": ")[^"]+/,
    '$100000000-0000-0000-0000-00000000aaaa',
  );
  assert.match(deployProblems(placeholder, 'staging')[0], /placeholder database_id/);
  const productionPlaceholder = config.replace(
    /("database_name": "workflow-builder-production",\s*"database_id": ")[^"]+/,
    '$100000000-0000-0000-0000-00000000bbbb',
  );
  assert.match(deployProblems(productionPlaceholder, 'production')[0], /placeholder database_id/);
});

test('smoke test passes a healthy origin and reports each failure', async () => {
  const healthy = async (url) => {
    const path = new URL(url).pathname;
    const json = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' },
      });
    if (path === '/api/health') return json(200, { data: { status: 'ok' } });
    if (path === '/') return new Response('<div id="root"></div>');
    if (path === '/api/config') return json(200, { data: { firebase: null } });
    if (path === '/api/v1/me') return json(503, { error: { code: 'AUTH_NOT_CONFIGURED' } });
    return json(404, { error: { code: 'ROUTE_NOT_FOUND' } });
  };
  assert.ok((await smoke('https://app.example', healthy)).every((result) => result.ok));
  const broken = async () => new Response('down', { status: 500 });
  const results = await smoke('https://app.example', broken);
  assert.equal(results.filter((result) => !result.ok).length, results.length);
  const offline = await smoke('https://app.example', async () => {
    throw new Error('ENOTFOUND');
  });
  assert.match(offline[0].detail, /request failed/);
});

test('deploy workflow is manual, main-only, gated and pinned', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/deploy.yml', import.meta.url),
    'utf8',
  );
  const triggers = workflow.slice(workflow.indexOf('\non:'), workflow.indexOf('\npermissions:'));
  assert.match(triggers, /workflow_dispatch:/);
  assert.doesNotMatch(triggers, /\bpush:|pull_request:|schedule:/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment: \$\{\{ inputs\.environment \}\}/);
  const order = [
    'deploy:check',
    'npm run typecheck',
    'npm run lint',
    'npm test',
    'npm run build',
    'migrations apply',
    'wrangler deploy',
    'npm run smoke',
  ].map((step) => workflow.indexOf(step));
  assert.ok(order.every((position) => position > 0));
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    order,
  );
  for (const use of workflow.matchAll(/uses: ([^\s]+)/g)) assert.match(use[1], /@[0-9a-f]{40}$/);
  assert.doesNotMatch(workflow, /OPENAI|sk-/);
});
