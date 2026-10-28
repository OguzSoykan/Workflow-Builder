import { useState, type Dispatch } from 'react';
import type { Workflow } from '@workflow-builder/workflow-contract';
import { exportWorkflow, importTooLarge, readImport, semanticIssueCount } from './transfer';
import type { EditorAction } from './model';
import { t } from '../i18n/i18n';

type Pending = { fileName: string; workflow: Workflow; hashMismatch: boolean; issueCount: number };
type Message = { kind: 'error' | 'info'; text: string };

// A bad file never touches the working copy; a valid one replaces it only after confirmation.
export function TransferPanel({
  workflow,
  dispatch,
}: {
  workflow: Workflow;
  dispatch: Dispatch<EditorAction>;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const issues = semanticIssueCount(workflow);
  return (
    <section className="transfer" aria-label={t('Dosya işlemleri')}>
      <h2 className="list-heading">{t('Dosya')}</h2>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          const result = exportWorkflow(workflow);
          if (!result.ok) {
            setMessage({ kind: 'error', text: result.error });
            return;
          }
          const url = URL.createObjectURL(new Blob([result.text], { type: 'application/json' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = result.fileName;
          link.click();
          URL.revokeObjectURL(url);
          setMessage({ kind: 'info', text: `${result.fileName} indirildi.` });
        }}
      >
        {t('JSON dışa aktar')}
      </button>
      {issues > 0 && (
        <p className="muted">
          {t(
            'Akışta {count} doğrulama sorunu var; taslak dışa aktarılabilir ama henüz çalıştırılamaz.',
            {
              count: issues,
            },
          )}
        </p>
      )}
      <label className="file-label">
        {t('JSON içe aktar')}
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            setPending(null);
            if (!file) return;
            if (importTooLarge(file.size)) {
              setMessage({ kind: 'error', text: t('Dosya 256 KiB sınırını aşıyor; okunmadı.') });
              return;
            }
            file.text().then(
              (text) => {
                const result = readImport(text);
                if (!result.ok) {
                  setMessage({
                    kind: 'error',
                    text: t('İçe aktarılamadı: {error}', { error: result.error }),
                  });
                  return;
                }
                setMessage(null);
                setPending({ fileName: file.name, ...result });
              },
              () => setMessage({ kind: 'error', text: t('Dosya okunamadı.') }),
            );
          }}
        />
      </label>
      {pending && (
        <div className="import-confirm" role="group" aria-label={t('İçe aktarma onayı')}>
          <p>
            <strong>{pending.fileName}</strong>{' '}
            {t(
              'mevcut taslağın yerine geçecek. Bu oturumda “Geri al” ile dönebilirsiniz; kalıcı yedek için önce dışa aktarın.',
            )}
          </p>
          {pending.issueCount > 0 && (
            <p className="muted">
              {t('Dosyada {count} doğrulama sorunu var; taslak olarak açılır.', {
                count: pending.issueCount,
              })}
            </p>
          )}
          {pending.hashMismatch && (
            <p className="muted">
              {t(
                'İçerik özeti eşleşmiyor; dosya elle değiştirilmiş olabilir. Özet yeniden hesaplanacak.',
              )}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'replace-workflow', workflow: pending.workflow });
              setPending(null);
              setMessage({
                kind: 'info',
                text: t('{fileName} içe aktarıldı.', { fileName: pending.fileName }),
              });
            }}
          >
            {t('Taslağı değiştir')}
          </button>{' '}
          <button type="button" className="secondary" onClick={() => setPending(null)}>
            {t('Vazgeç')}
          </button>
        </div>
      )}
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    </section>
  );
}
