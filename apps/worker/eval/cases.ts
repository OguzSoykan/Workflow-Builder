import type { Workflow } from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';

// D-13: synthetic prompts with measurable expectations; no personal or company data.
export interface EvalCase {
  id: string;
  prompt: string;
  /** Minimum count per node type in the proposal. */
  nodes: Partial<Record<Workflow['nodes'][number]['type'], number>>;
  /** Input field types that must exist. */
  inputs?: Workflow['inputs'][number]['type'][];
}

export const EVAL_CASES: EvalCase[] = [
  {
    id: 'purchase-threshold',
    prompt:
      '10.000 TL üzerindeki satın alma talepleri yönetici onayına gitsin, altı otomatik onaylansın.',
    nodes: { condition: 1, approval: 1, end: 2 },
    inputs: ['number'],
  },
  {
    id: 'leave-two-step',
    prompt:
      '5 günden uzun izinler önce yönetici sonra İK onayından geçsin; kısa izinleri ekip lideri onaylasın.',
    nodes: { condition: 1, approval: 3 },
    inputs: ['number'],
  },
  {
    id: 'expense-invoice',
    prompt: 'Masraf iadesinde fatura yoksa talep reddedilsin, fatura varsa finans onaylasın.',
    nodes: { condition: 1, approval: 1 },
    inputs: ['boolean'],
  },
  {
    id: 'simple-approval',
    prompt: 'Bir belge yalnızca müdür tarafından onaylanıp tamamlansın.',
    nodes: { approval: 1, end: 1 },
  },
  {
    id: 'department-route',
    prompt: 'Talep departmanı IT ise BT müdürü, Finans ise finans müdürü onaylasın.',
    nodes: { condition: 1, approval: 2 },
    inputs: ['enum'],
  },
  {
    id: 'date-deadline',
    prompt:
      'Teslim tarihi 2026-12-31 öncesindeyse proje yöneticisi onaylasın, sonrasındaysa reddedilsin.',
    nodes: { condition: 1, approval: 1 },
    inputs: ['date'],
  },
  {
    id: 'travel',
    prompt: 'Yurt dışı seyahat taleplerini önce yönetici sonra genel müdür onaylasın.',
    nodes: { approval: 2 },
  },
  {
    id: 'hiring',
    prompt:
      'Yeni personel alım talebi İK ve ardından genel müdür onayı gerektirsin; herhangi biri reddederse süreç reddedilsin.',
    nodes: { approval: 2, end: 2 },
  },
  {
    id: 'discount',
    prompt:
      'Yüzde 20 üzerindeki indirimler satış müdürü onayına gitsin, diğerleri doğrudan onaylansın.',
    nodes: { condition: 1, approval: 1 },
    inputs: ['number'],
  },
  {
    id: 'contract-amount',
    prompt:
      '1 milyon TL üzeri sözleşmeler hukuk ve finans onayından, altındakiler yalnızca hukuk onayından geçsin.',
    nodes: { condition: 1, approval: 2 },
    inputs: ['number'],
  },
  {
    id: 'it-access',
    prompt: 'Sistem erişim talebi yönetici onayı ve ardından BT güvenlik onayı alsın.',
    nodes: { approval: 2 },
  },
  {
    id: 'urgent-flag',
    prompt: 'Acil işaretli talepler direkt müdüre, acil olmayanlar önce ekip liderine gitsin.',
    nodes: { condition: 1, approval: 2 },
    inputs: ['boolean'],
  },
  {
    id: 'overtime',
    prompt: 'Haftalık 10 saati aşan fazla mesai talepleri İK onayına gitsin.',
    nodes: { condition: 1, approval: 1 },
    inputs: ['number'],
  },
  {
    id: 'supplier',
    prompt: 'Yeni tedarikçi kaydı satın alma ve kalite birimlerinin onayından geçsin.',
    nodes: { approval: 2 },
  },
  {
    id: 'refund-text',
    prompt:
      'İade gerekçesinde "hasarlı" kelimesi geçiyorsa kalite kontrol onayı istensin, yoksa müşteri hizmetleri onaylasın.',
    nodes: { condition: 1, approval: 2 },
    inputs: ['string'],
  },
  {
    id: 'budget-category',
    prompt:
      'Bütçe kategorisi Donanım veya Yazılım ise BT onayı, Hizmet ise satın alma onayı gereksin.',
    nodes: { condition: 1, approval: 2 },
    inputs: ['enum'],
  },
  {
    id: 'training',
    prompt: 'Eğitim talepleri yönetici onaylarsa tamamlansın, reddederse reddedilsin.',
    nodes: { approval: 1, end: 2 },
  },
  {
    id: 'asset-return',
    prompt: 'Zimmet iadesinde ekipman sağlam değilse BT incelemesi onayı gereksin.',
    nodes: { condition: 1, approval: 1 },
    inputs: ['boolean'],
  },
  {
    id: 'loan',
    prompt:
      '50.000 TL üzerindeki avans talepleri finans direktörüne, diğerleri finans uzmanına gitsin.',
    nodes: { condition: 1, approval: 2 },
    inputs: ['number'],
  },
  {
    id: 'publication',
    prompt: 'Basın bülteni önce kurumsal iletişim sonra hukuk onayıyla yayımlansın.',
    nodes: { approval: 2 },
  },
];

export interface CaseResult {
  id: string;
  passed: boolean;
  valid: boolean;
  reasons: string[];
}

/** Pass = executable (validator) and contains the expected node and input types. */
export function scoreCase(testCase: EvalCase, workflow: Workflow | null): CaseResult {
  if (!workflow) return { id: testCase.id, passed: false, valid: false, reasons: ['no-proposal'] };
  const reasons: string[] = [];
  const validation = validateWorkflow(workflow);
  if (!validation.valid) reasons.push(...validation.issues.map((issue) => `issue:${issue.code}`));
  for (const [type, minimum] of Object.entries(testCase.nodes)) {
    const count = workflow.nodes.filter((node) => node.type === type).length;
    if (count < (minimum ?? 0)) reasons.push(`nodes:${type}<${minimum}`);
  }
  for (const type of testCase.inputs ?? [])
    if (!workflow.inputs.some((field) => field.type === type)) reasons.push(`input:${type}`);
  return {
    id: testCase.id,
    passed: reasons.length === 0,
    valid: validation.valid,
    reasons: [...new Set(reasons)],
  };
}
