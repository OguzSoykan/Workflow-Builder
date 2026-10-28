import { useEffect, useState, type Dispatch } from 'react';
import type { EditorAction } from '../editor/model';
import { fetchLimits, generateWorkflow, type AiLimits, type Proposal } from './ai-api';
import type { Account } from './use-account';

const MAX_PROMPT = 2000;

export function AiPanel({
  account,
  dispatch,
}: {
  account: Account;
  dispatch: Dispatch<EditorAction>;
}) {
  const [limits, setLimits] = useState<AiLimits | null>(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const signedIn = Boolean(account.configured && account.session);
  const { token } = account;

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void token().then(async (idToken) => {
      const next = idToken ? await fetchLimits(idToken) : null;
      if (active) setLimits(next);
    });
    return () => {
      active = false;
    };
  }, [signedIn, token, proposal]);

  if (!signedIn) return null;
  const available = limits?.aiEnabled === true && limits.memberRemaining > 0;
  return (
    <section className="ai-panel" aria-label="AI ile oluştur">
      <h2 className="list-heading">AI ile oluştur</h2>
      {!limits ? (
        <p className="muted">AI durumu yükleniyor…</p>
      ) : !limits.aiEnabled ? (
        <p className="muted">AI şu an kullanılamıyor. Akışı elle düzenleyebilirsiniz.</p>
      ) : (
        <p className="muted">
          Bugün kalan AI hakkı: {limits.memberRemaining}.
          {limits.budgetState === 'low' ? ' Genel AI bütçesi azalıyor.' : ''}
        </p>
      )}
      <label>
        Süreci anlatın
        <textarea
          maxLength={MAX_PROMPT}
          value={prompt}
          disabled={!available || busy}
          placeholder="Örn. 10.000 TL üzeri satın almalar yönetici onayına gitsin."
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <p className="muted">
        {prompt.length} / {MAX_PROMPT}. Öneri onaylamadan taslağınızı değiştirmez.
      </p>
      <button
        type="button"
        className="secondary"
        disabled={!available || busy || !prompt.trim()}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          setProposal(null);
          const idToken = await token();
          const result = idToken
            ? await generateWorkflow(idToken, prompt.trim(), `ui_${crypto.randomUUID()}`)
            : { ok: false as const, message: 'Oturum geçersiz. Tekrar giriş yapın.' };
          setBusy(false);
          if (result.ok) setProposal(result.proposal);
          else setMessage({ kind: 'error', text: result.message });
        }}
      >
        {busy ? 'Öneri hazırlanıyor…' : 'Akış öner'}
      </button>
      {proposal && (
        <div className="import-confirm" role="group" aria-label="AI önerisi">
          <p>
            <strong>{proposal.workflow.title}</strong>
          </p>
          <p className="muted">
            {proposal.workflow.nodes.length} adım · {proposal.workflow.edges.length} bağlantı ·{' '}
            {proposal.workflow.inputs.length} alan
            {proposal.issueCount
              ? ` · ${proposal.issueCount} doğrulama sorunu`
              : ' · çalıştırılabilir'}
          </p>
          <ul className="ai-steps" aria-label="Önerilen adımlar">
            {proposal.workflow.nodes.map((node) => (
              <li key={node.id}>{node.label}</li>
            ))}
          </ul>
          <p className="muted">
            Uygularsanız mevcut taslağın yerine geçer; “Geri al” ile dönebilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'replace-workflow', workflow: proposal.workflow });
              setProposal(null);
              setMessage({ kind: 'info', text: 'AI önerisi taslağa uygulandı.' });
            }}
          >
            Taslağa uygula
          </button>{' '}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setProposal(null);
              setMessage({ kind: 'info', text: 'Öneri reddedildi; taslağınız değişmedi.' });
            }}
          >
            Reddet
          </button>
        </div>
      )}
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    </section>
  );
}
