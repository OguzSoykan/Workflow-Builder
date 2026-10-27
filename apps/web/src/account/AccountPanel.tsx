import { useState } from 'react';
import type { Account } from './use-account';

export function AccountPanel({ account }: { account: Account }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  if (account.configured === null) return null;
  if (!account.configured)
    return (
      <span
        className="account-status"
        title="Firebase projesi bağlanınca hesap özellikleri açılır."
      >
        Bulut hesabı yapılandırılmadı
      </span>
    );
  const { session, profile } = account;
  return (
    <details className="account">
      <summary>{session ? session.email : 'Giriş yap'}</summary>
      <section className="account-panel" aria-label="Hesap">
        {session ? (
          <>
            <p>
              <strong>{session.email}</strong>
            </p>
            {profile === null ? (
              <p className="muted">Hesap bilgisi yükleniyor…</p>
            ) : profile.emailVerified ? (
              <p className="account-ok">E-posta doğrulandı; buluta kayıt açık.</p>
            ) : (
              <>
                <p className="account-warning">
                  E-postanız doğrulanmadı. Buluta kaydetmek için e-postadaki bağlantıya tıklayın.
                </p>
                <button
                  type="button"
                  className="secondary"
                  disabled={account.busy}
                  onClick={() => void account.sendVerification()}
                >
                  Doğrulama e-postası gönder
                </button>{' '}
                <button
                  type="button"
                  className="secondary"
                  disabled={account.busy}
                  onClick={() => void account.refreshVerification()}
                >
                  Doğruladım, yenile
                </button>
              </>
            )}
            <p className="muted">Çıkış yapmak bu tarayıcıdaki yerel taslağı silmez.</p>
            <button type="button" onClick={account.signOut}>
              Çıkış yap
            </button>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void account.signIn(email, password);
            }}
          >
            <p className="muted">Şifreniz yalnızca Firebase Authentication'a gönderilir.</p>
            <label>
              E-posta
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Şifre
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
              Giriş yap
            </button>{' '}
            <button
              type="button"
              className="secondary"
              disabled={account.busy || !email || password.length < 6}
              onClick={() => void account.signUp(email, password)}
            >
              Hesap oluştur
            </button>{' '}
            <button
              type="button"
              className="link-button"
              disabled={account.busy || !email}
              onClick={() => void account.resetPassword(email)}
            >
              Şifremi unuttum
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
