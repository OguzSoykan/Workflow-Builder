import { useEffect, useId, useState, type Dispatch } from 'react';
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
import type { AuthMode } from './AccountPanel';
import { t } from '../i18n/i18n';

const MAX_PROMPT = 2000;

export function AiPanel({
  account,
  workflow,
  dispatch,
  onAuth,
}: {
  account: Account;
  workflow: Workflow;
  dispatch: Dispatch<EditorAction>;
  onAuth: (mode: AuthMode) => void;
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

  if (!signedIn) return <LockedAiPanel configured={account.configured} onAuth={onAuth} />;
  if (account.profile && !account.profile.emailVerified)
    return (
      <section className="ai-panel" aria-label={t('AI ile oluştur')}>
        <h2 className="list-heading">{t('AI ile oluştur')}</h2>
        <div className="ai-cta">
          <p>{t('AI ile oluşturmak için önce e-postanı doğrula.')}</p>
          <button type="button" onClick={() => onAuth('signin')}>
            {t('Doğrulama adımlarını göster')}
          </button>
        </div>
      </section>
    );
  const available = limits?.aiEnabled === true && limits.memberRemaining > 0;
  return (
    <section className="ai-panel" aria-label={t('AI ile oluştur')}>
      <h2 className="list-heading">{t('AI ile oluştur')}</h2>
      {!limits ? (
        <p className="muted">{t('AI durumu yükleniyor…')}</p>
      ) : !limits.aiEnabled ? (
        <p className="muted">{t('AI şu an kullanılamıyor. Akışı elle düzenleyebilirsiniz.')}</p>
      ) : (
        <p className="muted">
          {t('Bugün kalan AI hakkı: {count}.', { count: limits.memberRemaining })}
          {limits.budgetState === 'low' ? t(' Genel AI bütçesi azalıyor.') : ''}
        </p>
      )}
      {workflow.nodes.length > 0 && (
        <div className="ai-mode" role="radiogroup" aria-label={t('AI modu')}>
          <label className="checkbox-label">
            <input
              type="radio"
              name="ai-mode"
              checked={mode === 'create'}
              onChange={() => setMode('create')}
            />
            {t('Yeni akış oluştur')}
          </label>
          <label className="checkbox-label">
            <input
              type="radio"
              name="ai-mode"
              checked={mode === 'edit'}
              onChange={() => setMode('edit')}
            />
            {t('Bu akışı düzenle')}
          </label>
        </div>
      )}
      <label>
        {mode === 'edit' && workflow.nodes.length
          ? t('İstediğiniz değişikliği anlatın')
          : t('Süreci anlatın')}
        <textarea
          maxLength={MAX_PROMPT}
          value={prompt}
          disabled={!available || busy}
          placeholder={t('Örn. 10.000 TL üzeri satın almalar yönetici onayına gitsin.')}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <p className="muted">
        {t('{length} / {max}. Öneri onaylamadan taslağınızı değiştirmez.', {
          length: prompt.length,
          max: MAX_PROMPT,
        })}
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
            : { ok: false as const, message: t('Oturum geçersiz. Tekrar giriş yapın.') };
          setBusy(false);
          if (result.ok) setProposal(result.proposal);
          else setMessage({ kind: 'error', text: result.message });
        }}
      >
        {busy ? t('Öneri hazırlanıyor…') : t('Akış öner')}
      </button>
      {proposal && (
        <div className="import-confirm" role="group" aria-label={t('AI önerisi')}>
          <p>
            <strong>{proposal.workflow.title}</strong>
          </p>
          <p className="muted">
            {t('{nodes} adım · {edges} bağlantı · {inputs} alan', {
              nodes: proposal.workflow.nodes.length,
              edges: proposal.workflow.edges.length,
              inputs: proposal.workflow.inputs.length,
            })}
            {proposal.issueCount
              ? t(' · {issueCount} doğrulama sorunu', { issueCount: proposal.issueCount })
              : t(' · çalıştırılabilir')}
          </p>
          {proposal.diff && (
            <p className="ai-diff">
              {t('Değişiklik: ')}
              {diffText(proposal.diff)}
            </p>
          )}
          <ul className="ai-steps" aria-label={t('Önerilen adımlar')}>
            {proposal.workflow.nodes.map((node) => (
              <li key={node.id}>{node.label}</li>
            ))}
          </ul>
          <p className="muted">
            {proposal.diff
              ? t('Uygularsanız değişiklikler taslağa işlenir; “Geri al” ile dönebilirsiniz.')
              : t('Uygularsanız mevcut taslağın yerine geçer; “Geri al” ile dönebilirsiniz.')}
          </p>
          <button
            type="button"
            onClick={() => {
              // An edit proposal applies only to the exact document it was made for (stale hash check).
              if (!proposalMatches(proposal, workflow)) {
                setProposal(null);
                setMessage({
                  kind: 'error',
                  text: t('Taslak öneriden sonra değişti; öneri uygulanmadı. Yeniden isteyin.'),
                });
                return;
              }
              dispatch({ type: 'replace-workflow', workflow: proposal.workflow });
              setProposal(null);
              setMessage({ kind: 'info', text: t('AI önerisi taslağa uygulandı.') });
            }}
          >
            {t('Taslağa uygula')}
          </button>{' '}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setProposal(null);
              setMessage({ kind: 'info', text: t('Öneri reddedildi; taslağınız değişmedi.') });
            }}
          >
            {t('Reddet')}
          </button>
        </div>
      )}
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    </section>
  );
}

/**
 * Signed-out members still see that AI creation exists: a faded, inert preview whose
 * reason appears on hover or keyboard focus (and is read as the region's description).
 */
function LockedAiPanel({
  configured,
  onAuth,
}: {
  configured: boolean | null;
  onAuth: (mode: AuthMode) => void;
}) {
  const reasonId = useId();
  const reason =
    configured === false
      ? t(
          'AI ile oluşturma bu sunucuda henüz etkin değil. Bulut hesabı yapılandırıldığında üyeler günde 1 kez kullanabilir.',
        )
      : t('AI ile oluşturmak için giriş yapın. Üyeler günde 1 kez kullanabilir.');
  return (
    <section
      className="ai-panel ai-locked"
      aria-label={t('AI ile oluştur')}
      aria-describedby={reasonId}
      tabIndex={0}
    >
      <h2 className="list-heading">
        {t('AI ile oluştur')} <span className="ai-lock-badge">{t('Kilitli')}</span>
      </h2>
      <div className="ai-locked-preview" inert>
        <label>
          {t('Süreci anlatın')}
          <textarea
            disabled
            placeholder={t('Örn. 10.000 TL üzeri satın almalar yönetici onayına gitsin.')}
          />
        </label>
        <button type="button" className="secondary" disabled>
          {t('Akış öner')}
        </button>
      </div>
      <p className="ai-lock-reason" id={reasonId} role="tooltip">
        {reason}
      </p>
      {configured === true && (
        <div className="ai-cta">
          <p>{t('Ücretsiz hesapla günde 1 AI önerisi alırsın.')}</p>
          <div className="ai-cta-actions">
            <button type="button" onClick={() => onAuth('signup')}>
              {t('Kayıt ol')}
            </button>
            <button type="button" className="secondary" onClick={() => onAuth('signin')}>
              {t('Giriş yap')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
