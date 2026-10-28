import { useState } from 'react';
import {
  WORKFLOW_LIMITS,
  type InputField,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';
import { INPUT_LABELS, inputFromForm } from './input-draft';
import { editInput, inputReferences, type InputEdit } from './input-model';
import type { EditorAction } from './model';
import type { Dispatch } from 'react';
import { t } from '../i18n/i18n';

function FieldForm({
  field,
  save,
  cancel,
}: {
  field: InputField | undefined;
  save: (field: unknown) => void;
  cancel: () => void;
}) {
  const [type, setType] = useState<InputField['type']>(field?.type ?? 'string');
  const [hasDefault, setHasDefault] = useState(field?.defaultValue !== undefined);
  const initial = field?.type === type ? field : undefined;
  const validation = initial && 'validation' in initial ? initial.validation : undefined;
  const min =
    validation &&
    ('min' in validation
      ? validation.min
      : 'minLength' in validation
        ? validation.minLength
        : undefined);
  const max =
    validation &&
    ('max' in validation
      ? validation.max
      : 'maxLength' in validation
        ? validation.maxLength
        : undefined);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(inputFromForm(new FormData(event.currentTarget), type));
      }}
    >
      <h3>{field ? t('Alanı düzenle') : 'Yeni alan'}</h3>
      <p className="muted">
        {t('Değişiklikleri uygulamadan başka bir alan seçerseniz girişleriniz silinir.')}
      </p>
      <label>
        {t('Alan anahtarı')}
        <input name="key" required maxLength={64} defaultValue={field?.key ?? ''} />
      </label>
      <p className="muted">
        {t(
          'A–Z, a–z veya alt çizgiyle başlayın; devamında rakam da kullanabilirsiniz. Anahtar değişince bağlı koşullar güncellenir.',
        )}
      </p>
      <label>
        {t('Alan adı')}
        <input name="label" required maxLength={120} defaultValue={field?.label ?? ''} />
      </label>
      <label htmlFor="input-type">{t('Alan türü')}</label>
      <select
        id="input-type"
        value={type}
        onChange={(event) => {
          setType(event.target.value as InputField['type']);
          setHasDefault(false);
        }}
      >
        {Object.entries(INPUT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className="checkbox-label">
        <input type="checkbox" name="required" defaultChecked={field?.required ?? false} />
        {t('Zorunlu alan')}
      </label>
      <div key={type}>
        {type === 'enum' && (
          <label>
            {t('Seçenekler (her satıra bir seçenek)')}
            <textarea
              name="options"
              required
              maxLength={WORKFLOW_LIMITS.options * 121}
              defaultValue={initial?.type === 'enum' ? initial.options.join('\n') : ''}
            />
          </label>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="hasDefault"
            checked={hasDefault}
            onChange={(event) => setHasDefault(event.target.checked)}
          />
          {t('Varsayılan değer kullan')}
        </label>
        {hasDefault &&
          (type === 'boolean' ? (
            <>
              <label htmlFor="input-default">{t('Varsayılan değer')}</label>
              <select
                id="input-default"
                name="defaultValue"
                defaultValue={String(initial?.defaultValue ?? false)}
              >
                <option value="false">{t('Yanlış')}</option>
                <option value="true">{t('Doğru')}</option>
              </select>
            </>
          ) : (
            <label>
              {t('Varsayılan değer')}
              <input
                name="defaultValue"
                type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                step="any"
                required={type !== 'string'}
                maxLength={WORKFLOW_LIMITS.text}
                defaultValue={String(initial?.defaultValue ?? '')}
              />
            </label>
          ))}
        {(type === 'number' || type === 'string' || type === 'date') && (
          <>
            <label>
              {type === 'string' ? 'En az karakter' : t('Alt sınır')}
              <input
                name="min"
                type={type === 'date' ? 'date' : 'number'}
                step={type === 'string' ? '1' : 'any'}
                defaultValue={min ?? ''}
              />
            </label>
            <label>
              {type === 'string' ? 'En fazla karakter' : t('Üst sınır')}
              <input
                name="max"
                type={type === 'date' ? 'date' : 'number'}
                step={type === 'string' ? '1' : 'any'}
                defaultValue={max ?? ''}
              />
            </label>
          </>
        )}
      </div>
      <button type="submit">{t('Alanı uygula')}</button>{' '}
      <button type="button" onClick={cancel}>
        {t('Vazgeç')}
      </button>
    </form>
  );
}

export function InputFields({
  workflow,
  dispatch,
}: {
  workflow: Workflow;
  dispatch: Dispatch<EditorAction>;
}) {
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const perform = (action: InputEdit) => {
    const result = editInput(workflow, action);
    setError(result.error);
    if (result.error) return;
    dispatch(action);
    setEditing(undefined);
  };
  const issues = validateWorkflow(workflow).issues.filter((issue) => issue.fieldKey !== undefined);
  return (
    <section className="input-fields" aria-label={t('Giriş alanları')}>
      <h2>{t('Giriş alanları')}</h2>
      <p className="muted">
        {t('{count} / {max} alan · Koşullarda kullanılacak bilgileri tanımlayın.', {
          count: workflow.inputs.length,
          max: WORKFLOW_LIMITS.inputs,
        })}
      </p>
      <ul className="input-list" aria-label={t('Tanımlı alanlar')}>
        {workflow.inputs.map((field) => {
          const references = inputReferences(workflow, field.key);
          return (
            <li key={field.key}>
              <strong>{field.label}</strong> <code>{field.key}</code> ·{' '}
              {t(INPUT_LABELS[field.type])} · {field.required ? 'Zorunlu' : t('İsteğe bağlı')}
              <p className="muted">
                {references.length
                  ? t('Bağlı koşullar: {join}', {
                      join: references.map((node) => node.label).join(', '),
                    })
                  : t('Bağlı koşul yok.')}
              </p>
              {issues.some((issue) => issue.fieldKey === field.key) && (
                <p>{t('Bu alanı kullanan koşulun tür veya değer ayarını kontrol edin.')}</p>
              )}
              <button
                type="button"
                aria-label={t('{label} alanını düzenle', { label: field.label })}
                onClick={() => {
                  setEditing(field.key);
                  setError(null);
                }}
              >
                {t('Düzenle')}
              </button>{' '}
              <button
                type="button"
                className="danger"
                aria-label={t('{label} alanını sil', { label: field.label })}
                disabled={references.length > 0}
                onClick={() => perform({ type: 'delete-input', key: field.key })}
              >
                {t('Sil')}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={workflow.inputs.length >= WORKFLOW_LIMITS.inputs}
        onClick={() => {
          setEditing(null);
          setError(null);
        }}
      >
        {t('Alan ekle')}
      </button>
      {editing !== undefined && (
        <FieldForm
          key={editing === null ? 'create' : `edit:${editing}`}
          field={workflow.inputs.find((field) => field.key === editing)}
          save={(field) => perform({ type: 'save-input', originalKey: editing, field })}
          cancel={() => {
            setEditing(undefined);
            setError(null);
          }}
        />
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
