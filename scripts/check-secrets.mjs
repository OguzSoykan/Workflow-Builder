import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';

const scanner = process.env.GITLEAKS_BIN || 'gitleaks';
const root = process.cwd();
const temporary = mkdtempSync(join(tmpdir(), 'workflow-secrets-'));
if (
  dirname(temporary) !== resolve(tmpdir()) ||
  !basename(temporary).startsWith('workflow-secrets-')
) {
  throw new Error('Refusing unsafe temporary path.');
}
function scan(args, expected = 0) {
  const result = spawnSync(scanner, [...args, '--redact', '--no-banner'], { stdio: 'inherit' });
  if (result.error)
    throw new Error('Gitleaks 8.30.1 is required; set GITLEAKS_BIN or install it on PATH.');
  if (result.status !== expected)
    throw new Error(`Secret scan exited ${result.status}, expected ${expected}`);
}
try {
  const version = spawnSync(scanner, ['version'], { encoding: 'utf8' });
  if (version.error || version.status !== 0 || version.stdout.trim() !== '8.30.1') {
    throw new Error('Use the checksum-verified Gitleaks 8.30.1 release.');
  }
  if (process.argv.includes('--self-test')) {
    // A synthetic, unusable token exists only in the temporary directory.
    writeFileSync(
      join(temporary, 'fixture.env'),
      'GITHUB_TOKEN=' + 'gh' + 'p_' + randomBytes(18).toString('hex'),
    );
    scan(['dir', temporary], 1);
    console.log('PASS: synthetic credential rejected.');
  } else {
    scan(['git', root, '--log-opts=--all']);
    const listed = spawnSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { encoding: 'utf8' },
    );
    if (listed.status !== 0) throw new Error('Cannot enumerate repository files.');
    for (const file of new Set(listed.stdout.split('\0').filter(Boolean))) {
      const target = resolve(temporary, file);
      if (!target.startsWith(temporary + sep)) throw new Error('Unsafe snapshot path.');
      if (!existsSync(file)) continue; // tracked deletions
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(file, target);
    }
    for (const build of ['apps/web/dist', 'apps/worker/dist']) {
      if (!existsSync(build)) throw new Error(`Build first: ${build} missing.`);
      cpSync(build, join(temporary, build), { recursive: true });
    }
    scan(['dir', temporary]);
    console.log('PASS: Git history, source snapshot and built assets scanned.');
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
