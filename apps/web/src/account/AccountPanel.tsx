import { useState } from 'react';
import type { Account } from './use-account';
import { t } from '../i18n/i18n';

export function AccountPanel({ account }: { account: Account }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Buttons stay clickable; a missing email or short password is explained instead of silently disabling them.
  const [formError, setFormError] = useState<string | null>(null);
  const emailMissing = !/^\S+@\S+$/.test(email.trim());
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
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFormError(null);
                }}
              />
            </label>
            <label>
              {t('Şifre')}
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                aria-describedby="password-hint"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFormError(null);
                }}
              />
            </label>
            <p className="muted field-hint" id="password-hint">
              {t('En az 6 karakter.')}
            </p>
            <button type="submit" disabled={account.busy}>
              {t('Giriş yap')}
            </button>{' '}
            <button
              type="button"
              className="secondary"
              disabled={account.busy}
              onClick={() => {
                if (emailMissing)
                  return setFormError(t('Hesap oluşturmak için geçerli bir e-posta adresi girin.'));
                if (password.length < 6) return setFormError(t('Şifre en az 6 karakter olmalı.'));
                setFormError(null);
                void account.signUp(email.trim(), password);
              }}
            >
              {t('Hesap oluştur')}
            </button>{' '}
            <button
              type="button"
              className="link-button"
              disabled={account.busy}
              onClick={() => {
                if (emailMissing)
                  return setFormError(t('Şifre sıfırlama için e-posta adresinizi girin.'));
                setFormError(null);
                void account.resetPassword(email.trim());
              }}
            >
              {t('Şifremi unuttum')}
            </button>
            {formError && <p role="alert">{formError}</p>}
          </form>
        )}
        {account.message && (
          <p role={account.message.kind === 'error' ? 'alert' : 'status'}>{account.message.text}</p>
        )}
      </section>
    </details>
  );
}
