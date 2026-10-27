import { useMemo, useState } from 'react';
import type { Workflow } from '@workflow-builder/workflow-contract';
import {
  CloudApi,
  knownRevision,
  rememberRevision,
  type RevisionMeta,
  type SaveOutcome,
} from './cloud-api';
import type { Account } from './use-account';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const SOURCE_LABELS: Record<string, string> = {
  manual: 'Elle kayıt',
  import: 'İçe aktarma',
  restore: 'Geri yükleme',
};

// D-06: an explicit, confirmed copy to the cloud; the local draft is never changed or removed.
export function CloudPanel({
  workflow,
  executable,
  account,
}: {
  workflow: Workflow;
  executable: boolean;
  account: Account;
}) {
  const [confirming, setConfirming] = useState(false);
  const [conflict, setConflict] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [revisions, setRevisions] = useState<RevisionMeta[] | null>(null);
  const api = useMemo(() => new CloudApi(account.token), [account.token]);
  if (!account.configured || !account.session) return null;
  const uid = account.session.uid;
  const known = knownRevision(storage(), uid, workflow.workflowId);

  const finish = async (outcome: SaveOutcome) => {
    setBusy(false);
    setConfirming(false);
    if (outcome.kind === 'saved') {
      rememberRevision(storage(), uid, workflow.workflowId, outcome.revision);
      setConflict(null);
      setMessage({
        kind: 'info',
        text: `Buluta kaydedildi (sürüm ${outcome.revision}). Yerel taslağınız da duruyor.`,
      });
      setRevisions(await api.revisions(workflow.workflowId));
    } else if (outcome.kind === 'conflict') {
      setConflict(outcome.currentRevision);
      setMessage(null);
    } else setMessage({ kind: 'error', text: outcome.message });
  };
  const save = async (action: () => Promise<SaveOutcome>) => {
    setBusy(true);
    setMessage(null);
    await finish(await action());
  };

  return (
    <section className="cloud" aria-label="Bulut kaydı">
      <h2 className="list-heading">Bulut</h2>
      {account.profile && !account.profile.emailVerified ? (
        <p className="muted">Buluta kaydetmek için hesap menüsünden e-postanızı doğrulayın.</p>
      ) : !executable ? (
        <p className="muted">Yalnız doğrulama sorunu olmayan akışlar buluta kaydedilebilir.</p>
      ) : (
        <>
          <p className="muted">
            {known ? `Bu taslağın bulut sürümü: ${known}.` : 'Bu taslak henüz buluta kaydedilmedi.'}
          </p>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Buluta kaydet
          </button>
        </>
      )}
      {confirming && (
        <div className="import-confirm" role="group" aria-label="Bulut kaydı onayı">
          <p>
            “{workflow.title}” {known ? 'yeni bir bulut sürümü olarak' : 'hesabınıza kopya olarak'}{' '}
            kaydedilecek. Yerel taslak silinmez.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(() => api.save(workflow, known))}
          >
            Kaydet
          </button>{' '}
          <button type="button" className="secondary" onClick={() => setConfirming(false)}>
            Vazgeç
          </button>
        </div>
      )}
      {conflict !== null && (
        <div className="import-confirm" role="group" aria-label="Bulut çakışması">
          <p>
            Bulutta bu taslağın daha yeni bir sürümü var (sürüm {conflict}). Kaydederseniz bu
            tarayıcıdaki hali sürüm {conflict + 1} olur; eski sürümler silinmez.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(() => api.overwrite(workflow, conflict))}
          >
            Yine de kaydet
          </button>{' '}
          <button type="button" className="secondary" onClick={() => setConflict(null)}>
            Vazgeç
          </button>
        </div>
      )}
      {known !== null && revisions === null && (
        <button
          type="button"
          className="link-button"
          onClick={() => void api.revisions(workflow.workflowId).then(setRevisions)}
        >
          Bulut sürümlerini göster
        </button>
      )}
      {revisions && (
        <ol className="cloud-revisions" aria-label="Bulut sürümleri">
          {revisions.map((item) => (
            <li key={item.revision}>
              Sürüm {item.revision} · {SOURCE_LABELS[item.source] ?? item.source} ·{' '}
              {new Date(item.createdAt).toLocaleString('tr-TR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </li>
          ))}
        </ol>
      )}
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    </section>
  );
}
