import { describe, expect, it, vi } from 'vitest';
import {
  OPERATORS,
  type InputField,
  type IssueCode,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import { validateWorkflow, validateWorkflowJSON } from '@workflow-builder/workflow-core';
import { linearWorkflow, purchaseWorkflow } from '../../../tests/fixtures/purchase';

function issueCodes(workflow: unknown): IssueCode[] {
  const result = validateWorkflow(workflow);
  expect(result.valid).toBe(false);
  expect(result.issues.length).toBeGreaterThan(0);
  expect(result.issues.every((issue) => issue.severity === 'error')).toBe(true);
  return result.issues.map((issue) => issue.code);
}
function changeEdge(workflow: Workflow, id: string, targetNodeId: string) {
  const edge = workflow.edges.find((candidate) => candidate.id === id);
  if (!edge) throw new Error('Missing fixture edge');
  edge.targetNodeId = targetNodeId;
}

describe('graph topology', () => {
  it('accepts purchase, minimal and maximum-size graphs', () => {
    for (const graph of [purchaseWorkflow(), linearWorkflow(2), linearWorkflow(50)]) {
      expect(validateWorkflow(graph)).toEqual({ valid: true, issues: [] });
      expect(validateWorkflowJSON(JSON.stringify(graph))).toEqual({ valid: true, issues: [] });
    }
  });

  const invalid: [string, (workflow: Workflow) => void, IssueCode][] = [
    [
      'zero start',
      (w) => {
        w.nodes = w.nodes.filter((node) => node.type !== 'start');
      },
      'START_COUNT_INVALID',
    ],
    [
      'two starts',
      (w) => {
        w.nodes.push({
          id: 'second-start',
          type: 'start',
          label: 'Start',
          position: { x: 0, y: 0 },
          config: {},
        });
      },
      'START_COUNT_INVALID',
    ],
    [
      'no end',
      (w) => {
        w.nodes = w.nodes.filter((node) => node.type !== 'end');
      },
      'END_MISSING',
    ],
    ['dangling target', (w) => changeEdge(w, 'e-start', 'absent'), 'EDGE_DANGLING'],
    [
      'dangling source',
      (w) => {
        if (w.edges[0]) w.edges[0].sourceNodeId = 'absent';
      },
      'EDGE_DANGLING',
    ],
    ['start input', (w) => changeEdge(w, 'e-approved', 'start'), 'START_INCOMING'],
    [
      'end output',
      (w) => {
        w.edges.push({
          id: 'end-output',
          sourceNodeId: 'completed',
          sourceHandle: 'next',
          targetNodeId: 'rejected',
        });
      },
      'END_OUTGOING',
    ],
    [
      'missing output',
      (w) => {
        w.edges = w.edges.filter((edge) => edge.id !== 'e-rejected');
      },
      'HANDLE_MISSING',
    ],
    [
      'wrong output',
      (w) => {
        if (w.edges[0]) w.edges[0].sourceHandle = 'approved';
      },
      'HANDLE_INVALID',
    ],
    [
      'duplicate output',
      (w) => {
        w.edges.push({
          id: 'duplicate',
          sourceNodeId: 'start',
          sourceHandle: 'next',
          targetNodeId: 'completed',
        });
      },
      'DUPLICATE_HANDLE',
    ],
    ['self-loop', (w) => changeEdge(w, 'e-large', 'threshold'), 'CYCLE_DETECTED'],
    ['cycle', (w) => changeEdge(w, 'e-approved', 'threshold'), 'CYCLE_DETECTED'],
    [
      'disconnected',
      (w) => {
        w.nodes.push({
          id: 'unconnected',
          type: 'end',
          label: 'End',
          position: { x: 0, y: 0 },
          config: { outcome: 'completed' },
        });
      },
      'UNREACHABLE_NODE',
    ],
    [
      'unterminated branch',
      (w) => {
        w.edges = w.edges.filter((edge) => edge.id !== 'e-small');
      },
      'PATH_NOT_TERMINATING',
    ],
  ];
  it.each(invalid)('rejects %s', (_name, modify, expected) => {
    const workflow = purchaseWorkflow();
    modify(workflow);
    expect(issueCodes(workflow)).toContain(expected);
  });

  it('attributes missing branches and dangling edges to stable IDs', () => {
    const graph = purchaseWorkflow();
    graph.edges = graph.edges.filter((edge) => edge.id !== 'e-rejected');
    expect(validateWorkflow(graph).issues).toContainEqual({
      code: 'HANDLE_MISSING',
      severity: 'error',
      nodeId: 'manager',
      translationParams: { handle: 'rejected' },
    });
    changeEdge(graph, 'e-start', 'absent');
    expect(validateWorkflow(graph).issues).toContainEqual({
      code: 'EDGE_DANGLING',
      severity: 'error',
      edgeId: 'e-start',
    });
  });

  it('marks only actual cycle members, including disconnected cycles', () => {
    const graph = purchaseWorkflow();
    changeEdge(graph, 'e-approved', 'threshold');
    const cycle = validateWorkflow(graph)
      .issues.filter((issue) => issue.code === 'CYCLE_DETECTED')
      .map((issue) => issue.nodeId);
    expect(cycle).toEqual(['manager', 'threshold']);
    const disconnected = purchaseWorkflow();
    disconnected.nodes.push({
      id: 'isolated-cycle',
      type: 'approval',
      label: 'Cycle',
      position: { x: 0, y: 0 },
      config: { roleLabel: 'Reviewer' },
    });
    for (const handle of ['approved', 'rejected'] as const)
      disconnected.edges.push({
        id: `isolated-${handle}`,
        sourceNodeId: 'isolated-cycle',
        sourceHandle: handle,
        targetNodeId: 'isolated-cycle',
      });
    expect(validateWorkflow(disconnected).issues).toContainEqual({
      code: 'CYCLE_DETECTED',
      severity: 'error',
      nodeId: 'isolated-cycle',
    });
  });

  it('requires all branches to terminate even if another branch reaches an end', () => {
    const graph = purchaseWorkflow();
    changeEdge(graph, 'e-rejected', 'manager');
    const nodes = validateWorkflow(graph)
      .issues.filter((issue) => issue.code === 'PATH_NOT_TERMINATING')
      .map((issue) => issue.nodeId);
    expect(nodes).toEqual(['manager', 'start', 'threshold']);
  });

  it('accepts a rejection path through another distinct approval without imposing an outcome', () => {
    const graph = purchaseWorkflow();
    graph.nodes.push({
      id: 'appeal',
      type: 'approval',
      label: 'Appeal',
      position: { x: 0, y: 0 },
      config: { roleLabel: 'Reviewer' },
    });
    changeEdge(graph, 'e-rejected', 'appeal');
    for (const handle of ['approved', 'rejected'] as const)
      graph.edges.push({
        id: `appeal-${handle}`,
        sourceNodeId: 'appeal',
        sourceHandle: handle,
        targetNodeId: handle === 'approved' ? 'completed' : 'rejected',
      });
    expect(validateWorkflow(graph)).toEqual({ valid: true, issues: [] });
  });
});

const fields: InputField[] = [
  { key: 'amount', label: 'Number', type: 'number', required: true },
  { key: 'amount', label: 'String', type: 'string', required: false },
  { key: 'amount', label: 'Boolean', type: 'boolean', required: false },
  { key: 'amount', label: 'Date', type: 'date', required: true },
  { key: 'amount', label: 'Enum', type: 'enum', required: true, options: ['Finance', 'HR'] },
];
function conditionGraph(field: InputField, operator: string, value: unknown): unknown {
  const graph = purchaseWorkflow();
  return {
    ...graph,
    inputs: [field],
    nodes: graph.nodes.map((node) =>
      node.type === 'condition'
        ? { ...node, config: { fieldKey: field.key, operator, value } }
        : node,
    ),
  };
}

describe('condition type semantics', () => {
  const allowed = fields.flatMap((field) =>
    OPERATORS[field.type].map((operator) => ({
      field,
      operator,
      value:
        field.type === 'number'
          ? 10000
          : field.type === 'string'
            ? 'Türkçe'
            : field.type === 'boolean'
              ? false
              : field.type === 'date'
                ? '2024-02-29'
                : operator === 'in'
                  ? ['Finance', 'HR']
                  : 'Finance',
    })),
  );
  it.each(allowed)('accepts $field.type / $operator', ({ field, operator, value }) => {
    expect(validateWorkflow(conditionGraph(field, operator, value))).toEqual({
      valid: true,
      issues: [],
    });
  });
  it.each(fields)('rejects mismatched operator for $type', (field) => {
    const operator = field.type === 'string' ? 'gt' : 'contains';
    expect(issueCodes(conditionGraph(field, operator, 1))).toContain('OPERATOR_TYPE_MISMATCH');
  });
  it.each([
    ['number', 'eq', '15000'],
    ['number', 'gt', true],
    ['string', 'contains', 3],
    ['boolean', 'eq', 'false'],
    ['date', 'before', '2023-02-29'],
    ['date', 'after', '1900-02-29'],
    ['date', 'eq', '2024-13-01'],
    ['date', 'eq', '2024-01-01T00:00:00Z'],
    ['enum', 'eq', 'finance'],
    ['enum', 'in', 'Finance'],
    ['enum', 'eq', ['Finance']],
    ['enum', 'in', ['Finance', 'Finance']],
    ['enum', 'in', ['Finance', 'Unknown']],
  ])('rejects bad %s / %s literal', (type, operator, value) => {
    const field = fields.find((candidate) => candidate.type === type);
    if (!field || typeof operator !== 'string') throw new Error('Invalid fixture');
    expect(issueCodes(conditionGraph(field, operator, value))).toContain('CONDITION_VALUE_INVALID');
  });
  it('reports a missing input with its node ID and field key', () => {
    const graph = purchaseWorkflow();
    graph.inputs = [];
    expect(validateWorkflow(graph).issues).toContainEqual({
      code: 'INPUT_FIELD_MISSING',
      severity: 'error',
      nodeId: 'threshold',
      fieldKey: 'amount',
    });
  });
  it('allows threshold literals outside input bounds; validators do not evaluate conditions', () => {
    const field: InputField = {
      key: 'amount',
      label: 'Amount',
      required: false,
      type: 'number',
      validation: { min: 0, max: 100 },
    };
    expect(validateWorkflow(conditionGraph(field, 'gt', 10000)).valid).toBe(true);
  });
});

describe('determinism and trust boundary', () => {
  it('returns the same normalized errors across input permutations and repeated calls', () => {
    const graph = purchaseWorkflow();
    changeEdge(graph, 'e-approved', 'threshold');
    graph.edges = graph.edges.filter((edge) => edge.id !== 'e-rejected');
    graph.inputs = [];
    const expected = validateWorkflow(graph);
    for (let round = 0; round < 12; round++) {
      graph.nodes.reverse();
      graph.edges.reverse();
      const first = graph.nodes.shift();
      if (first) graph.nodes.push(first);
      expect(validateWorkflow(graph)).toEqual(expected);
    }
  });

  it('normalizes schema errors by ID rather than array index', () => {
    const graph = purchaseWorkflow();
    const input = { ...graph, nodes: graph.nodes.map((node) => ({ ...node, label: '' })) };
    const first = validateWorkflow(input);
    input.nodes.reverse();
    expect(validateWorkflow(input)).toEqual(first);
  });

  it('never mutates frozen caller input or consults random, time, or the network', () => {
    const graph = purchaseWorkflow();
    const before = JSON.stringify(graph);
    function freeze(value: unknown): void {
      if (value && typeof value === 'object') {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
      }
    }
    freeze(graph);
    const fail = () => {
      throw new Error('Unexpected side effect');
    };
    const clock = vi.spyOn(Date, 'now').mockImplementation(fail);
    const random = vi.spyOn(Math, 'random').mockImplementation(fail);
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(fail);
    let result;
    try {
      result = validateWorkflow(graph);
    } finally {
      clock.mockRestore();
      random.mockRestore();
      network.mockRestore();
    }
    expect(result).toEqual({ valid: true, issues: [] });
    expect(JSON.stringify(graph)).toBe(before);
  });

  it('rejects schema/limits at the public validator boundary before graph traversal', () => {
    expect(issueCodes({ ...purchaseWorkflow(), schemaVersion: 2 })).toContain(
      'SCHEMA_VERSION_UNSUPPORTED',
    );
    expect(issueCodes(linearWorkflow(51))).toContain('GRAPH_LIMIT_EXCEEDED');
    const graph = purchaseWorkflow();
    graph.nodes.push(graph.nodes[0]!);
    expect(issueCodes(graph)).toEqual(['DUPLICATE_ID']);
    expect(validateWorkflowJSON('{').issues[0]?.code).toBe('INVALID_JSON');
    expect(validateWorkflowJSON(null).issues[0]?.code).toBe('INVALID_JSON');
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(issueCodes(cycle)).toContain('INVALID_JSON');
    expect(issueCodes(JSON.parse('{"__proto__":{}}'))).toContain('INVALID_JSON');
  });
});
