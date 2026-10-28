import {
  OPERATORS,
  WORKFLOW_LIMITS,
  parseWorkflow,
  type InputField,
  type Workflow,
  type WorkflowNode,
} from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';
import { t } from '../i18n/i18n';

type ConditionConfig = Extract<WorkflowNode, { type: 'condition' }>['config'];
export type Operator = ConditionConfig['operator'];
export type ConditionEdit = {
  type: 'update-condition';
  id: string;
  label: string;
  config: unknown;
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  eq: 'eşittir',
  neq: 'eşit değildir',
  gt: 'büyüktür',
  gte: 'büyük veya eşittir',
  lt: 'küçüktür',
  lte: 'küçük veya eşittir',
  contains: 'içerir',
  before: 'öncesindedir',
  after: 'sonrasındadır',
  in: 'şunlardan biridir',
};
const CONDITION_CODES = new Set([
  'INPUT_FIELD_MISSING',
  'OPERATOR_TYPE_MISMATCH',
  'CONDITION_VALUE_INVALID',
]);
const VALUE_MESSAGES: Record<InputField['type'], string> = {
  number: 'Karşılaştırma değeri bir sayı olmalıdır.',
  string: 'Karşılaştırma metni en fazla {max} karakter olabilir.',
  boolean: 'Doğru veya yanlış seçin.',
  date: 'Geçerli bir takvim tarihi girin.',
  enum: 'Değer alanın seçeneklerinden olmalıdır; “şunlardan biridir” için en az bir seçenek işaretleyin.',
};

export function operatorsFor(field: InputField): readonly Operator[] {
  return OPERATORS[field.type];
}

// Form values are strings; the field type decides the canonical JSON value.
export function conditionFromForm(data: FormData, field: InputField): unknown {
  const operator = String(data.get('operator') ?? '');
  const raw = String(data.get('value') ?? '');
  const value =
    field.type === 'enum' && operator === 'in'
      ? data.getAll('value').map(String)
      : field.type === 'number'
        ? raw.trim() === ''
          ? NaN
          : Number(raw)
        : field.type === 'boolean'
          ? raw === 'true'
          : raw;
  return { fieldKey: field.key, operator, value };
}

export function invalidConditionIds(workflow: Workflow): Set<string> {
  return new Set(
    validateWorkflow(workflow)
      .issues.filter((issue) => CONDITION_CODES.has(issue.code))
      .flatMap((issue) => (issue.nodeId ? [issue.nodeId] : [])),
  );
}

export function conditionSummary(workflow: Workflow, node: WorkflowNode): string | null {
  if (node.type !== 'condition') return null;
  const field = workflow.inputs.find((item) => item.key === node.config.fieldKey);
  if (!field) return null;
  const { operator, value } = node.config;
  const text = Array.isArray(value)
    ? value.join(', ')
    : typeof value === 'boolean'
      ? value
        ? t('Doğru')
        : t('Yanlış')
      : String(value);
  return `${field.label} ${t(OPERATOR_LABELS[operator])} ${text}`;
}

export function editCondition(
  workflow: Workflow,
  edit: ConditionEdit,
): { workflow: Workflow; error: string | null } {
  const reject = (error: string) => ({ workflow, error });
  const node = workflow.nodes.find((item) => item.id === edit.id);
  if (node?.type !== 'condition') return reject(t('Düzenlenecek koşul adımı bulunamadı.'));
  const value = (edit.config as { value?: unknown } | null)?.value;
  if (typeof value === 'number' && !Number.isFinite(value)) return reject(t(VALUE_MESSAGES.number));
  if (Array.isArray(value) && !value.length) return reject(t(VALUE_MESSAGES.enum));
  const candidate = {
    ...workflow,
    nodes: workflow.nodes.map((item) =>
      item.id === edit.id ? { ...item, label: edit.label, config: edit.config } : item,
    ),
  };
  delete candidate.contentHash;
  const parsed = parseWorkflow(candidate);
  if (!parsed.success)
    return reject(
      t(
        'Koşul uygulanmadı: ad boş olamaz (en fazla 120 karakter); alan, karşılaştırma ve değer geçerli olmalı, belge sınırları korunmalıdır.',
      ),
    );
  const issue = validateWorkflow(parsed.data).issues.find(
    (item) => item.nodeId === edit.id && CONDITION_CODES.has(item.code),
  );
  if (!issue) return { workflow: parsed.data, error: null };
  const field = parsed.data.inputs.find((item) => item.key === issue.fieldKey);
  return reject(
    issue.code === 'INPUT_FIELD_MISSING' || !field
      ? t('Koşul için tanımlı bir giriş alanı seçin.')
      : issue.code === 'OPERATOR_TYPE_MISMATCH'
        ? t('Seçilen karşılaştırma bu alan türüyle kullanılamaz.')
        : t(VALUE_MESSAGES[field.type], { max: WORKFLOW_LIMITS.text }),
  );
}
