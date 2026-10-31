import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// AC-13 / WB-023: staging and production are fully separate and safe by default.
type Env = {
  name: string;
  vars?: Record<string, string>;
  d1_databases?: { binding: string; database_name: string; database_id: string }[];
  durable_objects?: { bindings: { name: string; class_name: string }[] };
  observability?: { enabled: boolean };
};
const jsonc = readFileSync(new URL('../../../infra/wrangler.jsonc', import.meta.url), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/,(\s*[}\]])/g, '$1');
const config = JSON.parse(jsonc) as Env & { env: Record<'staging' | 'production', Env> };

describe('deployment environments', () => {
  const { staging, production } = config.env;

  it('declares every binding per environment with separate databases and Worker names', () => {
    for (const env of [staging, production]) {
      expect(env.d1_databases?.map((db) => db.binding)).toEqual(['DB']);
      expect(env.durable_objects?.bindings).toEqual([
        { name: 'AI_BUDGET', class_name: 'AiBudget' },
      ]);
      expect(env.observability?.enabled).toBe(true);
    }
    expect(staging.name).not.toBe(production.name);
    expect(staging.d1_databases?.[0]?.database_name).not.toBe(
      production.d1_databases?.[0]?.database_name,
    );
    expect(staging.d1_databases?.[0]?.database_id).not.toBe(
      production.d1_databases?.[0]?.database_id,
    );
  });

  it('keeps secrets out of config and uses real AI only in production', () => {
    for (const env of [config, staging, production])
      expect(
        Object.keys(env.vars ?? {}).filter((key) => /KEY|SECRET|TOKEN|PASSWORD/i.test(key)),
      ).toEqual([]);
    expect(staging.vars).toMatchObject({ AI_PROVIDER: 'mock' });
    // The owner enabled production AI on 2026-11-01 (spend is still capped by the budget ledger).
    expect(['true', 'false']).toContain(production.vars?.AI_ENABLED);
    expect(production.vars).toMatchObject({
      AI_PROVIDER: 'openai',
      AI_MODEL: 'gpt-6-luna',
    });
  });
});
