import { useState, type Dispatch } from 'react';
import { EXAMPLE_LABELS, exampleWorkflow, type ExampleId } from './examples';
import type { EditorAction } from './model';
import { t } from '../i18n/i18n';

// Loading replaces the draft like an import: confirmed first and undoable in this session.
export function ExamplesPanel({ dispatch }: { dispatch: Dispatch<EditorAction> }) {
  const [pending, setPending] = useState<ExampleId | null>(null);
  return (
    <section className="examples" aria-label={t('Örnekten başla')}>
      <h2 className="list-heading">{t('Örnekten başla')}</h2>
      <div className="example-buttons">
        {(Object.keys(EXAMPLE_LABELS) as ExampleId[]).map((id) => (
          <button key={id} type="button" className="secondary" onClick={() => setPending(id)}>
            {t(EXAMPLE_LABELS[id])}
          </button>
        ))}
      </div>
      {pending && (
        <div className="import-confirm" role="group" aria-label={t('Örnek yükleme onayı')}>
          <p>
            <strong>{t(EXAMPLE_LABELS[pending])}</strong>{' '}
            {t('örneği mevcut taslağın yerine geçecek. Bu oturumda “Geri al” ile dönebilirsiniz.')}
          </p>
          <button
            type="button"
            onClick={() => {
              dispatch({
                type: 'replace-workflow',
                workflow: exampleWorkflow(pending, `workflow_${crypto.randomUUID()}`),
              });
              setPending(null);
            }}
          >
            {t('Örneği yükle')}
          </button>{' '}
          <button type="button" className="secondary" onClick={() => setPending(null)}>
            {t('Vazgeç')}
          </button>
        </div>
      )}
    </section>
  );
}
