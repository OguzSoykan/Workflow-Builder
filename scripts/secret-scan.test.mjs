import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { detectSecrets } from './secret-scan.mjs';

test('detects synthetic credentials without ever printing them', () => {
  const samples = [
    ['sk-' + 'proj-' + 'x'.repeat(40), 'openai-key'],
    ['gh' + 'p_' + 'x'.repeat(36), 'github-token'],
    ['github_' + 'pat_' + 'x'.repeat(50), 'github-token'],
    ['AK' + 'IA' + 'A'.repeat(16), 'aws-access-key'],
    ['AI' + 'za' + 'x'.repeat(35), 'google-api-key'],
    ['-----BEGIN ' + 'PRIVATE KEY-----', 'private-key'],
    ['CLOUDFLARE_API_TOKEN=' + 'x'.repeat(40), 'credential-assignment'],
  ];
  for (const [sample, expected] of samples) assert.ok(detectSecrets(sample).includes(expected));
  assert.deepEqual(detectSecrets('OPENAI_API_KEY=<REPLACE_ME>'), []);
});

test('CLI fails closed for a source/build secret or missing build and passes clean files', () => {
  const root = mkdtempSync(join(tmpdir(), 'workflow-secret-test-'));
  const scanner = fileURLToPath(new URL('./secret-scan.mjs', import.meta.url));
  const run = () => spawnSync(process.execPath, [scanner], { cwd: root, encoding: 'utf8' });
  const synthetic = 'sk-' + 'proj-' + 'x'.repeat(40);
  try {
    execFileSync('git', ['init', '--quiet', root]);
    assert.equal(run().status, 1);
    for (const app of ['web', 'worker'])
      mkdirSync(join(root, 'apps', app, 'dist'), { recursive: true });
    writeFileSync(join(root, '.gitignore'), 'apps/*/dist/\n');
    writeFileSync(join(root, 'source.ts'), 'export {};');
    assert.equal(run().status, 0);
    for (const path of ['source.ts', 'apps/web/dist/index.js', 'apps/worker/dist/index.js']) {
      writeFileSync(join(root, path), synthetic);
      const result = run();
      assert.equal(result.status, 1);
      assert.ok(!result.stdout.includes(synthetic) && !result.stderr.includes(synthetic));
      writeFileSync(join(root, path), 'export {};');
    }
    assert.equal(run().status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
