# Delivery Backlog v1.1 — Öncelik, bağımlılık ve kabul kriterleri

**Statü:** Planlandı, kodlanmadı. Boyutlar XS/S/M/L iş büyüklüğüdür, süre veya ücret vaadi değildir.

## Definition of Ready (DoR)

- Problemi/çıktısı ölçülebilir, kapsam sınırı belirli.
- Bağımlılıklar ve sözleşme referansı dokümante.
- En az bir başarılı ve bir başarısız senaryo kabul kriteri var.
- Security/privacy ve ücretsiz hosting etkisi kontrol edilmiş.

## Definition of Done (DoD)

- Kabul kriterlerini doğrulayan unit/integration/E2E testleri uygun seviyede mevcut.
- Typecheck, lint, formatting, relevant test, build CI'da başarılı.
- İlgili PRD/contract/API/ADR değişiklikleri güncel.
- Diff incelendi; sır/PII/hardcode key/log ve dependency risk taraması yapıldı.
- Feature branch → tek amaçlı PR → review → staging smoke → ana dala merge.
- Elde edilemeyen test/deploy doğrulaması varsa DONE değil BLOCKED/REVIEW.

## Faz 1 — Contract-first foundation (**ilk Codex fazı**)

| ID | P | Boyut | Görev | Bağımlılık | Bitmiş sayılması için |
|---|---|---|---|---|---|
| WB-001 | P0 | M | Temiz repo, strict TS, Vite/React+Hono+Wrangler, temel CI | Yok | Lokal health, typecheck/lint/test/build, hiçbir gerçek API key yok |
| WB-002 | P0 | M | Canonical workflow schema v1 + fixtures | WB-001 | 4 node, input types, id/handle/edge contracts; serialize/deserialize testleri |
| WB-003 | P0 | M | Saf graph validator | WB-002 | Start/End, reachability, cycles, missing handle/field/type invalid testleri |
| WB-004 | P0 | S | Docs/ADR/OpenAPI iskeleti, secrets ve CI kalite kapısı | WB-001 | Dokümantasyon, örnek env (gerçek secret yok), PR checks geçer |

**Phase 1 Gate:** Graph model and validator + CI ready; Canvas, database, AI, auth yok. Sadece bunların eklenmesini isteyen ayrı karar/go görevleri açılır.

## Faz 2 — Editor & local-first

| ID | P | Size | Görev | Bağımlılık | Kabul |
|---|---|---|---|---|---|
| WB-005 | P0 | L | ERP tarzı React Flow canvas ve node property editor | 002/003 | 4 node, bağlantı yönetimi, zoom/selection |
| WB-006 | P0 | M | Input field editor, Condition ve Approval dalları | 005/003 | Tipli alanlar, handle UX, error tooltip |
| WB-007 | P0 | M | Yerel persist, import/export, güvenli parse | 005 | Yenilemede koruma; invalid import çalışma kaybına neden olmaz |
| WB-008 | P0 | M | Graph validation UX ve undo/redo | 003/005 | Node bazlı hata, undo/redo canvas üzerinde testli |

## Faz 3 — Simulation engine

| ID | P | Size | Görev | Bağımlılık | Kabul |
|---|---|---|---|---|---|
| WB-009 | P0 | L | Saf deterministik simulator / state machine | 003/006 | Input+approval verdict ile repeatable trace; no external IO |
| WB-010 | P0 | M | Onayda duraklama, manual approve/reject UX, trace | 009 | Waiting state, sonuç ve yol highlight |
| WB-011 | P0 | M | Satın alma/izin/masraf örnek fixture ve E2E | 010 | Her örnek akış simülasyonu uçtan uca geçer |

## Faz 4 — Auth & D1 cloud persistence

| ID | P | Size | Görev | Bağımlılık | Kabul |
|---|---|---|---|---|---|
| WB-012 | P0 | M | Firebase Spark email/password + email verify/reset UI | 001 | Şifre Worker'a gitmez; kötü token negative tests |
| WB-013 | P0 | M | Worker auth token verification + /me + ownership | 012 | RS256 signature/aud/iss/exp checked; A cannot access B |
| WB-014 | P0 | L | D1 schema, migration, CRUD/revisions optimistic concurrency | 013/002/003 | Immutable revisions, concurrent PUT test, soft-delete |
| WB-015 | P1 | S | Local-to-cloud migration + revision viewer | 014/007 | Açık kullanıcı onayı; duplicate safe; başarısız save'de local korunur |

## Faz 5 — AI & 5 USD budget guard

| ID | P | Size | Görev | Bağımlılık | Kabul |
|---|---|---|---|---|---|
| WB-016 | P0 | L | Durable Object global cost/trial ledger, idempotency | 001 | Paralel isteklerde rezervasyonlar stop'u aşmaz; fail closed |
| WB-017 | P0 | M | Turnstile Siteverify/guest cookie/registered quotas | 016/013 | Invalid/replayed token reddedilir; guest trial once per session |
| WB-018 | P0 | M | OpenAI adapter, Structured Outputs/mock/usage metrics | 002/003/016 | Key secret; model errors; no automatic costly retries |
| WB-019 | P0 | M | Prompt-to-workflow create + preview/apply | 018/017/005 | Server validation; no silent overwrite |
| WB-020 | P0 | L | AI edit operation patch, semantic diff, stable IDs | 019/008 | Stale hash rejected; unchanged IDs preserved |
| WB-021 | P0 | M | Approve/reject/undo AI UX; quality eval 20 prompts | 020 | 85% quality objective; no rejected changes persisted |

## Faz 6 — Production readiness

| ID | P | Size | Görev | Bağımlılık | Kabul |
|---|---|---|---|---|---|
| WB-022 | P0 | M | TR/EN i18n, a11y, responsive ERP polish | 005/010/021 | Ana akış TR/EN; keyboard/A11y smoke |
| WB-023 | P0 | M | Staging/prod env, monitoring, docs, E2E CI/CD & rollback | önceki bütün P0 | Secret scan, free tier/CPU ölçüm, staging pass, publish checklist |

## P2 — MVP dışı

| ID | Özellik | Erteleme nedeni |
|---|---|---|
| WB-024 | Gerçek çalışanlara atanan onay görevleri / RBAC inbox | Daha geniş permission/audit gerektirir |
| WB-025 | Webhook, mail, API, timer node'ları | Dış sistem, retry, güvenlik ve maliyet |
| WB-026 | Multi-tenant ortak çalışma / public gallery | Ownership ve shared permissions |
| WB-027 | BPMN 2.0 import/export / advanced DSL | Tam uyumluluk büyük scope |

## Backlog iş akışı

Backlog → Ready → In Progress → Review → Done. WIP önerisi: tek Codex görevi uygulamada; bir görevi bitirmeden yenisine atlamamak.

## Release milestones

- **M0:** Schema + graph core + CI (Faz 1).
- **M1:** Ücretsiz anonymous local editor + simülasyon; AI/auth olmadan güvenli public preview olabilir.
- **M2:** Firebase Auth + D1; üyelere private cloud save.
- **M3:** AI generate/edit + merkezi budget/abuse controls; MVP v1.0.
- **M4:** TR/EN polish, docs, test E2E ve prod release.
