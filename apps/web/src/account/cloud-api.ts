import type { Workflow } from '@workflow-builder/workflow-contract';
import { t } from '../i18n/i18n';

// Client for the owner-scoped D1 API (ADR-019). The local draft is never modified here (D-06).
export type SaveOutcome =
  | { kind: 'saved'; revision: number }
  | { kind: 'conflict'; currentRevision: number }
  | { kind: 'error'; message: string };
export interface RevisionMeta {
  revision: number;
  contentHash: string;
  source: string;
  createdAt: string;
}

const ERRORS: Record<string, string> = {
  EMAIL_NOT_VERIFIED: 'Buluta kaydetmek için önce e-postanızı doğrulayın.',
  GRAPH_VALIDATION_FAILED: 'Yalnız doğrulama sorunu olmayan akışlar buluta kaydedilebilir.',
  GRAPH_TOO_LARGE: 'Akış bulut kaydı için çok büyük.',
  UNAUTHENTICATED: 'Oturum geçersiz. Tekrar giriş yapın.',
  TOKEN_EXPIRED: 'Oturumun süresi doldu. Tekrar giriş yapın.',
  AUTH_NOT_CONFIGURED: 'Bulut hesabı bu sunucuda yapılandırılmadı.',
  STORAGE_NOT_CONFIGURED: 'Bulut kaydı bu sunucuda yapılandırılmadı.',
  WORKFLOW_NOT_FOUND: 'Bulut kaydı bulunamadı; silinmiş olabilir.',
};
const message = (code: string | undefined) =>
  (ERRORS[code ?? ''] && t(ERRORS[code ?? ''] as string)) ??
  t('Bulut kaydı tamamlanamadı. Lütfen tekrar deneyin.');

type Body = {
  data?: Record<string, unknown>;
  error?: { code?: string; details?: { currentRevision?: number } };
};

export class CloudApi {
  private readonly token: () => Promise<string | null>;
  private readonly fetcher: typeof fetch;
  constructor(
    token: () => Promise<string | null>,
    fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {
    this.token = token;
    this.fetcher = fetcher;
  }

  private async call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: Body } | null> {
    const token = await this.token();
    if (!token) return { status: 401, body: { error: { code: 'UNAUTHENTICATED' } } };
    try {
      const response = await this.fetcher(path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json().catch(() => ({}))) as Body };
    } catch {
      return null;
    }
  }

  private async put(workflow: Workflow, expectedRevision: number): Promise<SaveOutcome> {
    const result = await this.call(
      'PUT',
      `/api/v1/workflows/${encodeURIComponent(workflow.workflowId)}`,
      {
        workflow,
        expectedRevision,
        source: 'manual',
      },
    );
    if (!result)
      return { kind: 'error', message: t('Sunucuya ulaşılamadı. Yerel taslağınız korunuyor.') };
    if (result.status === 200)
      return { kind: 'saved', revision: Number(result.body.data?.revision) };
    const current = result.body.error?.details?.currentRevision;
    if (result.status === 409 && typeof current === 'number')
      return { kind: 'conflict', currentRevision: current };
    return { kind: 'error', message: message(result.body.error?.code) };
  }

  /**
   * Saves a new revision. Without a known revision it creates the record; if the record already
   * exists (e.g. saved from another device) it reports a conflict instead of overwriting silently.
   */
  async save(workflow: Workflow, knownRevision: number | null): Promise<SaveOutcome> {
    if (knownRevision !== null) return this.put(workflow, knownRevision);
    const created = await this.call('POST', '/api/v1/workflows', { workflow, source: 'manual' });
    if (!created)
      return { kind: 'error', message: t('Sunucuya ulaşılamadı. Yerel taslağınız korunuyor.') };
    if (created.status === 201) return { kind: 'saved', revision: 1 };
    if (created.status === 409 && created.body.error?.code === 'WORKFLOW_EXISTS') {
      const current = await this.call(
        'GET',
        `/api/v1/workflows/${encodeURIComponent(workflow.workflowId)}`,
      );
      const revision = Number(current?.body.data?.revision);
      return current?.status === 200 && Number.isSafeInteger(revision)
        ? { kind: 'conflict', currentRevision: revision }
        : {
            kind: 'error',
            message: t(
              'Bu kimlikle silinmiş bir bulut kaydı var; taslağı yeni kimlikle kaydetmek için dışa/içe aktarın.',
            ),
          };
    }
    return { kind: 'error', message: message(created.body.error?.code) };
  }

  /** Explicit "save anyway" after a conflict: becomes the next revision on top of the current one. */
  overwrite(workflow: Workflow, currentRevision: number): Promise<SaveOutcome> {
    return this.put(workflow, currentRevision);
  }

  async revisions(workflowId: string): Promise<RevisionMeta[] | null> {
    const result = await this.call(
      'GET',
      `/api/v1/workflows/${encodeURIComponent(workflowId)}/revisions`,
    );
    return result?.status === 200 && Array.isArray(result.body.data?.items)
      ? (result.body.data.items as RevisionMeta[])
      : null;
  }
}

const KNOWN_KEY = 'workflow-builder:cloud-revisions:v1';
type Store = Pick<Storage, 'getItem' | 'setItem'> | null;

/** Last revision this browser saved or saw, per workflow ID and user. */
export function knownRevision(store: Store, uid: string, workflowId: string): number | null {
  try {
    const map = JSON.parse(store?.getItem(KNOWN_KEY) ?? '{}') as Record<string, unknown>;
    const value = map[`${uid}:${workflowId}`];
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function rememberRevision(store: Store, uid: string, workflowId: string, revision: number) {
  try {
    const map = JSON.parse(store?.getItem(KNOWN_KEY) ?? '{}') as Record<string, unknown>;
    store?.setItem(KNOWN_KEY, JSON.stringify({ ...map, [`${uid}:${workflowId}`]: revision }));
  } catch {
    // Without storage the next save asks again via the conflict path; nothing is lost.
  }
}
