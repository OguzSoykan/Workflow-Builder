import type { Workflow, WorkflowEdge, WorkflowNode } from '@workflow-builder/workflow-contract';
import { getLocale, t } from '../i18n/i18n';

// Synthetic sample flows (WB-011, D-14), built in the current UI language (FR-11).
// Thresholds are ordinary condition settings the user can edit.
export type ExampleId = 'purchase' | 'leave' | 'expense';
export const EXAMPLE_LABELS: Record<ExampleId, string> = {
  purchase: 'Satın alma talebi',
  leave: 'İzin talebi',
  expense: 'Masraf iadesi',
};

const at = (x: number, y: number) => ({ x: x * 300 + 40, y: y * 170 + 40 });
const start = (x: number, y: number): WorkflowNode => ({
  id: 'start',
  label: t('Başlangıç'),
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
  locale: getLocale(),
});

const EXAMPLES: Record<ExampleId, () => Workflow> = {
  purchase: () => ({
    ...base(t('Satın alma talebi'), t('10.000 üzeri talepler yönetici onayına gider.')),
    inputs: [
      { key: 'tutar', label: t('Tutar'), type: 'number', required: true, validation: { min: 0 } },
      {
        key: 'kategori',
        label: t('Kategori'),
        type: 'enum',
        required: false,
        options: [t('Donanım'), t('Yazılım'), t('Hizmet')],
      },
    ],
    nodes: [
      start(0, 0),
      {
        id: 'tutar-kontrol',
        label: t('Tutar kontrolü'),
        type: 'condition',
        position: at(1, 0),
        config: { fieldKey: 'tutar', operator: 'gt', value: 10000 },
      },
      approval('yonetici', t('Yönetici onayı'), t('Yönetici'), 2, 0),
      end('tamamlandi', t('Satın alma onaylandı'), 'completed', 3, 1),
      end('reddedildi', t('Satın alma reddedildi'), 'rejected', 3, 0),
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
    ...base(t('İzin talebi'), t('5 günü aşan izinler yönetici ve İK onayından geçer.')),
    inputs: [
      {
        key: 'gun',
        label: t('Gün sayısı'),
        type: 'number',
        required: true,
        validation: { min: 1, max: 30 },
      },
      {
        key: 'izin_turu',
        label: t('İzin türü'),
        type: 'enum',
        required: true,
        options: [t('Yıllık'), t('Mazeret'), t('Hastalık')],
      },
      { key: 'baslangic', label: t('Başlangıç tarihi'), type: 'date', required: false },
    ],
    nodes: [
      start(0, 0),
      {
        id: 'sure-kontrol',
        label: t('Süre kontrolü'),
        type: 'condition',
        position: at(1, 0),
        config: { fieldKey: 'gun', operator: 'gt', value: 5 },
      },
      approval('yonetici', t('Yönetici onayı'), t('Yönetici'), 2, 0),
      approval('ik', t('İK onayı'), t('İnsan kaynakları'), 3, 0),
      approval('ekip-lideri', t('Ekip lideri onayı'), t('Ekip lideri'), 2, 1),
      end('onaylandi', t('İzin onaylandı'), 'completed', 4, 1),
      end('reddedildi', t('İzin reddedildi'), 'rejected', 4, 0),
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
    ...base(
      t('Masraf iadesi'),
      t('Faturasız masraf reddedilir; 2.500 ve üzeri finans onayı ister.'),
    ),
    inputs: [
      { key: 'fatura', label: t('Fatura var mı'), type: 'boolean', required: true },
      { key: 'tutar', label: t('Tutar'), type: 'number', required: true, validation: { min: 0 } },
      {
        key: 'aciklama',
        label: t('Açıklama'),
        type: 'string',
        required: false,
        validation: { maxLength: 200 },
      },
    ],
    nodes: [
      start(0, 0),
      {
        id: 'fatura-kontrol',
        label: t('Fatura kontrolü'),
        type: 'condition',
        position: at(1, 0),
        config: { fieldKey: 'fatura', operator: 'eq', value: true },
      },
      {
        id: 'tutar-kontrol',
        label: t('Tutar kontrolü'),
        type: 'condition',
        position: at(2, 0),
        config: { fieldKey: 'tutar', operator: 'gte', value: 2500 },
      },
      approval('finans', t('Finans onayı'), t('Finans'), 3, 0),
      end('odendi', t('Masraf ödendi'), 'completed', 4, 1),
      end('reddedildi', t('Masraf reddedildi'), 'rejected', 4, 0),
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
