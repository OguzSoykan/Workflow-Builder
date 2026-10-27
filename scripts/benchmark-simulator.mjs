import { cpus, platform, arch } from 'node:os';
import { performance } from 'node:perf_hooks';
import { decideApproval, startSimulation } from '@workflow-builder/workflow-core';
import { linearWorkflow } from '../tests/fixtures/purchase.ts';

// One full run of the 50-node chain: start plus 48 manual approvals, each re-validating input.
const workflow = linearWorkflow(50);
function fullRun() {
  let result = startSimulation(workflow, { amount: 1 }, 'benchmark');
  while (result.ok && result.run.status === 'waiting_for_approval')
    result = decideApproval(workflow, result.run, 'approved');
  if (!result.ok || result.run.status !== 'completed') throw new Error('Benchmark run failed');
}
for (let index = 0; index < 10; index++) fullRun();
const samples = [];
for (let index = 0; index < 100; index++) {
  const start = performance.now();
  fullRun();
  samples.push(performance.now() - start);
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
      approvals: 48,
      samples: samples.length,
      medianMs: samples[50],
      p95Ms: samples[95],
      maxMs: samples[99],
      scope:
        'Local full simulation (start + 48 decisions) incl. parsing and hashing; browser main thread not measured.',
    },
    null,
    2,
  ),
);
