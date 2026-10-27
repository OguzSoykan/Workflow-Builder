import { parseWorkflow, type Workflow } from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';

export type InputEdit =
  | { type: 'save-input'; originalKey: string | null; field: unknown }
  | { type: 'delete-input'; key: string };

export function inputReferences(workflow: Workflow, key: string) {
  return workflow.nodes.filter((node) => node.type === 'condition' && node.config.fieldKey === key);
}

export function editInput(
  workflow: Workflow,
  edit: InputEdit,
): { workflow: Workflow; error: string | null } {
  const reject = (error: string) => ({ workflow, error });
  const key = edit.type === 'delete-input' ? edit.key : edit.originalKey;
  const original = workflow.inputs.find((field) => field.key === key);
  if (key !== null && !original) return reject('Düzenlenecek alan bulunamadı.');
  const references = key === null ? [] : inputReferences(workflow, key);
  if (edit.type === 'delete-input' && references.length)
    return reject('Bu alan koşullarda kullanılıyor. Silmeden önce bağlı koşulları düzenleyin.');
  const inputs =
    edit.type === 'delete-input'
      ? workflow.inputs.filter((field) => field.key !== key)
      : key === null
        ? [...workflow.inputs, edit.field]
        : workflow.inputs.map((field) => (field.key === key ? edit.field : field));
  const candidate = { ...workflow, inputs };
  delete candidate.contentHash;
  const parsed = parseWorkflow(candidate);
  if (!parsed.success) {
    const code = parsed.issues[0]?.code;
    const messages: Record<string, string> = {
      DUPLICATE_INPUT_KEY: 'Bu alan anahtarı zaten kullanılıyor.',
      GRAPH_LIMIT_EXCEEDED: 'En fazla 30 alan eklenebilir; belge boyutu sınırı da korunmalıdır.',
      INPUT_DEFAULT_INVALID:
        'Varsayılan değer alan türüne, seçeneklere ve sınırlara uygun olmalıdır.',
      INPUT_OPTIONS_INVALID: '1–100 benzersiz seçenek girin; her seçenek 1–120 karakter olmalıdır.',
      INPUT_VALIDATION_INVALID:
        'Alan sınırları geçersiz: alt sınır üst sınırı aşamaz; metin uzunluğu 0–1000 arasında tam sayı olmalıdır.',
    };
    return reject(
      messages[code ?? ''] ??
        'Alan geçersiz. Anahtar harf veya alt çizgiyle başlamalı, yalnız harf/rakam/alt çizgi içermeli ve en fazla 64 karakter olmalıdır. Ad boş olamaz (en fazla 120 karakter); değer ve sınırları kontrol edin.',
    );
  }
  if (edit.type === 'save-input' && original) {
    const field = parsed.data.inputs[workflow.inputs.indexOf(original)];
    if (!field) return reject('Düzenlenecek alan bulunamadı.');
    parsed.data.nodes = parsed.data.nodes.map((node) =>
      node.type === 'condition' && node.config.fieldKey === key
        ? { ...node, config: { ...node.config, fieldKey: field.key } }
        : node,
    );
    const shapeChanged =
      field.type !== original.type ||
      (field.type === 'enum' &&
        original.type === 'enum' &&
        JSON.stringify(field.options) !== JSON.stringify(original.options));
    if (
      shapeChanged &&
      validateWorkflow(parsed.data).issues.some(
        (issue) =>
          references.some((node) => node.id === issue.nodeId) &&
          (issue.code === 'OPERATOR_TYPE_MISMATCH' || issue.code === 'CONDITION_VALUE_INVALID'),
      )
    )
      return reject(
        'Değişiklik bağlı koşulu geçersiz kılıyor. Önce koşulu düzenleyin veya uyumlu bir tür/seçenek seçin.',
      );
  }
  const final = parseWorkflow(parsed.data);
  return final.success
    ? { workflow: final.data, error: null }
    : reject('Alan referansları güncellendiğinde belge sınırı aşılıyor; değişiklik uygulanmadı.');
}
