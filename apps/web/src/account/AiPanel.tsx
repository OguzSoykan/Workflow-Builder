import { useEffect, useState, type Dispatch } from 'react';
import type { Workflow } from '@workflow-builder/workflow-contract';
import type { EditorAction } from '../editor/model';
import {
  diffText,
  editWorkflow,
  fetchLimits,
  generateWorkflow,
  proposalMatches,
  type AiLimits,
  type Proposal,
} from './ai-api';
import type { Account } from './use-account';

const MAX_PROMPT = 2000;

export function AiPanel({
  account,
  workflow,
  dispatch,
}: {
  account: Account;
  workflow: Workflow;
  dispatch: Dispatch<EditorAction>;
}) {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
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
      {workflow.nodes.length > 0 && (
        <div className="ai-mode" role="radiogroup" aria-label="AI modu">
          <label className="checkbox-label">
            <input
              type="radio"
              name="ai-mode"
              checked={mode === 'create'}
              onChange={() => setMode('create')}
            />
            Yeni akış oluştur
          </label>
          <label className="checkbox-label">
            <input
              type="radio"
              name="ai-mode"
              checked={mode === 'edit'}
              onChange={() => setMode('edit')}
            />
            Bu akışı düzenle
          </label>
        </div>
      )}
      <label>
        {mode === 'edit' && workflow.nodes.length
          ? 'İstediğiniz değişikliği anlatın'
          : 'Süreci anlatın'}
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
            ? mode === 'edit' && workflow.nodes.length
              ? await editWorkflow(idToken, prompt.trim(), workflow, `ui_${crypto.randomUUID()}`)
              : await generateWorkflow(idToken, prompt.trim(), `ui_${crypto.randomUUID()}`)
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
          {proposal.diff && <p className="ai-diff">Değişiklik: {diffText(proposal.diff)}</p>}
          <ul className="ai-steps" aria-label="Önerilen adımlar">
            {proposal.workflow.nodes.map((node) => (
              <li key={node.id}>{node.label}</li>
            ))}
          </ul>
          <p className="muted">
            Uygularsanız{' '}
            {proposal.diff ? 'değişiklikler taslağa işlenir' : 'mevcut taslağın yerine geçer'};
            “Geri al” ile dönebilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => {
              // An edit proposal applies only to the exact document it was made for (stale hash check).
              if (!proposalMatches(proposal, workflow)) {
                setProposal(null);
                setMessage({
                  kind: 'error',
                  text: 'Taslak öneriden sonra değişti; öneri uygulanmadı. Yeniden isteyin.',
                });
                return;
              }
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
