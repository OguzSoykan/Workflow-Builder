import type { Workflow, WorkflowNode } from '@workflow-builder/workflow-contract';

// Synthetic fixture only: amount > 10000 routes to a manual manager approval.
export function purchaseWorkflow(): Workflow {
  return {
    schemaVersion: 1,
    workflowId: 'purchase-example',
    title: 'Satın alma',
    locale: 'tr',
    inputs: [
      { key: 'amount', label: 'Tutar', type: 'number', required: true, validation: { min: 0 } },
    ],
    nodes: [
      { id: 'start', type: 'start', label: 'Başlangıç', position: { x: 0, y: 0 }, config: {} },
      {
        id: 'threshold',
        type: 'condition',
        label: 'Tutar kontrolü',
        position: { x: 0, y: 100 },
        config: { fieldKey: 'amount', operator: 'gt', value: 10000 },
      },
      {
        id: 'manager',
        type: 'approval',
        label: 'Yönetici onayı',
        position: { x: 100, y: 200 },
        config: { roleLabel: 'Yönetici' },
      },
      {
        id: 'completed',
        type: 'end',
        label: 'Tamamlandı',
        position: { x: 0, y: 300 },
        config: { outcome: 'completed' },
      },
      {
        id: 'rejected',
        type: 'end',
        label: 'Reddedildi',
        position: { x: 200, y: 300 },
        config: { outcome: 'rejected' },
      },
    ],
    edges: [
      { id: 'e-start', sourceNodeId: 'start', sourceHandle: 'next', targetNodeId: 'threshold' },
      { id: 'e-large', sourceNodeId: 'threshold', sourceHandle: 'true', targetNodeId: 'manager' },
      {
        id: 'e-small',
        sourceNodeId: 'threshold',
        sourceHandle: 'false',
        targetNodeId: 'completed',
      },
      {
        id: 'e-approved',
        sourceNodeId: 'manager',
        sourceHandle: 'approved',
        targetNodeId: 'completed',
      },
      {
        id: 'e-rejected',
        sourceNodeId: 'manager',
        sourceHandle: 'rejected',
        targetNodeId: 'rejected',
      },
    ],
  };
}

export function linearWorkflow(count: number): Workflow {
  const base = purchaseWorkflow();
  base.nodes = Array.from({ length: count }, (_, index): WorkflowNode => {
    const common = { id: `node-${index}`, label: `Node ${index}`, position: { x: 0, y: index } };
    if (index === 0) return { ...common, type: 'start', config: {} };
    if (index === count - 1) return { ...common, type: 'end', config: { outcome: 'completed' } };
    return { ...common, type: 'approval', config: { roleLabel: 'Reviewer' } };
  });
  base.edges = base.nodes.slice(0, -1).flatMap((node, index) =>
    (index === 0 ? (['next'] as const) : (['approved', 'rejected'] as const)).map((handle) => ({
      id: `edge-${index}-${handle}`,
      sourceNodeId: node.id,
      sourceHandle: handle,
      targetNodeId: `node-${index + 1}`,
    })),
  );
  return base;
}
