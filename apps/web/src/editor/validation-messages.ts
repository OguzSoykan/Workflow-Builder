import type { ValidationIssue, Workflow, WorkflowEdge } from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';
import { HANDLE_LABELS } from './model';

export type IssueTarget = { kind: 'node' | 'edge'; id: string } | null;
export type DescribedIssue = { key: string; text: string; target: IssueTarget };

function handleLabel(handle: unknown): string {
  return typeof handle === 'string' && handle in HANDLE_LABELS
    ? HANDLE_LABELS[handle as WorkflowEdge['sourceHandle']]
    : String(handle);
}

export function describeIssue(workflow: Workflow, issue: ValidationIssue): string {
  const label = workflow.nodes.find((node) => node.id === issue.nodeId)?.label ?? 'Bilinmeyen';
  const step = `“${label}”`;
  const handle = `“${handleLabel(issue.translationParams?.handle)}”`;
  switch (issue.code) {
    case 'START_COUNT_INVALID':
      return issue.translationParams?.count === 0
        ? 'Akışta başlangıç adımı yok; bir başlangıç adımı ekleyin.'
        : `Akışta ${String(issue.translationParams?.count)} başlangıç adımı var; yalnız bir tane olmalı.`;
    case 'END_MISSING':
      return 'Akışta bitiş adımı yok; en az bir bitiş adımı ekleyin.';
    case 'EDGE_DANGLING':
      return 'Bir bağlantı var olmayan bir adıma işaret ediyor; bağlantıyı silin.';
    case 'HANDLE_MISSING':
      return `${step} adımının ${handle} çıkışı bağlı değil.`;
    case 'HANDLE_INVALID':
      return `${step} adımında bu türe ait olmayan ${handle} çıkışı kullanılmış.`;
    case 'DUPLICATE_HANDLE':
      return `${step} adımının ${handle} çıkışında birden fazla bağlantı var.`;
    case 'START_INCOMING':
      return `${step} başlangıç adımına bağlantı gelemez.`;
    case 'END_OUTGOING':
      return `${step} bitiş adımından bağlantı çıkamaz.`;
    case 'UNREACHABLE_NODE':
      return `${step} adımına başlangıçtan ulaşılamıyor.`;
    case 'CYCLE_DETECTED':
      return `${step} adımı bir döngünün parçası; akış sonsuza kadar sürebilir.`;
    case 'PATH_NOT_TERMINATING':
      return `${step} adımından sonraki her yol bir bitiş adımına varmıyor.`;
    case 'INPUT_FIELD_MISSING':
      return `${step} koşulu tanımlı bir giriş alanına bağlı değil.`;
    case 'OPERATOR_TYPE_MISMATCH':
      return `${step} koşulundaki karşılaştırma alan türüyle kullanılamaz.`;
    case 'CONDITION_VALUE_INVALID':
      return `${step} koşulunun değeri alan türüne veya seçeneklerine uymuyor.`;
    default:
      return `Belge şemaya uymuyor (${issue.code}).`;
  }
}

// PATH_NOT_TERMINATING is implied by any other issue on the same step, so it is shown alone only.
export function describeWorkflow(workflow: Workflow): DescribedIssue[] {
  const { issues } = validateWorkflow(workflow);
  const direct = new Set(
    issues
      .filter((issue) => issue.code !== 'PATH_NOT_TERMINATING' && issue.nodeId)
      .map((issue) => issue.nodeId),
  );
  // Whole-graph issues first, then in step order so the list follows the canvas.
  const order = (issue: ValidationIssue) =>
    issue.nodeId === undefined ? -1 : workflow.nodes.findIndex((node) => node.id === issue.nodeId);
  return issues
    .filter((issue) => issue.code !== 'PATH_NOT_TERMINATING' || !direct.has(issue.nodeId))
    .sort((left, right) => order(left) - order(right))
    .map((issue) => ({
      key: JSON.stringify([issue.code, issue.nodeId, issue.edgeId, issue.translationParams]),
      text: describeIssue(workflow, issue),
      target: issue.nodeId
        ? { kind: 'node', id: issue.nodeId }
        : issue.edgeId
          ? { kind: 'edge', id: issue.edgeId }
          : null,
    }));
}

export function issueCountsByNode(issues: DescribedIssue[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const issue of issues)
    if (issue.target?.kind === 'node')
      counts.set(issue.target.id, (counts.get(issue.target.id) ?? 0) + 1);
  return counts;
}
