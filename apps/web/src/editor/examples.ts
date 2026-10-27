import type { Workflow, WorkflowEdge, WorkflowNode } from '@workflow-builder/workflow-contract';

// Synthetic sample flows (WB-011, D-14). Thresholds are ordinary condition settings the user can edit.
export type ExampleId = 'purchase' | 'leave' | 'expense';
export const EXAMPLE_LABELS: Record<ExampleId, string> = {
  purchase: 'Satın alma talebi',
  leave: 'İzin talebi',
  expense: 'Masraf iadesi',
};

const at = (x: number, y: number) => ({ x: x * 300 + 40, y: y * 170 + 40 });
const start = (x: number, y: number): WorkflowNode => ({
  id: 'start',
  label: 'Başlangıç',
  type: 'start',
  position: at(x, y),
  config: {},
});
const approval = (
  id: string,
  label: string,
  roleLabel: string,
  x: number,
  y: number,
): WorkflowNode => ({
  id,
  label,
  type: 'approval',
  position: at(x, y),
  config: { roleLabel },
});
const end = (
  id: string,
  label: string,
  outcome: 'completed' | 'rejected',
  x: number,
  y: number,
): WorkflowNode => ({
  id,
  label,
  type: 'end',
  position: at(x, y),
  config: { outcome },
});
const edges = (...links: [string, WorkflowEdge['sourceHandle'], string][]): WorkflowEdge[] =>
  links.map(([sourceNodeId, sourceHandle, targetNodeId]) => ({
    id: `e-${sourceNodeId}-${sourceHandle}`,
    sourceNodeId,
    sourceHandle,
    targetNodeId,
  }));
const base = (title: string, description: string) => ({
  schemaVersion: 1 as const,
  workflowId: 'example',
  title,
  description,
  locale: 'tr' as const,
});

const EXAMPLES: Record<ExampleId, () => Workflow> = {
  purchase: () => ({
    ...base('Satın alma talebi', '10.000 üzeri talepler yönetici onayına gider.'),
    inputs: [
      { key: 'tutar', label: 'Tutar', type: 'number', required: true, validation: { min: 0 } },
      {
        key: 'kategori',
        label: 'Kategori',
        type: 'enum',
        required: false,
        options: ['Donanım', 'Yazılım', 'Hizmet'],
      },
    ],
    nodes: [
      start(0, 0),
      {
        id: 'tutar-kontrol',
        label: 'Tutar kontrolü',
        type: 'condition',
        position: at(1, 0),
        config: { fieldKey: 'tutar', operator: 'gt', value: 10000 },
      },
      approval('yonetici', 'Yönetici onayı', 'Yönetici', 2, 0),
      end('tamamlandi', 'Satın alma onaylandı', 'completed', 3, 1),
      end('reddedildi', 'Satın alma reddedildi', 'rejected', 3, 0),
    ],
    edges: edges(
      ['start', 'next', 'tutar-kontrol'],
      ['tutar-kontrol', 'true', 'yonetici'],
      ['tutar-kontrol', 'false', 'tamamlandi'],
      ['yonetici', 'approved', 'tamamlandi'],
      ['yonetici', 'rejected', 'reddedildi'],
    ),
  }),
  leave: () => ({
    ...base('İzin talebi', '5 günü aşan izinler yönetici ve İK onayından geçer.'),
    inputs: [
      {
        key: 'gun',
        label: 'Gün sayısı',
        type: 'number',
        required: true,
        validation: { min: 1, max: 30 },
      },
      {
        key: 'izin_turu',
        label: 'İzin türü',
        type: 'enum',
        required: true,
        options: ['Yıllık', 'Mazeret', 'Hastalık'],
      },
      { key: 'baslangic', label: 'Başlangıç tarihi', type: 'date', required: false },
    ],
    nodes: [
      start(0, 0),
      {
        id: 'sure-kontrol',
        label: 'Süre kontrolü',
        type: 'condition',
        position: at(1, 0),
        config: { fieldKey: 'gun', operator: 'gt', value: 5 },
      },
      approval('yonetici', 'Yönetici onayı', 'Yönetici', 2, 0),
      approval('ik', 'İK onayı', 'İnsan kaynakları', 3, 0),
      approval('ekip-lideri', 'Ekip lideri onayı', 'Ekip lideri', 2, 1),
      end('onaylandi', 'İzin onaylandı', 'completed', 4, 1),
      end('reddedildi', 'İzin reddedildi', 'rejected', 4, 0),
    ],
    edges: edges(
      ['start', 'next', 'sure-kontrol'],
      ['sure-kontrol', 'true', 'yonetici'],
      ['sure-kontrol', 'false', 'ekip-lideri'],
      ['yonetici', 'approved', 'ik'],
      ['yonetici', 'rejected', 'reddedildi'],
      ['ik', 'approved', 'onaylandi'],
      ['ik', 'rejected', 'reddedildi'],
      ['ekip-lideri', 'approved', 'onaylandi'],
      ['ekip-lideri', 'rejected', 'reddedildi'],
    ),
  }),
  expense: () => ({
    ...base('Masraf iadesi', 'Faturasız masraf reddedilir; 2.500 ve üzeri finans onayı ister.'),
    inputs: [
      { key: 'fatura', label: 'Fatura var mı', type: 'boolean', required: true },
      { key: 'tutar', label: 'Tutar', type: 'number', required: true, validation: { min: 0 } },
      {
        key: 'aciklama',
        label: 'Açıklama',
        type: 'string',
        required: false,
        validation: { maxLength: 200 },
      },
    ],
    nodes: [
      start(0, 0),
      {
        id: 'fatura-kontrol',
        label: 'Fatura kontrolü',
        type: 'condition',
        position: at(1, 0),
        config: { fieldKey: 'fatura', operator: 'eq', value: true },
      },
      {
        id: 'tutar-kontrol',
        label: 'Tutar kontrolü',
        type: 'condition',
        position: at(2, 0),
        config: { fieldKey: 'tutar', operator: 'gte', value: 2500 },
      },
      approval('finans', 'Finans onayı', 'Finans', 3, 0),
      end('odendi', 'Masraf ödendi', 'completed', 4, 1),
      end('reddedildi', 'Masraf reddedildi', 'rejected', 4, 0),
    ],
    edges: edges(
      ['start', 'next', 'fatura-kontrol'],
      ['fatura-kontrol', 'true', 'tutar-kontrol'],
      ['fatura-kontrol', 'false', 'reddedildi'],
      ['tutar-kontrol', 'true', 'finans'],
      ['tutar-kontrol', 'false', 'odendi'],
      ['finans', 'approved', 'odendi'],
      ['finans', 'rejected', 'reddedildi'],
    ),
  }),
};

/** A fresh copy with its own workflow ID, so each loaded example is a separate draft. */
export function exampleWorkflow(id: ExampleId, workflowId: string): Workflow {
  return { ...EXAMPLES[id](), workflowId };
}
