import { useEffect, useState } from 'react';

type HealthState = 'loading' | 'ready' | 'error';

export function App() {
  const [state, setState] = useState<HealthState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    setState('loading');
    let active = true;
    async function checkHealth() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        const body: unknown = await response.json();
        if (
          !response.ok ||
          !body ||
          typeof body !== 'object' ||
          !('data' in body) ||
          !body.data ||
          typeof body.data !== 'object' ||
          !('status' in body.data) ||
          body.data.status !== 'ok'
        ) {
          throw new Error('Invalid health response');
        }
        if (active) setState('ready');
      } catch {
        if (active) setState('error');
      } finally {
        clearTimeout(timeout);
      }
    }
    void checkHealth();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  return (
    <main>
      <p className="eyebrow">AI WORKFLOW BUILDER</p>
      <h1>Geliştirme temeli</h1>
      <p className="intro">Workflow tasarımı ve simülasyonu için ilk adım.</p>
      <section aria-labelledby="health-heading">
        <h2 id="health-heading">Servis bağlantısı</h2>
        {state === 'error' ? (
          <p role="alert">Servise ulaşılamadı. Lütfen yeniden deneyin.</p>
        ) : (
          <p role="status">{state === 'loading' ? 'Bağlantı kontrol ediliyor…' : 'Servis hazır'}</p>
        )}
        <button disabled={state === 'loading'} onClick={() => setAttempt((value) => value + 1)}>
          Yeniden kontrol et
        </button>
      </section>
      <p className="note">
        Faz 1 · Yalnızca teknik temel. İş akışı editörü henüz kullanıma açık değil.
      </p>
    </main>
  );
}
