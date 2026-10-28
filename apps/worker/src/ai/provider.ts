import type { Settlement } from './budget-ledger';

// OpenAI Responses API with Structured Outputs (ADR-022). No retries and no model fallback.

/** Prices in micro-USD per token, from https://developers.openai.com/api/docs/pricing (checked 2026-10-28). */
export const MODEL_PRICES: Readonly<Record<string, { input: number; output: number }>> =
  Object.freeze({
    'gpt-6-luna': { input: 0.1, output: 0.5 },
  });
export const MAX_OUTPUT_TOKENS = 8_000;
const TIMEOUT_MS = 60_000;
const encoder = new TextEncoder();

export interface StructuredRequest {
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
}
export type ProviderResult =
  | { kind: 'ok'; value: unknown; settlement: Settlement }
  | {
      kind: 'failed';
      code: 'AI_PROVIDER_UNAVAILABLE' | 'AI_PROVIDER_INVALID_RESPONSE' | 'AI_REFUSED';
      settlement: Settlement;
    };
export interface AiProvider {
  /** Worst-case cost of this request in micro-USD, reserved before calling. */
  maxCostMicros(request: StructuredRequest): number;
  generate(request: StructuredRequest): Promise<ProviderResult>;
}

/** Billable tokens can never exceed UTF-8 bytes (each BPE token covers at least one byte). */
export function inputTokenBound(request: StructuredRequest): number {
  return (
    encoder.encode(request.instructions + request.input + JSON.stringify(request.schema)).length +
    64
  );
}

export function costMicros(model: string, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICES[model];
  if (!price) throw new Error('Unpriced model');
  return Math.ceil(inputTokens * price.input + outputTokens * price.output);
}

type ResponseBody = {
  status?: string;
  output?: { type?: string; content?: { type?: string; text?: string; refusal?: string }[] }[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

export function openAiProvider(options: {
  apiKey: string;
  model: string;
  fetcher?: typeof fetch;
}): AiProvider {
  const { apiKey, model } = options;
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  if (!MODEL_PRICES[model]) throw new Error('Unpriced model');
  return {
    maxCostMicros: (request) => costMicros(model, inputTokenBound(request), MAX_OUTPUT_TOKENS),
    async generate(request) {
      let response: Response;
      try {
        response = await fetcher('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            instructions: request.instructions,
            input: request.input,
            max_output_tokens: MAX_OUTPUT_TOKENS,
            store: false,
            text: {
              format: {
                type: 'json_schema',
                name: request.schemaName,
                schema: request.schema,
                strict: true,
              },
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        // Timeout or network failure after sending: the cost is unknown, so it is charged (D-07).
        return { kind: 'failed', code: 'AI_PROVIDER_UNAVAILABLE', settlement: { kind: 'unknown' } };
      }
      if (!response.ok) {
        // 4xx (auth, validation, rate limit) are refused before generation; 5xx may have run.
        const settlement: Settlement =
          response.status < 500 ? { kind: 'not_billed' } : { kind: 'unknown' };
        return { kind: 'failed', code: 'AI_PROVIDER_UNAVAILABLE', settlement };
      }
      let body: ResponseBody;
      try {
        body = (await response.json()) as ResponseBody;
      } catch {
        return {
          kind: 'failed',
          code: 'AI_PROVIDER_INVALID_RESPONSE',
          settlement: { kind: 'unknown' },
        };
      }
      const input = body.usage?.input_tokens;
      const output = body.usage?.output_tokens;
      const settlement: Settlement =
        Number.isSafeInteger(input) &&
        Number.isSafeInteger(output) &&
        (input as number) >= 0 &&
        (output as number) >= 0
          ? { kind: 'billed', actualMicros: costMicros(model, input as number, output as number) }
          : { kind: 'unknown' };
      const content =
        body.output?.flatMap((item) => (item.type === 'message' ? (item.content ?? []) : [])) ?? [];
      if (content.some((part) => part.type === 'refusal'))
        return { kind: 'failed', code: 'AI_REFUSED', settlement };
      const text = content.find((part) => part.type === 'output_text')?.text;
      if (body.status !== 'completed' || typeof text !== 'string')
        return { kind: 'failed', code: 'AI_PROVIDER_INVALID_RESPONSE', settlement };
      try {
        return { kind: 'ok', value: JSON.parse(text) as unknown, settlement };
      } catch {
        return { kind: 'failed', code: 'AI_PROVIDER_INVALID_RESPONSE', settlement };
      }
    },
  };
}

/** Deterministic local provider: no network, no cost; used when AI_PROVIDER=mock. */
export function mockProvider(respond: (request: StructuredRequest) => unknown): AiProvider {
  return {
    maxCostMicros: () => 1,
    async generate(request) {
      return {
        kind: 'ok',
        value: respond(request),
        settlement: { kind: 'billed', actualMicros: 0 },
      };
    },
  };
}

/** Picks the provider from Worker env; a missing key or an unpriced model leaves AI off. */
export function providerFromEnv(
  env: { AI_PROVIDER?: string; OPENAI_API_KEY?: string; AI_MODEL?: string } | undefined,
  mockRespond: (request: StructuredRequest) => unknown,
): AiProvider | null {
  if (env?.AI_PROVIDER === 'mock') return mockProvider(mockRespond);
  if (env?.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) return null;
  const model = env.AI_MODEL ?? 'gpt-6-luna';
  return MODEL_PRICES[model] ? openAiProvider({ apiKey: env.OPENAI_API_KEY, model }) : null;
}
