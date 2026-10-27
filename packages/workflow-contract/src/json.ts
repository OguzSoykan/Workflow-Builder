export const WORKFLOW_LIMITS = Object.freeze({
  nodes: 50,
  edges: 100,
  inputs: 30,
  bytes: 256 * 1024,
  depth: 12,
  values: 20_000,
  text: 1000,
  options: 100,
});

const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
export function isSafeKey(value: string): boolean {
  return !unsafeKeys.has(value);
}

export function utf8ByteLength(text: string, stopAfter = Infinity): number {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes > stopAfter) break;
  }
  return bytes;
}

// Check before Zod/stringification: never invoke accessors or toJSON methods.
// Only JSON trees are supported; live JS proxies are not a security boundary.
export function inspectJson(input: unknown): 'INVALID_JSON' | 'GRAPH_LIMIT_EXCEEDED' | undefined {
  const active = new Set<object>();
  const stack: { value: unknown; depth: number; exit?: boolean }[] = [{ value: input, depth: 0 }];
  let count = 0;
  let textLength = 0;
  try {
    while (stack.length) {
      const item = stack.pop();
      if (!item) break;
      const { value, depth } = item;
      if (item.exit && value && typeof value === 'object') {
        active.delete(value);
        continue;
      }
      if (++count > WORKFLOW_LIMITS.values || depth > WORKFLOW_LIMITS.depth)
        return 'GRAPH_LIMIT_EXCEEDED';
      if (value === null || typeof value === 'boolean') continue;
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) return 'INVALID_JSON';
        continue;
      }
      if (typeof value === 'string') {
        textLength += value.length;
        if (textLength > WORKFLOW_LIMITS.bytes) return 'GRAPH_LIMIT_EXCEEDED';
        continue;
      }
      if (typeof value !== 'object' || active.has(value)) return 'INVALID_JSON';
      const array = Array.isArray(value);
      if (
        !array &&
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      )
        return 'INVALID_JSON';
      if (Object.getOwnPropertySymbols(value).length) return 'INVALID_JSON';
      if (array && value.length > WORKFLOW_LIMITS.values) return 'GRAPH_LIMIT_EXCEEDED';
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Object.keys(descriptors).filter((key) => !(array && key === 'length'));
      if (keys.length > WORKFLOW_LIMITS.values) return 'GRAPH_LIMIT_EXCEEDED';
      if (array && keys.length !== value.length) return 'INVALID_JSON';
      active.add(value);
      stack.push({ value, depth, exit: true });
      for (const key of keys) {
        const descriptor = descriptors[key];
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !isSafeKey(key))
          return 'INVALID_JSON';
        if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))
          return 'INVALID_JSON';
        textLength += key.length;
        if (textLength > WORKFLOW_LIMITS.bytes) return 'GRAPH_LIMIT_EXCEEDED';
        stack.push({ value: descriptor.value, depth: depth + 1 });
      }
    }
    const text = JSON.stringify(input);
    if (typeof text !== 'string') return 'INVALID_JSON';
    if (utf8ByteLength(text, WORKFLOW_LIMITS.bytes) > WORKFLOW_LIMITS.bytes)
      return 'GRAPH_LIMIT_EXCEEDED';
    return undefined;
  } catch {
    return 'INVALID_JSON';
  }
}
