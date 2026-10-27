import { useState, type Dispatch } from 'react';
import { EXAMPLE_LABELS, exampleWorkflow, type ExampleId } from './examples';
import type { EditorAction } from './model';

// Loading replaces the draft like an import: confirmed first and undoable in this session.
export function ExamplesPanel({ dispatch }: { dispatch: Dispatch<EditorAction> }) {
  const [pending, setPending] = useState<ExampleId | null>(null);
  return (
    <section className="examples" aria-label="Örnekten başla">
      <h2 className="list-heading">Örnekten başla</h2>
      <div className="example-buttons">
        {(Object.keys(EXAMPLE_LABELS) as ExampleId[]).map((id) => (
          <button key={id} type="button" className="secondary" onClick={() => setPending(id)}>
            {EXAMPLE_LABELS[id]}
          </button>
        ))}
      </div>
      {pending && (
        <div className="import-confirm" role="group" aria-label="Örnek yükleme onayı">
          <p>
            <strong>{EXAMPLE_LABELS[pending]}</strong> örneği mevcut taslağın yerine geçecek. Bu
            oturumda “Geri al” ile dönebilirsiniz.
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
            Örneği yükle
          </button>{' '}
          <button type="button" className="secondary" onClick={() => setPending(null)}>
            Vazgeç
          </button>
        </div>
      )}
    </section>
  );
}
