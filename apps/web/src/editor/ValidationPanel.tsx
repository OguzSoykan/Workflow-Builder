import type { Dispatch } from 'react';
import type { DescribedIssue } from './validation-messages';
import type { EditorAction } from './model';
import { t } from '../i18n/i18n';

export function ValidationPanel({
  issues,
  dispatch,
}: {
  issues: DescribedIssue[];
  dispatch: Dispatch<EditorAction>;
}) {
  return (
    <section className="validation-panel" aria-label={t('Doğrulama')}>
      <h3>{t('Doğrulama')}</h3>
      {issues.length === 0 ? (
        <p className="validation-ok">{t('Akış çalıştırılabilir; doğrulama sorunu yok.')}</p>
      ) : (
        <>
          <p className="muted">
            {t(
              '{count} sorun · Taslak kaydedilir, ancak sorunlar giderilmeden çalıştırılamaz. İlgili adımı seçmek için bir soruna tıklayın.',
              { count: issues.length },
            )}
          </p>
          <ul aria-label={t('Doğrulama sorunları')}>
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
