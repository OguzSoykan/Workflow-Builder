import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { Account } from './use-account';
import { t } from '../i18n/i18n';

export type AuthMode = 'signin' | 'signup' | 'reset';
const MIN_PASSWORD = 6;
const RESEND_COOLDOWN_SECONDS = 30;
const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

/** State shared by the screens of one open dialog (not persisted). */
interface DialogMemory {
  email: string;
  closeAfterSignIn: boolean;
}

/** Header entry point: sign-in / sign-up buttons, or the signed-in account chip. */
export function AccountButtons({
  account,
  onOpen,
}: {
  account: Account;
  onOpen: (mode: AuthMode) => void;
}) {
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
  if (!session)
    return (
      <div className="account-buttons">
        <button type="button" className="ghost" onClick={() => onOpen('signin')}>
          {t('Giriş yap')}
        </button>
        <button type="button" onClick={() => onOpen('signup')}>
          {t('Kayıt ol')}
        </button>
      </div>
    );
  const unverified = profile !== null && !profile.emailVerified;
  return (
    <button type="button" className="ghost account-chip" onClick={() => onOpen('signin')}>
      <span className="avatar" aria-hidden="true">
        {session.email.slice(0, 1).toUpperCase()}
      </span>
      <span className="account-email">
        <span className="visually-hidden">{t('Hesap:')} </span>
        {session.email}
      </span>
      {unverified && <span className="account-flag">{t('Doğrulanmadı')}</span>}
    </button>
  );
}

/**
 * Guided account dialog: separate sign-in, sign-up and reset screens; after sign-up it walks the
 * member through email verification, and a signed-in member sees what the account unlocks.
 */
export function AuthDialog({
  account,
  mode,
  onMode,
  onClose,
}: {
  account: Account;
  mode: AuthMode | null;
  onMode: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const memory = useRef<DialogMemory>({ email: '', closeAfterSignIn: false });
  const titleId = useId();
  const open = mode !== null && account.configured === true;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="auth-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="auth-body">
          <button
            type="button"
            className="ghost icon-button auth-close"
            aria-label={t('Kapat')}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
          {account.session ? (
            <SignedIn account={account} titleId={titleId} memory={memory} onClose={onClose} />
          ) : (
            <SignedOut
              key={mode}
              account={account}
              mode={mode}
              titleId={titleId}
              memory={memory}
              onMode={onMode}
            />
          )}
        </div>
      )}
    </dialog>
  );
}

function SignedOut({
  account,
  mode,
  titleId,
  memory,
  onMode,
}: {
  account: Account;
  mode: AuthMode;
  titleId: string;
  memory: MutableRefObject<DialogMemory>;
  onMode: (mode: AuthMode) => void;
}) {
  const [email, setEmail] = useState(() => memory.current.email);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const hintId = useId();
  const { clearMessage } = account;

  // Each screen starts without the previous screen's error.
  useEffect(() => {
    clearMessage();
  }, [clearMessage]);

  const switchTo = (next: AuthMode) => {
    memory.current.email = email;
    onMode(next);
  };
  const edit = (setter: (value: string) => void, value: string) => {
    setter(value);
    setFormError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!validEmail(address)) return setFormError(t('Geçerli bir e-posta adresi girin.'));
    if (mode === 'reset') {
      setResetSent(await account.resetPassword(address));
      return;
    }
    if (password.length < MIN_PASSWORD) return setFormError(t('Şifre en az 6 karakter olmalı.'));
    if (mode === 'signup' && password !== confirm) return setFormError(t('Şifreler eşleşmiyor.'));
    setFormError(null);
    memory.current.email = address;
    if (mode === 'signup') {
      await account.signUp(address, password);
      return;
    }
    // A verified member goes straight back to work; an unverified one sees the verification steps.
    memory.current.closeAfterSignIn = await account.signIn(address, password);
  };

  const errorText = account.message?.kind === 'error' ? account.message.text : null;
  const emailTaken =
    mode === 'signup' &&
    errorText === t('Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.');
  const wrongCredentials = mode === 'signin' && errorText === t('E-posta veya şifre hatalı.');

  if (mode === 'reset' && resetSent)
    return (
      <>
        <AuthHeading id={titleId} kicker={t('Şifre sıfırlama')} title={t('E-postanı kontrol et')} />
        <p className="auth-lead" role="status">
          {t('{email} adresine bir sıfırlama bağlantısı gönderdik.', { email: email.trim() })}
        </p>
        <ol className="auth-steps">
          <li>{t('E-postadaki bağlantıyı aç ve yeni şifreni belirle.')}</li>
          <li>{t('Buraya dönüp yeni şifrenle giriş yap.')}</li>
        </ol>
        <p className="muted small">{t('E-posta gelmediyse spam klasörüne de bak.')}</p>
        <div className="auth-actions">
          <button type="button" onClick={() => switchTo('signin')}>
            {t('Giriş ekranına dön')}
          </button>
        </div>
      </>
    );

  const heading =
    mode === 'signup'
      ? { kicker: t('Ücretsiz hesap'), title: t('Hesap oluştur') }
      : mode === 'reset'
        ? { kicker: t('Şifre sıfırlama'), title: t('Şifreni mi unuttun?') }
        : { kicker: t('Tekrar hoş geldin'), title: t('Giriş yap') };

  return (
    <>
      <AuthHeading id={titleId} kicker={heading.kicker} title={heading.title} />
      {mode === 'signup' && (
        <ul className="auth-benefits" aria-label={t('Hesapla açılanlar')}>
          <li>{t('AI ile akış oluşturma (günde 1 öneri)')}</li>
          <li>{t('Akışlarını buluta kaydetme ve sürüm geçmişi')}</li>
          <li>{t('Tarayıcıdaki taslağın olduğu gibi kalır')}</li>
        </ul>
      )}
      {mode === 'reset' && (
        <p className="auth-lead">
          {t('Hesabının e-posta adresini yaz; sana yeni şifre belirleme bağlantısı gönderelim.')}
        </p>
      )}
      <form className="auth-form" noValidate onSubmit={(event) => void submit(event)}>
        <label>
          {t('E-posta')}
          <input
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => edit(setEmail, event.target.value)}
          />
        </label>
        {mode !== 'reset' && (
          <div className="password-row">
            <label>
              {t('Şifre')}
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                aria-describedby={mode === 'signup' ? hintId : undefined}
                value={password}
                onChange={(event) => edit(setPassword, event.target.value)}
              />
            </label>
            <button
              type="button"
              className="ghost password-toggle"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? t('Gizle') : t('Göster')}
            </button>
          </div>
        )}
        {mode === 'signin' && (
          <button
            type="button"
            className="link-button forgot-link"
            onClick={() => switchTo('reset')}
          >
            {t('Şifremi unuttum')}
          </button>
        )}
        {mode === 'signup' && (
          <>
            <label>
              {t('Şifre (tekrar)')}
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => edit(setConfirm, event.target.value)}
              />
            </label>
            <ul className="password-checks" id={hintId}>
              <Check ok={password.length >= MIN_PASSWORD}>{t('En az 6 karakter.')}</Check>
              <Check ok={password.length > 0 && password === confirm}>
                {t('Şifreler eşleşiyor.')}
              </Check>
            </ul>
          </>
        )}
        {formError ? (
          <p className="auth-error" role="alert">
            {formError}
          </p>
        ) : (
          errorText && (
            <div className="auth-error" role="alert">
              <p>{errorText}</p>
              {emailTaken && (
                <button type="button" className="link-button" onClick={() => switchTo('signin')}>
                  {t('Bu e-postayla giriş yap')}
                </button>
              )}
              {wrongCredentials && (
                <span className="auth-error-actions">
                  <button type="button" className="link-button" onClick={() => switchTo('reset')}>
                    {t('Şifreni sıfırla')}
                  </button>
                  <button type="button" className="link-button" onClick={() => switchTo('signup')}>
                    {t('Yeni hesap oluştur')}
                  </button>
                </span>
              )}
            </div>
          )
        )}
        <button type="submit" className="auth-submit" disabled={account.busy}>
          {account.busy
            ? t('Lütfen bekleyin…')
            : mode === 'signup'
              ? t('Hesap oluştur')
              : mode === 'reset'
                ? t('Sıfırlama bağlantısı gönder')
                : t('Giriş yap')}
        </button>
      </form>
      <p className="auth-switch">
        {mode === 'signup' ? (
          <>
            {t('Zaten hesabın var mı?')}{' '}
            <button type="button" className="link-button" onClick={() => switchTo('signin')}>
              {t('Giriş yap')}
            </button>
          </>
        ) : mode === 'reset' ? (
          <button type="button" className="link-button" onClick={() => switchTo('signin')}>
            {t('Giriş ekranına dön')}
          </button>
        ) : (
          <>
            {t('Hesabın yok mu?')}{' '}
            <button type="button" className="link-button" onClick={() => switchTo('signup')}>
              {t('Kayıt ol')}
            </button>
          </>
        )}
      </p>
      <p className="muted small auth-privacy">
        {t("Şifreniz yalnızca Firebase Authentication'a gönderilir.")}
      </p>
    </>
  );
}

function SignedIn({
  account,
  titleId,
  memory,
  onClose,
}: {
  account: Account;
  titleId: string;
  memory: MutableRefObject<DialogMemory>;
  onClose: () => void;
}) {
  const { session, profile } = account;
  const [cooldown, setCooldown] = useState(0);
  const [notYet, setNotYet] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  // A verified member who just signed in goes straight back to the editor.
  useEffect(() => {
    if (!memory.current.closeAfterSignIn || !profile) return;
    memory.current.closeAfterSignIn = false;
    if (profile.emailVerified) onClose();
  }, [profile, memory, onClose]);

  if (!session) return null;
  const message = account.message && (
    <p role={account.message.kind === 'error' ? 'alert' : 'status'} className="auth-message">
      {account.message.text}
    </p>
  );

  if (profile === null)
    return (
      <>
        <AuthHeading id={titleId} kicker={t('Hesap')} title={session.email} />
        <p className="muted">{t('Hesap bilgisi yükleniyor…')}</p>
        {message}
      </>
    );

  if (!profile.emailVerified)
    return (
      <>
        <AuthHeading id={titleId} kicker={t('Son bir adım')} title={t('E-postanı doğrula')} />
        <ol className="auth-progress" aria-label={t('Kayıt adımları')}>
          <li className="done">{t('Hesap oluşturuldu')}</li>
          <li className="current" aria-current="step">
            {t('E-postanı doğrula')}
          </li>
          <li>{t('AI ve bulut kaydı açılır')}</li>
        </ol>
        <p className="auth-lead">
          {t('{email} adresine bir doğrulama bağlantısı gönderdik.', { email: session.email })}
        </p>
        <ol className="auth-steps">
          <li>
            {t('Gelen kutunu aç; e-posta birkaç dakika içinde gelir, spam klasörüne de bak.')}
          </li>
          <li>{t('E-postadaki bağlantıya tıkla.')}</li>
          <li>{t('Buraya dönüp “Doğruladım, devam et”e bas.')}</li>
        </ol>
        {message}
        {notYet && !account.message && (
          <p className="auth-message warning" role="status">
            {t(
              'Henüz doğrulanmamış görünüyor. Bağlantıya tıkladıktan sonra birkaç saniye bekleyip tekrar dene.',
            )}
          </p>
        )}
        <div className="auth-actions">
          <button
            type="button"
            disabled={account.busy}
            onClick={async () => {
              setNotYet(false);
              setNotYet(!(await account.refreshVerification()));
            }}
          >
            {t('Doğruladım, devam et')}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={account.busy || cooldown > 0}
            onClick={async () => {
              if (await account.sendVerification()) setCooldown(RESEND_COOLDOWN_SECONDS);
            }}
          >
            {cooldown > 0
              ? t('Tekrar gönder ({seconds} sn)', { seconds: cooldown })
              : t('E-postayı tekrar gönder')}
          </button>
        </div>
        <p className="auth-switch">
          <button type="button" className="link-button" onClick={onClose}>
            {t('Sonra yaparım')}
          </button>
          {' · '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              account.signOut();
              onClose();
            }}
          >
            {t('Çıkış yap')}
          </button>
        </p>
      </>
    );

  return (
    <>
      <AuthHeading id={titleId} kicker={t('Hesap')} title={session.email} />
      <p className="auth-ok">{t('E-posta doğrulandı; buluta kayıt açık.')}</p>
      <ul className="auth-benefits">
        <li>{t('“Oluştur” sekmesinde süreci anlat, AI bir akış önersin.')}</li>
        <li>{t('“Dosya” sekmesinden akışını buluta kaydet.')}</li>
      </ul>
      {message}
      <div className="auth-actions">
        <button type="button" onClick={onClose}>
          {t('Devam et')}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            account.signOut();
            onClose();
          }}
        >
          {t('Çıkış yap')}
        </button>
      </div>
      <p className="muted small">{t('Çıkış yapmak bu tarayıcıdaki yerel taslağı silmez.')}</p>
    </>
  );
}

function AuthHeading({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <header className="auth-heading">
      <p className="auth-kicker">{kicker}</p>
      <h2 id={id}>{title}</h2>
    </header>
  );
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={ok ? 'ok' : undefined}>
      <span aria-hidden="true">{ok ? '✓' : '○'}</span> {children}
      <span className="visually-hidden">{ok ? t(' (sağlandı)') : t(' (henüz değil)')}</span>
    </li>
  );
}
