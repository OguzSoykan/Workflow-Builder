import { describe, expect, it } from 'vitest';
import type { Workflow } from '@workflow-builder/workflow-contract';
import {
  applyPatch,
  diffWorkflows,
  validateWorkflow,
  type PatchOperation,
} from '@workflow-builder/workflow-core';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

const ok = (result: ReturnType<typeof applyPatch>): Workflow => {
  if (!result.ok) throw new Error(result.reason);
  return result.workflow;
};

describe('applyPatch', () => {
  it('inserts a finance approval between manager approval and completion, keeping other IDs', () => {
    const base = purchaseWorkflow();
    const operations: PatchOperation[] = [
      {
        op: 'addEdge',
        edge: {
          id: 'e-fin-ok',
          sourceNodeId: 'finance',
          sourceHandle: 'approved',
          targetNodeId: 'completed',
        },
      },
      {
        op: 'addEdge',
        edge: {
          id: 'e-fin-no',
          sourceNodeId: 'finance',
          sourceHandle: 'rejected',
          targetNodeId: 'rejected',
        },
      },
      {
        op: 'addEdge',
        edge: {
          id: 'e-mgr-fin',
          sourceNodeId: 'manager',
          sourceHandle: 'approved',
          targetNodeId: 'finance',
        },
      },
      {
        op: 'addNode',
        node: {
          id: 'finance',
          type: 'approval',
          label: 'Finans onayı',
          position: { x: 300, y: 200 },
          config: { roleLabel: 'Finans' },
        },
      },
      { op: 'deleteEdge', id: 'e-approved' },
      { op: 'updateMetadata', title: 'Satın alma (iki onay)' },
    ];
    const result = ok(applyPatch(base, operations));
    expect(validateWorkflow(result)).toEqual({ valid: true, issues: [] });
    expect(result.nodes.slice(0, 5)).toEqual(base.nodes);
    expect(result.title).toBe('Satın alma (iki onay)');
    expect(diffWorkflows(base, result)).toEqual({
      addedNodes: ['finance'],
      removedNodes: [],
      changedNodes: [],
      addedEdges: ['e-fin-no', 'e-fin-ok', 'e-mgr-fin'],
      removedEdges: ['e-approved'],
      addedInputs: [],
      removedInputs: [],
      changedInputs: [],
      metadataChanged: true,
    });
    expect(base.edges).toHaveLength(5);
  });

  it('removes incident edges with a node and updates labels and config in place', () => {
    const base = purchaseWorkflow();
    const result = ok(
      applyPatch(base, [
        { op: 'deleteNode', id: 'manager' },
        {
          op: 'updateNode',
          id: 'threshold',
          label: 'Limit kontrolü',
          config: { fieldKey: 'amount', operator: 'gte', value: 20000 },
        },
        {
          op: 'addEdge',
          edge: {
            id: 'e-large2',
            sourceNodeId: 'threshold',
            sourceHandle: 'true',
            targetNodeId: 'rejected',
          },
        },
        { op: 'updateMetadata', description: 'Açıklama' },
      ]),
    );
    expect(result.edges.map((edge) => edge.id)).toEqual(['e-start', 'e-small', 'e-large2']);
    expect(result.nodes.find((node) => node.id === 'threshold')).toMatchObject({
      label: 'Limit kontrolü',
      config: { operator: 'gte', value: 20000 },
    });
    expect(result.description).toBe('Açıklama');
    expect(
      ok(applyPatch(result, [{ op: 'updateMetadata', description: null }])).description,
    ).toBeUndefined();
    expect(diffWorkflows(base, result)).toMatchObject({
      removedNodes: ['manager'],
      changedNodes: ['threshold'],
      removedEdges: ['e-approved', 'e-large', 'e-rejected'],
    });
  });

  it('upserts and removes input fields', () => {
    const base = purchaseWorkflow();
    const withField = ok(
      applyPatch(base, [
        {
          op: 'upsertInputField',
          field: {
            key: 'dept',
            label: 'Departman',
            type: 'enum',
            required: false,
            options: ['IT', 'İK'],
          },
        },
      ]),
    );
    expect(diffWorkflows(base, withField).addedInputs).toEqual(['dept']);
    const changed = ok(
      applyPatch(withField, [
        {
          op: 'upsertInputField',
          field: { key: 'dept', label: 'Birim', type: 'enum', required: true, options: ['IT'] },
        },
      ]),
    );
    expect(diffWorkflows(withField, changed).changedInputs).toEqual(['dept']);
    expect(
      diffWorkflows(changed, ok(applyPatch(changed, [{ op: 'removeInputField', key: 'dept' }])))
        .removedInputs,
    ).toEqual(['dept']);
  });

  it.each([
    [[{ op: 'deleteNode', id: 'ghost' }], 'NODE_NOT_FOUND:ghost'],
    [[{ op: 'deleteEdge', id: 'ghost' }], 'EDGE_NOT_FOUND:ghost'],
    [[{ op: 'removeInputField', key: 'ghost' }], 'INPUT_NOT_FOUND:ghost'],
    [[{ op: 'updateNode', id: 'ghost', label: 'x' }], 'NODE_NOT_FOUND:ghost'],
    [
      [
        {
          op: 'addNode',
          node: { id: 'start', type: 'start', label: 'x', position: { x: 0, y: 0 }, config: {} },
        },
      ],
      'NODE_EXISTS:start',
    ],
    [
      [
        {
          op: 'addEdge',
          edge: {
            id: 'e-start',
            sourceNodeId: 'start',
            sourceHandle: 'next',
            targetNodeId: 'manager',
          },
        },
      ],
      'EDGE_EXISTS:e-start',
    ],
    [
      [
        {
          op: 'addEdge',
          edge: { id: 'e-x', sourceNodeId: 'start', sourceHandle: 'next', targetNodeId: 'ghost' },
        },
      ],
      'EDGE_DANGLING:e-x',
    ],
    [[{ op: 'removeInputField', key: 'amount' }], 'INPUT_STILL_REFERENCED:threshold'],
    [[{ op: 'updateNode', id: 'manager', label: '' }], 'SCHEMA_INVALID:SCHEMA_INVALID'],
  ] as [PatchOperation[], string][])('rejects %j atomically', (operations, reason) => {
    const base = purchaseWorkflow();
    expect(
      applyPatch(base, [{ op: 'updateMetadata', title: 'değişmeli mi?' }, ...operations]),
    ).toEqual({ ok: false, reason });
    expect(base.title).toBe('Satın alma');
  });

  it('ignores positions in the diff', () => {
    const base = purchaseWorkflow();
    const moved = structuredClone(base);
    moved.nodes[0]!.position = { x: 999, y: 999 };
    expect(
      Object.values(diffWorkflows(base, moved)).every((value) =>
        Array.isArray(value) ? value.length === 0 : value === false,
      ),
    ).toBe(true);
  });
});
