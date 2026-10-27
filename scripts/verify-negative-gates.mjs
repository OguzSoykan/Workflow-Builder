import { spawnSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const probes = [
  {
    file: 'packages/workflow-core/src/negative-gate-probe.ts',
    content: 'export const phaseOneProbe: number = "intentional type error";\n',
    args: ['run', 'typecheck'],
    marker: /TS2322/,
  },
  {
    file: 'scripts/negative-gate-probe.test.ts',
    content:
      'import { expect, it } from "vitest";\nit("intentional gate probe", () => expect(1).toBe(2));\n',
    args: ['exec', '--', 'vitest', 'run', 'scripts/negative-gate-probe.test.ts'],
    marker: /AssertionError/,
  },
];

for (const probe of probes) {
  writeFileSync(probe.file, probe.content, { flag: 'wx' });
  try {
    const result = spawnSync(npm, probe.args, {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (
      result.error ||
      result.status === null ||
      result.status === 0 ||
      !probe.marker.test(result.stdout + result.stderr)
    ) {
      throw new Error(`Negative gate was not proven: ${probe.file}`);
    }
    console.log(`PASS: ${probe.file} was rejected by the expected gate.`);
  } finally {
    unlinkSync(probe.file);
  }
}
