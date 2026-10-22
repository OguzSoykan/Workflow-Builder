import { describe, expect, it } from 'vitest';
import { isCalendarDate, parseWorkflow } from '../src';
import { example } from './fixture';
describe('schema v1', () => {
  it('accepts every node/input type and JSON without mutating caller', () => {
    const graph = example();
    const before = JSON.stringify(graph);
    expect(parseWorkflow(graph)).toEqual({ success: true, data: graph });
    expect(parseWorkflow(before)).toEqual({ success: true, data: graph });
    expect(JSON.stringify(graph)).toBe(before);
  });
  it.each([
    [
      'version',
      (g: Record<string, unknown>) => {
        g.schemaVersion = 2;
      },
    ],
    [
      'unknown key',
      (g: Record<string, unknown>) => {
        g.script = 'alert(1)';
      },
    ],
    [
      'duplicate node',
      (g: Record<string, unknown>) => {
        (g.nodes as unknown[]).push((g.nodes as unknown[])[0]);
      },
    ],
    [
      'duplicate edge',
      (g: Record<string, unknown>) => {
        (g.edges as unknown[]).push((g.edges as unknown[])[0]);
      },
    ],
    [
      'duplicate field',
      (g: Record<string, unknown>) => {
        (g.inputs as unknown[]).push((g.inputs as unknown[])[0]);
      },
    ],
    [
      'bad node type',
      (g: Record<string, unknown>) => {
        (g.nodes as Record<string, unknown>[])[0]!.type = 'script';
      },
    ],
    [
      'bad handle',
      (g: Record<string, unknown>) => {
        (g.edges as Record<string, unknown>[])[0]!.sourceHandle = 'run';
      },
    ],
    [
      'missing target',
      (g: Record<string, unknown>) => {
        delete (g.edges as Record<string, unknown>[])[0]!.targetNodeId;
      },
    ],
    [
      'wrong default type',
      (g: Record<string, unknown>) => {
        (g.inputs as Record<string, unknown>[])[0]!.defaultValue = '50';
      },
    ],
    [
      'bad enum options',
      (g: Record<string, unknown>) => {
        (g.inputs as Record<string, unknown>[])[4]!.options = ['IT', 'IT'];
      },
    ],
    [
      'extra config',
      (g: Record<string, unknown>) => {
        (g.nodes as Record<string, unknown>[])[0]!.config = { script: 'x' };
      },
    ],
  ])('rejects %s', (_, change) => {
    const graph = example();
    change(graph);
    expect(parseWorkflow(graph).success).toBe(false);
  });
  it.each([
    '0000-01-01',
    '1900-02-29',
    '2023-02-29',
    '2024-04-31',
    '2024-13-01',
    '2024-00-01',
    '2024-01-00',
    '24-01-01',
  ])('rejects date %s', (v) => expect(isCalendarDate(v)).toBe(false));
  it.each(['2000-02-29', '2024-02-29', '0001-01-01', '9999-12-31'])('accepts date %s', (v) =>
    expect(isCalendarDate(v)).toBe(true),
  );
});
