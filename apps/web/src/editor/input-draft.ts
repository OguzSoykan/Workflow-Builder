import type { InputField } from '@workflow-builder/workflow-contract';

export const INPUT_LABELS: Record<InputField['type'], string> = {
  number: 'Sayı',
  string: 'Metin',
  boolean: 'Doğru / yanlış',
  date: 'Tarih',
  enum: 'Seçenek listesi',
};

// Missing defaults are distinct from 0, false and the empty string.
export function inputFromForm(data: FormData, type: InputField['type']): unknown {
  const text = (key: string) => String(data.get(key) ?? '');
  const scalar = (value: string) =>
    type === 'number' || type === 'string' ? Number(value) : value;
  const hasDefault = data.has('hasDefault');
  const value = text('defaultValue');
  const defaultValue =
    type === 'number'
      ? value.trim() === ''
        ? NaN
        : Number(value)
      : type === 'boolean'
        ? value === 'true'
        : value;
  const min = text('min');
  const max = text('max');
  const validation = {
    ...(min === '' ? {} : { [type === 'string' ? 'minLength' : 'min']: scalar(min) }),
    ...(max === '' ? {} : { [type === 'string' ? 'maxLength' : 'max']: scalar(max) }),
  };
  return {
    key: text('key'),
    label: text('label'),
    type,
    required: data.has('required'),
    ...(hasDefault ? { defaultValue } : {}),
    ...(type === 'enum' ? { options: text('options').split('\n') } : {}),
    ...((type === 'number' || type === 'date' || type === 'string') &&
    Object.keys(validation).length
      ? { validation }
      : {}),
  };
}
