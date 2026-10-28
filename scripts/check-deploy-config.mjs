// Refuses a deploy while an environment still uses placeholder resource IDs (WB-023).
import { readFileSync } from 'node:fs';

export function deployProblems(jsonc, environment) {
  const config = JSON.parse(jsonc.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));
  const env = config.env?.[environment];
  if (!env) return [`Unknown environment "${environment}".`];
  const problems = [];
  for (const db of env.d1_databases ?? [])
    if (/^0{8}-0{4}-0{4}-0{4}-/.test(db.database_id))
      problems.push(
        `${environment}: D1 "${db.database_name}" still has a placeholder database_id.`,
      );
  if (!env.d1_databases?.length) problems.push(`${environment}: no D1 binding.`);
  if (!env.durable_objects?.bindings?.length)
    problems.push(`${environment}: no AI_BUDGET Durable Object binding.`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const environment = process.argv[2] ?? '';
  const problems = deployProblems(
    readFileSync(new URL('../infra/wrangler.jsonc', import.meta.url), 'utf8'),
    environment,
  );
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`${environment}: deploy configuration has real resource IDs.`);
}
