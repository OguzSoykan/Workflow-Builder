import { useState } from 'react';
import type { Account } from './use-account';
import { t } from '../i18n/i18n';

export function AccountPanel({ account }: { account: Account }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  if (account.configured === null) return null;
  if (!account.configured)
    return (
      <span
        className="account-status"
        title={t('Firebase projesi bağlanınca hesap özellikleri açılır.')}
      >
        {t('Bulut hesabı yapılandırılmadı')}
      </span>
    );
  const { session, profile } = account;
  return (
    <details className="account">
      <summary>{session ? session.email : t('Giriş yap')}</summary>
      <section className="account-panel" aria-label={t('Hesap')}>
        {session ? (
          <>
            <p>
              <strong>{session.email}</strong>
            </p>
            {profile === null ? (
              <p className="muted">{t('Hesap bilgisi yükleniyor…')}</p>
            ) : profile.emailVerified ? (
              <p className="account-ok">{t('E-posta doğrulandı; buluta kayıt açık.')}</p>
            ) : (
              <>
                <p className="account-warning">
                  {t(
                    'E-postanız doğrulanmadı. Buluta kaydetmek için e-postadaki bağlantıya tıklayın.',
                  )}
                </p>
                <button
                  type="button"
                  className="secondary"
                  disabled={account.busy}
                  onClick={() => void account.sendVerification()}
                >
                  {t('Doğrulama e-postası gönder')}
                </button>{' '}
                <button
                  type="button"
                  className="secondary"
                  disabled={account.busy}
                  onClick={() => void account.refreshVerification()}
                >
                  {t('Doğruladım, yenile')}
                </button>
              </>
            )}
            <p className="muted">{t('Çıkış yapmak bu tarayıcıdaki yerel taslağı silmez.')}</p>
            <button type="button" onClick={account.signOut}>
              {t('Çıkış yap')}
            </button>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void account.signIn(email, password);
            }}
          >
            <p className="muted">{t("Şifreniz yalnızca Firebase Authentication'a gönderilir.")}</p>
            <label>
              {t('E-posta')}
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              {t('Şifre')}
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="submit" disabled={account.busy}>
              {t('Giriş yap')}
            </button>{' '}
            <button
              type="button"
              className="secondary"
              disabled={account.busy || !email || password.length < 6}
              onClick={() => void account.signUp(email, password)}
            >
              {t('Hesap oluştur')}
            </button>{' '}
            <button
              type="button"
              className="link-button"
              disabled={account.busy || !email}
              onClick={() => void account.resetPassword(email)}
            >
              {t('Şifremi unuttum')}
            </button>
          </form>
        )}
        {account.message && (
          <p role={account.message.kind === 'error' ? 'alert' : 'status'}>{account.message.text}</p>
        )}
      </section>
    </details>
  );
}
