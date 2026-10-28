import { useState } from 'react';
import {
  WORKFLOW_LIMITS,
  type InputField,
  type WorkflowNode,
} from '@workflow-builder/workflow-contract';
import { INPUT_LABELS } from './input-draft';
import { OPERATOR_LABELS, operatorsFor, type Operator } from './condition-model';
import { t } from '../i18n/i18n';

type ConditionNode = Extract<WorkflowNode, { type: 'condition' }>;

function ValueInput({
  field,
  operator,
  initial,
}: {
  field: InputField;
  operator: Operator;
  initial: ConditionNode['config']['value'] | undefined;
}) {
  if (field.type === 'enum' && operator === 'in') {
    const checked = Array.isArray(initial) ? initial : [];
    return (
      <fieldset className="condition-options">
        <legend>{t('Karşılaştırma değerleri')}</legend>
        {field.options.map((option) => (
          <label key={option} className="checkbox-label">
            <input
              type="checkbox"
              name="value"
              value={option}
              defaultChecked={checked.includes(option)}
            />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }
  if (field.type === 'enum' || field.type === 'boolean')
    return (
      <label htmlFor="condition-value">
        {t('Karşılaştırma değeri')}
        <select
          id="condition-value"
          name="value"
          defaultValue={
            initial === undefined || Array.isArray(initial)
              ? field.type === 'enum'
                ? field.options[0]
                : 'true'
              : String(initial)
          }
        >
          {field.type === 'enum' ? (
            field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))
          ) : (
            <>
              <option value="true">{t('Doğru')}</option>
              <option value="false">{t('Yanlış')}</option>
            </>
          )}
        </select>
      </label>
    );
  return (
    <label>
      {t('Karşılaştırma değeri')}
      <input
        name="value"
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        step="any"
        required={field.type !== 'string'}
        maxLength={WORKFLOW_LIMITS.text}
        defaultValue={initial === undefined || Array.isArray(initial) ? '' : String(initial)}
      />
    </label>
  );
}

// Field and operator are controlled so the value control always matches the field type.
export function ConditionFields({ node, inputs }: { node: ConditionNode; inputs: InputField[] }) {
  const saved = inputs.find((field) => field.key === node.config.fieldKey);
  const [fieldKey, setFieldKey] = useState(saved?.key ?? inputs[0]?.key ?? '');
  const field = inputs.find((item) => item.key === fieldKey);
  const operators = field ? operatorsFor(field) : [];
  const [chosen, setChosen] = useState<Operator>(node.config.operator);
  const operator = operators.includes(chosen) ? chosen : (operators[0] ?? chosen);
  if (!field)
    return (
      <p className="muted">
        {t('Koşul kurmak için önce aşağıdaki “Giriş alanları” bölümünden bir alan ekleyin.')}
      </p>
    );
  const unchanged = field.key === saved?.key && operator === node.config.operator;
  return (
    <>
      {!saved && (
        <p className="muted">
          {t('Bu koşul henüz tanımlı bir alana bağlı değil. Alanı seçip uygulayın.')}
        </p>
      )}
      <label htmlFor="condition-field">
        {t('Karşılaştırılacak alan')}
        <select
          id="condition-field"
          name="fieldKey"
          value={field.key}
          onChange={(event) => setFieldKey(event.target.value)}
        >
          {inputs.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label} ({t(INPUT_LABELS[item.type])})
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="condition-operator">
        {t('Karşılaştırma')}
        <select
          id="condition-operator"
          name="operator"
          value={operator}
          onChange={(event) => setChosen(event.target.value as Operator)}
        >
          {operators.map((item) => (
            <option key={item} value={item}>
              {t(OPERATOR_LABELS[item])}
            </option>
          ))}
        </select>
      </label>
      <ValueInput
        key={`${field.key}:${operator}`}
        field={field}
        operator={operator}
        initial={unchanged ? node.config.value : undefined}
      />
      <p className="muted">{t('Koşul sağlanırsa “Doğru”, sağlanmazsa “Yanlış” çıkışı izlenir.')}</p>
    </>
  );
}
