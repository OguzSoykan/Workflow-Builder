// Test-only RS256 signer: keys are generated per run and never leave the test process.
export const PROJECT = 'demo-workflow-builder';
export const NOW = 1_800_000_000;

const encode = (value: unknown) =>
  btoa(typeof value === 'string' ? value : JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export async function keyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
}

export async function signToken(
  privateKey: CryptoKey,
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
) {
  const head = encode({ alg: 'RS256', kid: 'test-key', typ: 'JWT', ...header });
  const body = encode({
    aud: PROJECT,
    iss: `https://securetoken.google.com/${PROJECT}`,
    sub: 'user-a',
    iat: NOW - 60,
    auth_time: NOW - 120,
    exp: NOW + 3000,
    email_verified: true,
    ...claims,
  });
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(`${head}.${body}`),
    ),
  );
  return `${head}.${body}.${encode(String.fromCharCode(...signature))}`;
}
