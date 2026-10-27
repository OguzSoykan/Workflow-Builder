import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['openai-key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['google-api-key', /\bAIza[A-Za-z0-9_-]{35}\b/],
  [
    'credential-assignment',
    /(?:OPENAI_API_KEY|CLOUDFLARE_API_TOKEN|FIREBASE_PRIVATE_KEY)\s*[:=]\s*["']?(?!<|PLACEHOLDER|REPLACE_ME|\$)[A-Za-z0-9_/-]{20,}/i,
  ],
];

export function detectSecrets(text) {
  return rules.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function artifactFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symlink in build artifact');
    return entry.isDirectory() ? artifactFiles(path) : [path];
  });
}

export function scanRepository(root) {
  const tracked = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  )
    .split('\0')
    .filter(Boolean)
    .map((path) => resolve(root, path));
  const artifacts = ['apps/web/dist', 'apps/worker/dist'].flatMap((path) =>
    artifactFiles(resolve(root, path)),
  );
  const files = [...new Set([...tracked, ...artifacts])].sort();
  const findings = [];
  for (const path of files) {
    if (!lstatSync(path).isFile()) throw new Error('Unexpected source file type');
    for (const rule of detectSecrets(readFileSync(path, 'utf8'))) {
      findings.push({ file: relative(root, path), rule });
    }
  }
  return { files: files.length, findings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = scanRepository(process.cwd());
    for (const finding of result.findings) console.error(`${finding.file}: ${finding.rule}`);
    console.log(
      `Scanned ${result.files} source/build files; ${result.findings.length} finding(s).`,
    );
    if (result.findings.length) process.exitCode = 1;
  } catch {
    console.error('Secret scan could not complete. Build both apps first and check file access.');
    process.exitCode = 1;
  }
}
