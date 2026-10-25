import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { ValidationResult } from '@workflow-builder/workflow-contract';

const vector = JSON.parse(
  readFileSync(new URL('../fixtures/hash-vector.json', import.meta.url), 'utf8'),
) as { workflow: unknown; canonicalJSON: string; contentHash: string };

test('canonical UTF-8 vector agrees in Chromium, Web Crypto and a real local Worker', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.addScriptTag({ path: resolve('tests/platform/dist/probe.js') });
  const browser = await page.evaluate(async (workflow) => {
    const probe = (
      globalThis as typeof globalThis & {
        WorkflowProbe: {
          canonicalizeWorkflow(input: unknown): string;
          computeContentHash(input: unknown): string;
          validateWorkflow(input: unknown): ValidationResult;
        };
      }
    ).WorkflowProbe;
    const canonicalJSON = probe.canonicalizeWorkflow(workflow);
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJSON));
    const nativeHash = [...new Uint8Array(bytes)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
    return {
      canonicalJSON,
      contentHash: probe.computeContentHash(workflow),
      nativeHash,
      validation: probe.validateWorkflow(workflow),
    };
  }, vector.workflow);
  const response = await request.post('http://127.0.0.1:8788/', { data: vector.workflow });
  expect(response.status()).toBe(200);
  const expected = {
    canonicalJSON: vector.canonicalJSON,
    contentHash: vector.contentHash,
    validation: { valid: true, issues: [] },
  };
  expect(await response.json()).toEqual(expected);
  expect(browser).toEqual({ ...expected, nativeHash: vector.contentHash });
});

test('Worker fixture revalidates untrusted document structure', async ({ request }) => {
  const response = await request.post('http://127.0.0.1:8788/', { data: { schemaVersion: 2 } });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'INVALID_WORKFLOW' });
});
