import {
  hasValidContentHash,
  parseWorkflowJSON,
  serializeWorkflow,
  WORKFLOW_LIMITS,
  type Workflow,
} from '@workflow-builder/workflow-contract';
import { describeWorkflow } from './validation-messages';
import { t } from '../i18n/i18n';

export type ImportResult =
  | { ok: true; workflow: Workflow; hashMismatch: boolean; issueCount: number }
  | { ok: false; error: string };

const IMPORT_ERRORS: Partial<Record<string, string>> = {
  INVALID_JSON: 'Dosya geçerli bir JSON belgesi değil.',
  GRAPH_LIMIT_EXCEEDED:
    'Dosya sınırları aşıyor: en fazla 256 KiB, 50 adım, 100 bağlantı ve 30 alan olabilir.',
  SCHEMA_VERSION_UNSUPPORTED: 'Desteklenmeyen şema sürümü; yalnız schemaVersion 1 içe aktarılır.',
  DUPLICATE_ID: 'Dosyada aynı kimliği kullanan birden fazla adım veya bağlantı var.',
  DUPLICATE_INPUT_KEY: 'Dosyada aynı anahtarı kullanan birden fazla alan var.',
};

// Same count as the validation panel (derived path issues hidden) so the UI agrees.
export function semanticIssueCount(workflow: Workflow): number {
  return describeWorkflow(workflow).length;
}

// D-03: incomplete but schema-valid drafts may be exported; the hash is always recomputed.
export function exportWorkflow(
  workflow: Workflow,
): { ok: true; fileName: string; text: string } | { ok: false; error: string } {
  try {
    const text = serializeWorkflow(workflow);
    // Schema IDs are already filename-safe ([A-Za-z0-9_-]).
    return { ok: true, fileName: `${workflow.workflowId.slice(0, 64)}.workflow.json`, text };
  } catch {
    return { ok: false, error: t('İçerik özeti eklenince belge 256 KiB sınırını aşıyor.') };
  }
}

// Size is checked before the file is read; callers pass File.size.
export function importTooLarge(size: number): boolean {
  return size > WORKFLOW_LIMITS.bytes;
}

export function readImport(text: string): ImportResult {
  const parsed = parseWorkflowJSON(text);
  if (!parsed.success) {
    // Issues are sorted by code; prefer a specific explanation over the generic schema error.
    const issue = parsed.issues.find((item) => IMPORT_ERRORS[item.code]) ?? parsed.issues[0];
    const path = issue?.translationParams?.path;
    return {
      ok: false,
      error:
        (IMPORT_ERRORS[issue?.code ?? ''] && t(IMPORT_ERRORS[issue?.code ?? ''] as string)) ??
        t('Dosya Workflow v1 şemasına uymuyor{path}.', { path: path ? ` (${String(path)})` : '' }),
    };
  }
  const hashMismatch = parsed.data.contentHash !== undefined && !hasValidContentHash(parsed.data);
  // The editor never keeps a derived hash; export recomputes it.
  const workflow = { ...parsed.data };
  delete workflow.contentHash;
  return { ok: true, workflow, hashMismatch, issueCount: semanticIssueCount(workflow) };
}
