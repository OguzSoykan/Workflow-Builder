import { editCondition, type ConditionEdit } from './condition-model';
import { editInput, type InputEdit } from './input-model';
import {
  NODE_HANDLES,
  WORKFLOW_LIMITS,
  parseWorkflow,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
} from '@workflow-builder/workflow-contract';
import { getLocale, t } from '../i18n/i18n';

export type NodeKind = WorkflowNode['type'];
export type EditableProperties = {
  [K in Exclude<NodeKind, 'condition'>]: Pick<
    Extract<WorkflowNode, { type: K }>,
    'type' | 'config'
  >;
}[Exclude<NodeKind, 'condition'>];
export const NODE_LABELS: Record<NodeKind, string> = {
  start: 'Başlangıç',
  approval: 'Onay',
  condition: 'Koşul',
  end: 'Bitiş',
};
export const HANDLE_LABELS: Record<WorkflowEdge['sourceHandle'], string> = {
  next: 'Sonraki',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  true: 'Doğru',
  false: 'Yanlış',
};

export type Edit =
  | InputEdit
  | ConditionEdit
  | { type: 'add-node'; id: string; kind: NodeKind; position: { x: number; y: number } }
  | { type: 'rename-node'; id: string; label: string }
  | { type: 'update-properties'; id: string; label: string; properties: EditableProperties }
  | { type: 'move-node'; id: string; position: { x: number; y: number } }
  | { type: 'delete-node'; id: string }
  | { type: 'connect'; id: string; source: string; handle: string; target: string }
  | { type: 'delete-edge'; id: string };

export function emptyWorkflow(id: string): Workflow {
  return {
    schemaVersion: 1,
    workflowId: id,
    title: t('Yeni iş akışı'),
    locale: getLocale(),
    inputs: [],
    nodes: [],
    edges: [],
  };
}

function newNode(edit: Extract<Edit, { type: 'add-node' }>): WorkflowNode {
  const base = { id: edit.id, label: t(NODE_LABELS[edit.kind]), position: edit.position };
  switch (edit.kind) {
    case 'start':
      return { ...base, type: 'start', config: {} };
    case 'approval':
      return { ...base, type: 'approval', config: { roleLabel: 'Onaylayan' } };
    // A schema-valid draft, not an executable condition, until a field is chosen in the panel.
    case 'condition':
      return {
        ...base,
        type: 'condition',
        config: { fieldKey: 'alan', operator: 'eq', value: '' },
      };
    case 'end':
      return { ...base, type: 'end', config: { outcome: 'completed' } };
  }
}

export function connectionError(
  workflow: Workflow,
  sourceId: string,
  handle: string,
  targetId: string,
): string | null {
  if (workflow.edges.length >= WORKFLOW_LIMITS.edges)
    return t('En fazla 100 bağlantı eklenebilir.');
  const source = workflow.nodes.find((node) => node.id === sourceId);
  const target = workflow.nodes.find((node) => node.id === targetId);
  if (!source || !target) return t('Kaynak ve hedef adımı seçin.');
  if (sourceId === targetId) return t('Bir adım kendisine bağlanamaz.');
  if (target.type === 'start') return t('Başlangıç adımına bağlantı kurulamaz.');
  if (!(NODE_HANDLES[source.type] as readonly string[]).includes(handle))
    return t('Bu adım için geçerli bir çıkış seçin.');
  if (workflow.edges.some((edge) => edge.sourceNodeId === sourceId && edge.sourceHandle === handle))
    return t('Bu çıkış zaten bağlı. Önce mevcut bağlantıyı silin.');
  const pending = [targetId];
  const visited = new Set<string>();
  while (pending.length) {
    const id = pending.pop();
    if (!id || visited.has(id)) continue;
    if (id === sourceId) return t('Bu bağlantı bir döngü oluşturur.');
    visited.add(id);
    for (const edge of workflow.edges)
      if (edge.sourceNodeId === id) pending.push(edge.targetNodeId);
  }
  return null;
}

export function applyEdit(
  workflow: Workflow,
  edit: Edit,
): { workflow: Workflow; error: string | null } {
  if (edit.type === 'save-input' || edit.type === 'delete-input') return editInput(workflow, edit);
  if (edit.type === 'update-condition') return editCondition(workflow, edit);
  const reject = (error: string) => ({ workflow, error });
  let candidate: Workflow = workflow;
  switch (edit.type) {
    case 'add-node':
      if (workflow.nodes.length >= WORKFLOW_LIMITS.nodes)
        return reject(t('En fazla 50 adım eklenebilir.'));
      if (workflow.nodes.some((node) => node.id === edit.id))
        return reject(t('Adım kimliği zaten kullanılıyor.'));
      if (edit.kind === 'start' && workflow.nodes.some((node) => node.type === 'start'))
        return reject(t('Yalnızca bir başlangıç adımı eklenebilir.'));
      candidate = { ...workflow, nodes: [...workflow.nodes, newNode(edit)] };
      break;
    case 'rename-node':
      candidate = {
        ...workflow,
        nodes: workflow.nodes.map((node) =>
          node.id === edit.id ? { ...node, label: edit.label } : node,
        ),
      };
      break;
    case 'update-properties': {
      const node = workflow.nodes.find((item) => item.id === edit.id);
      if (!node) return reject(t('Düzenlenecek adım bulunamadı.'));
      if (node.type !== edit.properties.type) return reject(t('Adım türü değiştirilemez.'));
      candidate = {
        ...workflow,
        nodes: workflow.nodes.map((item) =>
          item.id === edit.id ? { ...item, ...edit.properties, label: edit.label } : item,
        ),
      };
      break;
    }
    case 'move-node':
      candidate = {
        ...workflow,
        nodes: workflow.nodes.map((node) =>
          node.id === edit.id ? { ...node, position: { ...edit.position } } : node,
        ),
      };
      break;
    case 'delete-node':
      candidate = {
        ...workflow,
        nodes: workflow.nodes.filter((node) => node.id !== edit.id),
        edges: workflow.edges.filter(
          (edge) => edge.sourceNodeId !== edit.id && edge.targetNodeId !== edit.id,
        ),
      };
      break;
    case 'connect': {
      const error = connectionError(workflow, edit.source, edit.handle, edit.target);
      if (error) return reject(error);
      if (workflow.edges.some((edge) => edge.id === edit.id))
        return reject(t('Bağlantı kimliği zaten kullanılıyor.'));
      const edge: WorkflowEdge = {
        id: edit.id,
        sourceNodeId: edit.source,
        sourceHandle: edit.handle as WorkflowEdge['sourceHandle'],
        targetNodeId: edit.target,
      };
      candidate = { ...workflow, edges: [...workflow.edges, edge] };
      break;
    }
    case 'delete-edge':
      candidate = { ...workflow, edges: workflow.edges.filter((edge) => edge.id !== edit.id) };
      break;
  }
  // Never carry a stale derived hash into an edited document.
  candidate = { ...candidate };
  delete candidate.contentHash;
  const parsed = parseWorkflow(candidate);
  return parsed.success
    ? { workflow: parsed.data, error: null }
    : reject(
        edit.type === 'update-properties'
          ? t(
              'Değişiklik uygulanmadı: ad ve rol boş olamaz, en fazla 120 karakter olabilir; açıklama en fazla {text} karakter olmalı, bitiş sonucu geçerli olmalıdır.',
              { text: WORKFLOW_LIMITS.text },
            )
          : t(
              'Değişiklik geçersiz: etiket boş olamaz, en fazla 120 karakter olmalıdır; belge limitleri korunmalıdır.',
            ),
      );
}

export type EditorState = {
  workflow: Workflow;
  nodeId: string | null;
  edgeId: string | null;
  error: string | null;
};
export type EditorAction =
  | Edit
  | { type: 'select-node'; id: string | null }
  | { type: 'select-edge'; id: string | null }
  | { type: 'replace-workflow'; workflow: Workflow };
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  // Callers pass an already parsed document, e.g. another tab's saved draft.
  if (action.type === 'replace-workflow')
    return { workflow: action.workflow, nodeId: null, edgeId: null, error: null };
  if (action.type === 'select-node')
    return { ...state, nodeId: action.id, edgeId: null, error: null };
  if (action.type === 'select-edge')
    return { ...state, edgeId: action.id, nodeId: null, error: null };
  const result = applyEdit(state.workflow, action);
  if (result.error) return { ...state, error: result.error };
  return {
    ...result,
    nodeId:
      action.type === 'add-node'
        ? action.id
        : result.workflow.nodes.some((node) => node.id === state.nodeId)
          ? state.nodeId
          : null,
    edgeId:
      action.type === 'add-node'
        ? null
        : result.workflow.edges.some((edge) => edge.id === state.edgeId)
          ? state.edgeId
          : null,
  };
}
