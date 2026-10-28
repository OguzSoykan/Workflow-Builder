import type { ValidationIssue, Workflow, WorkflowEdge } from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';
import { HANDLE_LABELS } from './model';
import { t } from '../i18n/i18n';

export type IssueTarget = { kind: 'node' | 'edge'; id: string } | null;
export type DescribedIssue = { key: string; text: string; target: IssueTarget };

function handleLabel(handle: unknown): string {
  return typeof handle === 'string' && handle in HANDLE_LABELS
    ? t(HANDLE_LABELS[handle as WorkflowEdge['sourceHandle']])
    : String(handle);
}

export function describeIssue(workflow: Workflow, issue: ValidationIssue): string {
  const label = workflow.nodes.find((node) => node.id === issue.nodeId)?.label ?? 'Bilinmeyen';
  const step = `“${label}”`;
  const handle = `“${handleLabel(issue.translationParams?.handle)}”`;
  switch (issue.code) {
    case 'START_COUNT_INVALID':
      return issue.translationParams?.count === 0
        ? t('Akışta başlangıç adımı yok; bir başlangıç adımı ekleyin.')
        : t('Akışta {count} başlangıç adımı var; yalnız bir tane olmalı.', {
            count: String(issue.translationParams?.count),
          });
    case 'END_MISSING':
      return t('Akışta bitiş adımı yok; en az bir bitiş adımı ekleyin.');
    case 'EDGE_DANGLING':
      return t('Bir bağlantı var olmayan bir adıma işaret ediyor; bağlantıyı silin.');
    case 'HANDLE_MISSING':
      return t('{step} adımının {handle} çıkışı bağlı değil.', { step, handle });
    case 'HANDLE_INVALID':
      return t('{step} adımında bu türe ait olmayan {handle} çıkışı kullanılmış.', {
        step,
        handle,
      });
    case 'DUPLICATE_HANDLE':
      return t('{step} adımının {handle} çıkışında birden fazla bağlantı var.', { step, handle });
    case 'START_INCOMING':
      return t('{step} başlangıç adımına bağlantı gelemez.', { step });
    case 'END_OUTGOING':
      return t('{step} bitiş adımından bağlantı çıkamaz.', { step });
    case 'UNREACHABLE_NODE':
      return t('{step} adımına başlangıçtan ulaşılamıyor.', { step });
    case 'CYCLE_DETECTED':
      return t('{step} adımı bir döngünün parçası; akış sonsuza kadar sürebilir.', { step });
    case 'PATH_NOT_TERMINATING':
      return t('{step} adımından sonraki her yol bir bitiş adımına varmıyor.', { step });
    case 'INPUT_FIELD_MISSING':
      return t('{step} koşulu tanımlı bir giriş alanına bağlı değil.', { step });
    case 'OPERATOR_TYPE_MISMATCH':
      return t('{step} koşulundaki karşılaştırma alan türüyle kullanılamaz.', { step });
    case 'CONDITION_VALUE_INVALID':
      return t('{step} koşulunun değeri alan türüne veya seçeneklerine uymuyor.', { step });
    default:
      return t('Belge şemaya uymuyor ({code}).', { code: issue.code });
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
