import type { InputField, Workflow } from '@workflow-builder/workflow-contract';
import type {
  InputIssue,
  InputValue,
  SimulationRun,
  SimulationStep,
} from '@workflow-builder/workflow-core';
import { conditionSummary } from './condition-model';
import { HANDLE_LABELS } from './model';

// Empty controls are omitted so defaults and the required/used-field rule apply (D-14).
export function simulationInputsFromForm(
  data: FormData,
  inputs: readonly InputField[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of inputs) {
    const raw = String(data.get(`sim:${field.key}`) ?? '');
    if (raw === '') continue;
    values[field.key] =
      field.type === 'number' ? Number(raw) : field.type === 'boolean' ? raw === 'true' : raw;
  }
  return values;
}

export function inputIssueText(issue: InputIssue, workflow: Workflow): string {
  const label = workflow.inputs.find((field) => field.key === issue.fieldKey)?.label;
  const name = `“${label ?? issue.fieldKey}”`;
  switch (issue.code) {
    case 'INPUT_REQUIRED':
      return `${name} için bir değer girin; alan zorunlu veya bir koşulda kullanılıyor.`;
    case 'INPUT_TYPE_INVALID':
      return `${name} değeri alan türüne veya seçeneklerine uymuyor.`;
    case 'INPUT_OUT_OF_RANGE':
      return `${name} değeri alanın alt/üst sınırları dışında.`;
    case 'INPUT_UNKNOWN':
      return `${name} akışta tanımlı bir alan değil.`;
  }
}

function formatValue(value: InputValue): string {
  return typeof value === 'boolean' ? (value ? 'Doğru' : 'Yanlış') : String(value);
}

export function describeStep(workflow: Workflow, step: SimulationStep, run: SimulationRun): string {
  const node = workflow.nodes.find((item) => item.id === step.nodeId);
  const name = `“${node?.label ?? step.nodeId}”`;
  switch (step.action) {
    case 'start':
      return `${name} başladı.`;
    case 'evaluate': {
      const summary = node ? conditionSummary(workflow, node) : null;
      const key = node?.type === 'condition' ? node.config.fieldKey : undefined;
      const actual = key === undefined ? undefined : run.inputValues[key];
      const result = step.outputState?.conditionResult ? 'Doğru' : 'Yanlış';
      return `${name}: ${summary ?? 'koşul'}${actual === undefined ? '' : ` (değer: ${formatValue(actual)})`} → ${result}.`;
    }
    case 'await_approval': {
      const role = node?.type === 'approval' ? node.config.roleLabel : 'Onaylayan';
      return `${name} adımı ${role} kararını bekliyor.`;
    }
    case 'decide':
      return `${name}: ${HANDLE_LABELS[step.decision ?? 'approved']}.`;
    case 'end':
      return `${name} bitişine ulaşıldı: ${
        step.outputState?.outcome === 'rejected' ? 'akış reddedildi' : 'akış tamamlandı'
      }.`;
  }
}

/** Nodes and edges the run has passed through, for canvas highlighting. */
export function visitedPath(workflow: Workflow, run: SimulationRun) {
  const nodes = new Set(run.trace.map((step) => step.nodeId));
  const edges = new Set<string>();
  for (const step of run.trace) {
    if (!step.selectedHandle) continue;
    const edge = workflow.edges.find(
      (item) => item.sourceNodeId === step.nodeId && item.sourceHandle === step.selectedHandle,
    );
    if (edge && nodes.has(edge.targetNodeId)) edges.add(edge.id);
  }
  return { nodes, edges };
}
