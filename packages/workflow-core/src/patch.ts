import {
  compareText,
  parseWorkflow,
  type InputField,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
} from '@workflow-builder/workflow-contract';

// Workflow Contract §6 / D-11: canonical edit operations, applied atomically in a fixed order.
export type PatchOperation =
  | { op: 'deleteEdge'; id: string }
  | { op: 'deleteNode'; id: string }
  | { op: 'removeInputField'; key: string }
  | { op: 'upsertInputField'; field: InputField }
  | { op: 'addNode'; node: WorkflowNode }
  | { op: 'updateNode'; id: string; label?: string; config?: WorkflowNode['config'] }
  | { op: 'addEdge'; edge: WorkflowEdge }
  | { op: 'updateMetadata'; title?: string; description?: string | null };
export type PatchResult = { ok: true; workflow: Workflow } | { ok: false; reason: string };

const ORDER: PatchOperation['op'][] = [
  'deleteEdge',
  'deleteNode',
  'removeInputField',
  'upsertInputField',
  'addNode',
  'updateNode',
  'addEdge',
  'updateMetadata',
];

/** Applies every operation or none; unknown targets and dangling references reject the patch. */
export function applyPatch(base: Workflow, operations: readonly PatchOperation[]): PatchResult {
  const fail = (reason: string): PatchResult => ({ ok: false, reason });
  const sorted = [...operations].sort((a, b) => ORDER.indexOf(a.op) - ORDER.indexOf(b.op));
  let nodes = [...base.nodes];
  let edges = [...base.edges];
  let inputs = [...base.inputs];
  let { title, description } = base;
  for (const operation of sorted) {
    switch (operation.op) {
      case 'deleteEdge':
        if (!edges.some((edge) => edge.id === operation.id))
          return fail(`EDGE_NOT_FOUND:${operation.id}`);
        edges = edges.filter((edge) => edge.id !== operation.id);
        break;
      case 'deleteNode':
        if (!nodes.some((node) => node.id === operation.id))
          return fail(`NODE_NOT_FOUND:${operation.id}`);
        nodes = nodes.filter((node) => node.id !== operation.id);
        edges = edges.filter(
          (edge) => edge.sourceNodeId !== operation.id && edge.targetNodeId !== operation.id,
        );
        break;
      case 'removeInputField':
        if (!inputs.some((field) => field.key === operation.key))
          return fail(`INPUT_NOT_FOUND:${operation.key}`);
        inputs = inputs.filter((field) => field.key !== operation.key);
        break;
      case 'upsertInputField':
        inputs = inputs.some((field) => field.key === operation.field.key)
          ? inputs.map((field) => (field.key === operation.field.key ? operation.field : field))
          : [...inputs, operation.field];
        break;
      case 'addNode':
        if (nodes.some((node) => node.id === operation.node.id))
          return fail(`NODE_EXISTS:${operation.node.id}`);
        nodes = [...nodes, operation.node];
        break;
      case 'updateNode': {
        const index = nodes.findIndex((node) => node.id === operation.id);
        const current = nodes[index];
        if (!current) return fail(`NODE_NOT_FOUND:${operation.id}`);
        nodes = nodes.map((node, position) =>
          position === index
            ? ({
                ...current,
                ...(operation.label === undefined ? {} : { label: operation.label }),
                ...(operation.config === undefined ? {} : { config: operation.config }),
              } as WorkflowNode)
            : node,
        );
        break;
      }
      case 'addEdge':
        if (edges.some((edge) => edge.id === operation.edge.id))
          return fail(`EDGE_EXISTS:${operation.edge.id}`);
        if (
          ![operation.edge.sourceNodeId, operation.edge.targetNodeId].every((id) =>
            nodes.some((node) => node.id === id),
          )
        )
          return fail(`EDGE_DANGLING:${operation.edge.id}`);
        edges = [...edges, operation.edge];
        break;
      case 'updateMetadata':
        if (operation.title !== undefined) title = operation.title;
        if (operation.description !== undefined) description = operation.description ?? undefined;
        break;
    }
  }
  // A removed field may not stay referenced by a condition (no dangling input references).
  const keys = new Set(inputs.map((field) => field.key));
  const dangling = nodes.find(
    (node) =>
      node.type === 'condition' &&
      !keys.has(node.config.fieldKey) &&
      base.inputs.some((field) => field.key === node.config.fieldKey),
  );
  if (dangling) return fail(`INPUT_STILL_REFERENCED:${dangling.id}`);
  const candidate: Record<string, unknown> = { ...base, title, nodes, edges, inputs };
  if (description === undefined) delete candidate.description;
  else candidate.description = description;
  delete candidate.contentHash;
  const parsed = parseWorkflow(candidate);
  return parsed.success
    ? { ok: true, workflow: parsed.data }
    : fail(`SCHEMA_INVALID:${parsed.issues[0]?.code ?? ''}`);
}

export interface WorkflowDiff {
  addedNodes: string[];
  removedNodes: string[];
  changedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
  addedInputs: string[];
  removedInputs: string[];
  changedInputs: string[];
  metadataChanged: boolean;
}

/** Server-side semantic diff by stable ID; positions are layout and not reported as changes. */
export function diffWorkflows(before: Workflow, after: Workflow): WorkflowDiff {
  // Key order differs after schema parsing, so values are compared with sorted keys.
  const stable = (value: unknown): string =>
    Array.isArray(value)
      ? `[${value.map(stable).join(',')}]`
      : value && typeof value === 'object'
        ? `{${Object.keys(value)
            .sort(compareText)
            .map(
              (key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`,
            )
            .join(',')}}`
        : JSON.stringify(value);
  const same = (a: unknown, b: unknown) => stable(a) === stable(b);
  const byId = <T extends { id: string }>(items: readonly T[]) =>
    new Map(items.map((item) => [item.id, item]));
  const nodesBefore = byId(before.nodes);
  const nodesAfter = byId(after.nodes);
  const edgeKey = (edge: WorkflowEdge) =>
    `${edge.sourceNodeId}|${edge.sourceHandle}|${edge.targetNodeId}`;
  const edgesBefore = new Map(before.edges.map((edge) => [edgeKey(edge), edge.id]));
  const edgesAfter = new Map(after.edges.map((edge) => [edgeKey(edge), edge.id]));
  const inputsBefore = new Map(before.inputs.map((field) => [field.key, field]));
  const inputsAfter = new Map(after.inputs.map((field) => [field.key, field]));
  const sort = (values: string[]) => values.sort(compareText);
  return {
    addedNodes: sort([...nodesAfter.keys()].filter((id) => !nodesBefore.has(id))),
    removedNodes: sort([...nodesBefore.keys()].filter((id) => !nodesAfter.has(id))),
    changedNodes: sort(
      [...nodesAfter.keys()].filter((id) => {
        const old = nodesBefore.get(id);
        const next = nodesAfter.get(id);
        return old && next && !same([old.label, old.config], [next.label, next.config]);
      }),
    ),
    addedEdges: sort(
      [...edgesAfter.entries()].filter(([key]) => !edgesBefore.has(key)).map(([, id]) => id),
    ),
    removedEdges: sort(
      [...edgesBefore.entries()].filter(([key]) => !edgesAfter.has(key)).map(([, id]) => id),
    ),
    addedInputs: sort([...inputsAfter.keys()].filter((key) => !inputsBefore.has(key))),
    removedInputs: sort([...inputsBefore.keys()].filter((key) => !inputsAfter.has(key))),
    changedInputs: sort(
      [...inputsAfter.keys()].filter(
        (key) => inputsBefore.has(key) && !same(inputsBefore.get(key), inputsAfter.get(key)),
      ),
    ),
    metadataChanged: before.title !== after.title || before.description !== after.description,
  };
}
