import type { InputField, Workflow } from '@workflow-builder/workflow-contract';
import type {
  InputIssue,
  InputValue,
  SimulationRun,
  SimulationStep,
} from '@workflow-builder/workflow-core';
import { conditionSummary } from './condition-model';
import { HANDLE_LABELS } from './model';
import { t } from '../i18n/i18n';

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
      return t('{name} için bir değer girin; alan zorunlu veya bir koşulda kullanılıyor.', {
        name,
      });
    case 'INPUT_TYPE_INVALID':
      return t('{name} değeri alan türüne veya seçeneklerine uymuyor.', { name });
    case 'INPUT_OUT_OF_RANGE':
      return t('{name} değeri alanın alt/üst sınırları dışında.', { name });
    case 'INPUT_UNKNOWN':
      return t('{name} akışta tanımlı bir alan değil.', { name });
  }
}

function formatValue(value: InputValue): string {
  return typeof value === 'boolean' ? (value ? t('Doğru') : t('Yanlış')) : String(value);
}

export function describeStep(workflow: Workflow, step: SimulationStep, run: SimulationRun): string {
  const node = workflow.nodes.find((item) => item.id === step.nodeId);
  const name = `“${node?.label ?? step.nodeId}”`;
  switch (step.action) {
    case 'start':
      return t('{name} başladı.', { name });
    case 'evaluate': {
      const summary = node ? conditionSummary(workflow, node) : null;
      const key = node?.type === 'condition' ? node.config.fieldKey : undefined;
      const actual = key === undefined ? undefined : run.inputValues[key];
      const result = step.outputState?.conditionResult ? t('Doğru') : t('Yanlış');
      const value =
        actual === undefined ? '' : t(' (değer: {value})', { value: formatValue(actual) });
      return t('{name}: {summary}{value} → {result}.', {
        name,
        summary: summary ?? t('koşul'),
        value,
        result,
      });
    }
    case 'await_approval': {
      const role = node?.type === 'approval' ? node.config.roleLabel : 'Onaylayan';
      return t('{name} adımı {role} kararını bekliyor.', { name, role });
    }
    case 'decide':
      return `${name}: ${t(HANDLE_LABELS[step.decision ?? 'approved'])}.`;
    case 'end':
      return step.outputState?.outcome === 'rejected'
        ? t('{name} bitişine ulaşıldı: akış reddedildi.', { name })
        : t('{name} bitişine ulaşıldı: akış tamamlandı.', { name });
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
