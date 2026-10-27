import { cpus, platform, arch } from 'node:os';
import { performance } from 'node:perf_hooks';
import { validateWorkflow } from '@workflow-builder/workflow-core';
import { linearWorkflow } from '../tests/fixtures/purchase.ts';

const workflow = linearWorkflow(50);
for (let index = 0; index < 100; index++) validateWorkflow(workflow);
const samples = [];
for (let index = 0; index < 1000; index++) {
  const start = performance.now();
  const result = validateWorkflow(workflow);
  samples.push(performance.now() - start);
  if (!result.valid) throw new Error('Benchmark fixture is invalid');
}
samples.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
      nodes: workflow.nodes.length,
      edges: workflow.edges.length,
      samples: samples.length,
      medianMs: samples[500],
      p95Ms: samples[950],
      maxMs: samples[999],
      scope: 'Local validator including schema parsing; not simulator or Cloudflare CPU evidence.',
    },
    null,
    2,
  ),
);
