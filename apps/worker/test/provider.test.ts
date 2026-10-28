import { describe, expect, it } from 'vitest';
import {
  costMicros,
  inputTokenBound,
  MAX_OUTPUT_TOKENS,
  mockProvider,
  openAiProvider,
  providerFromEnv,
  type StructuredRequest,
} from '../src/ai/provider';

const request: StructuredRequest = {
  instructions: 'Akış üret.',
  input: 'Satın alma onayı',
  schemaName: 'workflow',
  schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
};
function provider(
  reply: Response | Error,
  seen: { url?: string; init?: RequestInit | undefined } = {},
) {
  return openAiProvider({
    apiKey: 'sk-test-placeholder',
    model: 'gpt-6-luna',
    fetcher: (async (url: RequestInfo | URL, init?: RequestInit) => {
      seen.url = String(url);
      seen.init = init;
      if (reply instanceof Error) throw reply;
      return reply;
    }) as typeof fetch,
  });
}
const completed = (text: string, usage: unknown = { input_tokens: 1200, output_tokens: 800 }) =>
  new Response(
    JSON.stringify({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text }] }],
      usage,
    }),
  );

describe('OpenAI provider', () => {
  it('sends a strict structured-output request without storage and bills real usage', async () => {
    const seen: { url?: string; init?: RequestInit | undefined } = {};
    const result = await provider(completed('{"title":"Akış"}'), seen).generate(request);
    expect(result).toEqual({
      kind: 'ok',
      value: { title: 'Akış' },
      settlement: { kind: 'billed', actualMicros: 520 },
    });
    expect(seen.url).toBe('https://api.openai.com/v1/responses');
    expect(new Headers(seen.init?.headers).get('authorization')).toBe('Bearer sk-test-placeholder');
    expect(JSON.parse(String(seen.init?.body))).toEqual({
      model: 'gpt-6-luna',
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
      text: {
        format: { type: 'json_schema', name: 'workflow', schema: request.schema, strict: true },
      },
    });
  });

  it.each([
    ['network failure', new Error('reset'), 'AI_PROVIDER_UNAVAILABLE', { kind: 'unknown' }],
    [
      'rate limit',
      new Response('{}', { status: 429 }),
      'AI_PROVIDER_UNAVAILABLE',
      { kind: 'not_billed' },
    ],
    [
      'bad request',
      new Response('{}', { status: 400 }),
      'AI_PROVIDER_UNAVAILABLE',
      { kind: 'not_billed' },
    ],
    [
      'server error',
      new Response('{}', { status: 503 }),
      'AI_PROVIDER_UNAVAILABLE',
      { kind: 'unknown' },
    ],
    ['non-JSON body', new Response('<html>'), 'AI_PROVIDER_INVALID_RESPONSE', { kind: 'unknown' }],
    ['missing usage', completed('{}', null), 'ok', { kind: 'unknown' }],
    [
      'incomplete output',
      new Response(
        JSON.stringify({
          status: 'incomplete',
          output: [],
          usage: { input_tokens: 10, output_tokens: 8000 },
        }),
      ),
      'AI_PROVIDER_INVALID_RESPONSE',
      { kind: 'billed', actualMicros: 4001 },
    ],
    [
      'invalid JSON text',
      completed('{oops'),
      'AI_PROVIDER_INVALID_RESPONSE',
      { kind: 'billed', actualMicros: 520 },
    ],
    [
      'refusal',
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }],
          usage: { input_tokens: 5, output_tokens: 5 },
        }),
      ),
      'AI_REFUSED',
      { kind: 'billed', actualMicros: 3 },
    ],
  ] as const)('maps %s to the right settlement', async (_, reply, code, settlement) => {
    const result = await provider(reply as Response | Error).generate(request);
    expect(result.kind === 'ok' ? 'ok' : result.code).toBe(code);
    expect(result.settlement).toEqual(settlement);
  });

  it('bounds the reservation by UTF-8 bytes and maximum output', () => {
    const bound = inputTokenBound(request);
    expect(bound).toBeGreaterThanOrEqual(
      new TextEncoder().encode(request.instructions + request.input).length,
    );
    expect(provider(new Error('x')).maxCostMicros(request)).toBe(
      costMicros('gpt-6-luna', bound, MAX_OUTPUT_TOKENS),
    );
    expect(costMicros('gpt-6-luna', 1_000_000, 1_000_000)).toBe(600_000);
    expect(costMicros('gpt-6-luna', 1, 0)).toBe(1);
  });

  it('refuses unpriced models instead of falling back', () => {
    expect(() => openAiProvider({ apiKey: 'k', model: 'gpt-6-astra' })).toThrow('Unpriced model');
    expect(() => costMicros('unknown', 1, 1)).toThrow();
  });

  it('offers a free deterministic mock', async () => {
    const mock = mockProvider((input) => ({ echo: input.input }));
    expect(mock.maxCostMicros(request)).toBe(1);
    expect(await mock.generate(request)).toEqual({
      kind: 'ok',
      value: { echo: request.input },
      settlement: { kind: 'billed', actualMicros: 0 },
    });
  });
});

describe('provider selection', () => {
  const respond = () => ({});
  it('uses the mock, a priced OpenAI model or nothing', async () => {
    expect(
      await providerFromEnv({ AI_PROVIDER: 'mock' }, respond)?.generate(request),
    ).toMatchObject({ kind: 'ok' });
    expect(providerFromEnv({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'k' }, respond)).not.toBeNull();
    expect(
      providerFromEnv(
        { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'k', AI_MODEL: 'gpt-6-astra' },
        respond,
      ),
    ).toBeNull();
    expect(providerFromEnv({ AI_PROVIDER: 'openai' }, respond)).toBeNull();
    expect(providerFromEnv({}, respond)).toBeNull();
    expect(providerFromEnv(undefined, respond)).toBeNull();
  });
});
