import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  canonicalizeWorkflow,
  computeContentHash,
  hasValidContentHash,
  parseWorkflowJSON,
  serializeWorkflow,
  withContentHash,
  WorkflowContractError,
  WORKFLOW_LIMITS,
  utf8ByteLength,
} from '@workflow-builder/workflow-contract';
import { sizedWorkflow } from '../../../tests/fixtures/sized-workflow';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

describe('canonical serialization and content hash', () => {
  it('reserves room for the derived hash and refuses oversized exports', () => {
    const hashBytes = utf8ByteLength(',"contentHash":"' + '0'.repeat(64) + '"');
    const atLimit = sizedWorkflow(WORKFLOW_LIMITS.bytes - hashBytes);
    expect(utf8ByteLength(serializeWorkflow(atLimit))).toBe(WORKFLOW_LIMITS.bytes);
    expect(() => serializeWorkflow(sizedWorkflow(WORKFLOW_LIMITS.bytes))).toThrow(
      WorkflowContractError,
    );
  });

  it('matches the fixed independent UTF-8 test vector', () => {
    const vector = JSON.parse(
      readFileSync(new URL('../../../tests/fixtures/hash-vector.json', import.meta.url), 'utf8'),
    ) as { workflow: unknown; canonicalJSON: string; contentHash: string };
    expect(canonicalizeWorkflow(vector.workflow)).toBe(vector.canonicalJSON);
    expect(computeContentHash(vector.workflow)).toBe(vector.contentHash);
  });
  it('matches independent Node SHA-256 and Web Crypto implementations', async () => {
    const graph = purchaseWorkflow();
    const canonical = canonicalizeWorkflow(graph);
    const hash = computeContentHash(graph);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(createHash('sha256').update(canonical, 'utf8').digest('hex'));
    const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
    expect(hash).toBe(Buffer.from(digest).toString('hex'));
  });

  it('ignores node/edge/input/object key order and all canvas positions', () => {
    const original = purchaseWorkflow();
    const changed = structuredClone(original);
    changed.inputs.push({
      key: 'department',
      label: 'Department',
      type: 'string',
      required: false,
    });
    const hash = computeContentHash(changed);
    changed.nodes.reverse();
    changed.edges.reverse();
    changed.inputs.reverse();
    for (const node of changed.nodes) {
      node.position = { x: -999, y: 333 };
    }
    changed.layout = { viewport: { x: 100, y: 200, zoom: 2 } };
    changed.contentHash = 'f'.repeat(64);
    const reordered = Object.fromEntries(Object.entries(changed).reverse());
    expect(computeContentHash(reordered)).toBe(hash);
    expect(hasValidContentHash(changed)).toBe(false);
    expect(hasValidContentHash(withContentHash(changed))).toBe(true);
  });

  it.each([
    'title',
    'description',
    'locale',
    'workflowId',
    'label',
    'role',
    'literal',
    'operator',
    'field',
    'target',
    'default',
    'outcome',
  ])('changes when %s changes', (change) => {
    const graph = purchaseWorkflow();
    const previous = computeContentHash(graph);
    if (change === 'title') graph.title = 'Different';
    if (change === 'description') graph.description = 'Different';
    if (change === 'locale') graph.locale = 'en';
    if (change === 'workflowId') graph.workflowId = 'another-workflow';
    if (change === 'label' && graph.nodes[0]) graph.nodes[0].label = 'Different';
    const condition = graph.nodes.find((node) => node.type === 'condition');
    if (condition?.type === 'condition') {
      if (change === 'literal') condition.config.value = 12000;
      if (change === 'operator') condition.config.operator = 'gte';
    }
    const approval = graph.nodes.find((node) => node.type === 'approval');
    if (change === 'role' && approval?.type === 'approval')
      approval.config.roleLabel = 'Another role';
    if (change === 'field' && graph.inputs[0]) graph.inputs[0].label = 'Amount';
    if (change === 'target' && graph.edges[0]) graph.edges[0].targetNodeId = 'completed';
    if (change === 'default' && graph.inputs[0]?.type === 'number')
      graph.inputs[0].defaultValue = 10;
    const end = graph.nodes.find((node) => node.type === 'end');
    if (change === 'outcome' && end?.type === 'end') end.config.outcome = 'rejected';
    expect(computeContentHash(graph)).not.toBe(previous);
  });

  it('treats enum options and in literals as sets for business hashing but preserves export order', () => {
    const graph = purchaseWorkflow();
    graph.inputs = [
      { key: 'amount', type: 'enum', label: 'Category', required: true, options: ['C', 'A', 'B'] },
    ];
    const condition = graph.nodes.find((node) => node.type === 'condition');
    if (!condition || condition.type !== 'condition') throw new Error('Fixture missing condition');
    condition.config = { fieldKey: 'amount', operator: 'in', value: ['B', 'A'] };
    const hash = computeContentHash(graph);
    const first = withContentHash(graph);
    expect(parseWorkflowJSON(serializeWorkflow(first))).toEqual({ success: true, data: first });
    const field = graph.inputs[0];
    if (field?.type === 'enum') field.options.reverse();
    condition.config.value = ['A', 'B'];
    expect(computeContentHash(graph)).toBe(hash);
  });

  it('round-trips a full snapshot and preserves stable IDs without mutating frozen input', () => {
    const graph = purchaseWorkflow();
    graph.layout = { viewport: { x: 0, y: 4, zoom: 1.2 } };
    const before = structuredClone(graph);
    function freeze(value: unknown): void {
      if (value && typeof value === 'object') {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
      }
    }
    freeze(graph);
    const snapshot = withContentHash(graph);
    const serialized = serializeWorkflow(snapshot);
    expect(parseWorkflowJSON(serialized)).toEqual({ success: true, data: snapshot });
    expect(serializeWorkflow(JSON.parse(serialized))).toBe(serialized);
    expect(snapshot.nodes.map((node) => node.id)).toEqual(graph.nodes.map((node) => node.id));
    expect(snapshot.edges.map((edge) => edge.id)).toEqual(graph.edges.map((edge) => edge.id));
    expect(graph).toEqual(before);
  });

  it('keeps revisions/timestamps in envelopes outside the canonical document', () => {
    const first = { workflow: purchaseWorkflow(), revision: 1, updatedAt: '2026-01-01' };
    const second = { ...first, revision: 2, updatedAt: '2026-02-01' };
    expect(computeContentHash(first.workflow)).toBe(computeContentHash(second.workflow));
    expect(() => computeContentHash({ ...first.workflow, revision: 1 })).toThrow(
      WorkflowContractError,
    );
  });

  it('rejects invalid input and does not assume omitted hashes are verified', () => {
    expect(() => canonicalizeWorkflow({ schemaVersion: 2 })).toThrow(WorkflowContractError);
    expect(() => serializeWorkflow({})).toThrow(WorkflowContractError);
    expect(hasValidContentHash({})).toBe(false);
    expect(hasValidContentHash(purchaseWorkflow())).toBe(false);
  });
});
