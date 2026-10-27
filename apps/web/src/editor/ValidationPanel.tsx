import type { Dispatch } from 'react';
import type { DescribedIssue } from './validation-messages';
import type { EditorAction } from './model';

export function ValidationPanel({
  issues,
  dispatch,
}: {
  issues: DescribedIssue[];
  dispatch: Dispatch<EditorAction>;
}) {
  return (
    <section className="validation-panel" aria-label="Doğrulama">
      <h3>Doğrulama</h3>
      {issues.length === 0 ? (
        <p className="validation-ok">Akış çalıştırılabilir; doğrulama sorunu yok.</p>
      ) : (
        <>
          <p className="muted">
            {issues.length} sorun · Taslak kaydedilir, ancak sorunlar giderilmeden çalıştırılamaz.
            İlgili adımı seçmek için bir soruna tıklayın.
          </p>
          <ul aria-label="Doğrulama sorunları">
            {issues.map(({ key, text, target }) => (
              <li key={key}>
                {target ? (
                  <button
                    type="button"
                    className="list-button"
                    onClick={() =>
                      dispatch({
                        type: target.kind === 'node' ? 'select-node' : 'select-edge',
                        id: target.id,
                      })
                    }
                  >
                    {text}
                  </button>
                ) : (
                  text
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
