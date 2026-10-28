// WB-021 / D-13 quality evaluation: 20 synthetic prompts, one call each, hard spend cap.
// Usage: npm run ai:eval -- --mock            (free, no network)
//        npm run ai:eval -- --max-usd 0.50    (live; key from git-ignored infra/.dev.vars)
// The API key is read from the file only and is never printed or written to the report.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { EVAL_CASES, scoreCase } from './cases.ts';
import {
  CREATE_INSTRUCTIONS,
  DRAFT_SCHEMA,
  mockDraft,
  workflowFromDraft,
} from '../src/ai/draft.ts';
import { mockProvider, openAiProvider } from '../src/ai/provider.ts';

const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};
const mock = process.argv.includes('--mock');
const capMicros = Math.round(Number(argument('--max-usd') ?? '0.50') * 1_000_000);
const outDir = argument('--out') ?? new URL('../../../docs/evals', import.meta.url).pathname;

function devVars() {
  const path = new URL('../../../infra/.dev.vars', import.meta.url);
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => [
        line.slice(0, line.indexOf('=')).trim(),
        line.slice(line.indexOf('=') + 1).trim(),
      ]),
  );
}

const vars = devVars();
const model = vars.AI_MODEL || 'gpt-6-luna';
let provider;
if (mock) provider = mockProvider((request) => mockDraft(request.input));
else {
  if (!vars.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is missing in infra/.dev.vars; nothing was called.');
    process.exit(1);
  }
  provider = openAiProvider({ apiKey: vars.OPENAI_API_KEY, model });
}

const requests = EVAL_CASES.map((testCase) => ({
  testCase,
  request: {
    instructions: `${CREATE_INSTRUCTIONS}\nLanguage for labels: Turkish.`,
    input: testCase.prompt,
    schemaName: 'workflow_draft',
    schema: DRAFT_SCHEMA,
  },
}));
const worstMicros = requests.reduce((sum, item) => sum + provider.maxCostMicros(item.request), 0);
if (!mock && worstMicros > capMicros) {
  console.error(
    `Worst case ${worstMicros} µUSD exceeds the cap ${capMicros} µUSD; nothing was called.`,
  );
  process.exit(1);
}

let spentMicros = 0;
const results = [];
for (const { testCase, request } of requests) {
  const result = await provider.generate(request);
  const settlement = result.settlement;
  // Unknown cost counts at the full bound (fail-closed, D-07).
  const cost =
    settlement.kind === 'billed'
      ? settlement.actualMicros
      : settlement.kind === 'unknown'
        ? provider.maxCostMicros(request)
        : 0;
  spentMicros += cost;
  const draft =
    result.kind === 'ok'
      ? workflowFromDraft(result.value, `eval_${testCase.id}`, 'tr')
      : { ok: false };
  const score = scoreCase(testCase, draft.ok ? draft.workflow : null);
  results.push({
    ...score,
    costMicros: cost,
    providerResult: result.kind === 'ok' ? 'ok' : result.code,
  });
  process.stdout.write(
    `${score.passed ? 'PASS' : 'FAIL'} ${testCase.id}${score.reasons.length ? ` (${score.reasons.join(', ')})` : ''}\n`,
  );
}

const passed = results.filter((item) => item.passed).length;
const report = {
  date: new Date().toISOString(),
  mode: mock ? 'mock' : 'live',
  model: mock ? 'mock' : model,
  target: 0.85,
  passRate: passed / results.length,
  passed,
  total: results.length,
  validProposals: results.filter((item) => item.valid).length,
  spentMicros,
  worstCaseMicros: worstMicros,
  capMicros,
  results,
};
mkdirSync(outDir, { recursive: true });
const file = `${outDir}/ai-eval-${report.mode}-${report.date.slice(0, 10)}.json`;
writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `\n${passed}/${results.length} passed (${(report.passRate * 100).toFixed(1)}%, target 85%). Spent ${(spentMicros / 1e6).toFixed(4)} USD of cap ${(capMicros / 1e6).toFixed(2)} USD. Report: ${file}`,
);
