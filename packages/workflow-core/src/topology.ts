import {
  compareText,
  NODE_HANDLES,
  type ValidationIssue,
  type Workflow,
  type WorkflowEdge,
} from '@workflow-builder/workflow-contract';

export function validateTopology(workflow: Workflow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, WorkflowEdge[]>();
  const incoming = new Map<string, WorkflowEdge[]>();
  const starts = workflow.nodes.filter((node) => node.type === 'start');
  if (starts.length !== 1)
    issues.push({
      code: 'START_COUNT_INVALID',
      severity: 'error',
      translationParams: { count: starts.length },
    });
  if (!workflow.nodes.some((node) => node.type === 'end'))
    issues.push({ code: 'END_MISSING', severity: 'error' });

  for (const edge of workflow.edges) {
    if (!nodes.has(edge.sourceNodeId) || !nodes.has(edge.targetNodeId))
      issues.push({ code: 'EDGE_DANGLING', severity: 'error', edgeId: edge.id });
    if (nodes.has(edge.sourceNodeId))
      outgoing.set(edge.sourceNodeId, [...(outgoing.get(edge.sourceNodeId) ?? []), edge]);
    if (nodes.has(edge.targetNodeId))
      incoming.set(edge.targetNodeId, [...(incoming.get(edge.targetNodeId) ?? []), edge]);
  }

  const complete = new Set<string>();
  for (const node of workflow.nodes) {
    const edges = outgoing.get(node.id) ?? [];
    const handles: readonly string[] = NODE_HANDLES[node.type];
    let connected = true;
    if (node.type === 'start')
      for (const edge of incoming.get(node.id) ?? [])
        issues.push({
          code: 'START_INCOMING',
          severity: 'error',
          nodeId: node.id,
          edgeId: edge.id,
        });
    const grouped = new Map<string, WorkflowEdge[]>();
    for (const edge of edges) {
      grouped.set(edge.sourceHandle, [...(grouped.get(edge.sourceHandle) ?? []), edge]);
      if (!handles.includes(edge.sourceHandle)) {
        connected = false;
        issues.push({
          code: node.type === 'end' ? 'END_OUTGOING' : 'HANDLE_INVALID',
          severity: 'error',
          nodeId: node.id,
          edgeId: edge.id,
          translationParams: { handle: edge.sourceHandle },
        });
      }
      if (!nodes.has(edge.targetNodeId)) connected = false;
    }
    for (const handle of handles) {
      if (!grouped.has(handle)) {
        connected = false;
        issues.push({
          code: 'HANDLE_MISSING',
          severity: 'error',
          nodeId: node.id,
          translationParams: { handle },
        });
      }
    }
    for (const [handle, matches] of grouped) {
      if (matches.length <= 1) continue;
      connected = false;
      for (const edge of matches)
        issues.push({
          code: 'DUPLICATE_HANDLE',
          severity: 'error',
          nodeId: node.id,
          edgeId: edge.id,
          translationParams: { handle },
        });
    }
    if (connected) complete.add(node.id);
  }

  const reached = new Set<string>();
  const pending = starts.map((node) => node.id);
  while (pending.length) {
    const id = pending.pop();
    if (id === undefined || reached.has(id)) continue;
    reached.add(id);
    for (const edge of outgoing.get(id) ?? [])
      if (nodes.has(edge.targetNodeId)) pending.push(edge.targetNodeId);
  }
  for (const node of workflow.nodes)
    if (!reached.has(node.id))
      issues.push({ code: 'UNREACHABLE_NODE', severity: 'error', nodeId: node.id });

  // Strongly connected components report actual cycle members, not their downstream nodes.
  // The parser caps recursion at 50 nodes before this function is reached.
  let nextIndex = 0;
  const indices = new Map<string, number>(),
    low = new Map<string, number>();
  const active = new Set<string>(),
    stack: string[] = [];
  function visit(id: string): void {
    const currentIndex = nextIndex++;
    indices.set(id, currentIndex);
    low.set(id, currentIndex);
    active.add(id);
    stack.push(id);
    const targets = [
      ...new Set(
        (outgoing.get(id) ?? [])
          .map((edge) => edge.targetNodeId)
          .filter((target) => nodes.has(target)),
      ),
    ].sort(compareText);
    for (const target of targets) {
      if (!indices.has(target)) {
        visit(target);
        low.set(id, Math.min(low.get(id) ?? currentIndex, low.get(target) ?? currentIndex));
      } else if (active.has(target)) {
        low.set(id, Math.min(low.get(id) ?? currentIndex, indices.get(target) ?? currentIndex));
      }
    }
    if (low.get(id) !== currentIndex) return;
    const component: string[] = [];
    let member: string | undefined;
    do {
      member = stack.pop();
      if (member === undefined) break;
      active.delete(member);
      component.push(member);
    } while (member !== id);
    if (component.length > 1 || targets.includes(id))
      for (const nodeId of component)
        issues.push({ code: 'CYCLE_DETECTED', severity: 'error', nodeId });
  }
  for (const id of [...nodes.keys()].sort(compareText)) if (!indices.has(id)) visit(id);

  // Least fixed point: a node is safe only if every required branch leads to a safe end.
  const terminates = new Set(
    workflow.nodes
      .filter((node) => node.type === 'end' && complete.has(node.id))
      .map((node) => node.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of workflow.nodes) {
      if (terminates.has(node.id) || !complete.has(node.id)) continue;
      if ((outgoing.get(node.id) ?? []).every((edge) => terminates.has(edge.targetNodeId))) {
        terminates.add(node.id);
        changed = true;
      }
    }
  }
  for (const node of workflow.nodes)
    if (!terminates.has(node.id))
      issues.push({ code: 'PATH_NOT_TERMINATING', severity: 'error', nodeId: node.id });
  return issues;
}
