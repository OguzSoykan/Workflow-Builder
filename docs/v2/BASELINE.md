# V1 Baseline — WB2-001

**Tarih:** 1 Kasım 2026 · **Commit:** `7bfeaee14d13b0efa2b13c59c24c67fdb8bcc2e0` (`main`, PR #42 sonrası) ·
**Ortam:** macOS (Darwin 24), Node 24.22.1, npm 11.19.1 · **Dal:** `wb2/001-baseline`

Bu belge V2 çalışmasına başlamadan önce V1'in **ölçülmüş** durumunu kaydeder. Her rakam bu commit üzerinde
aşağıdaki komutlarla elde edildi; önceki belgelerdeki rakamlarla fark varsa burada düzeltildi.

## 1. Kalite kapıları (yerel çalıştırma)

| Komut                                  | Sonuç       | Süre | Ayrıntı                                                                                          |
| -------------------------------------- | ----------- | ---- | ------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                    | PASS        | 8 s  | 4 workspace + araçlar, TypeScript 6 strict                                                       |
| `npm run lint`                         | PASS        | 2 s  | ESLint 10, 0 uyarı                                                                               |
| `npm run format:check`                 | PASS¹       | 2 s  | Kod temiz; ¹ commit'lenmemiş iki roadmap dosyası hariç (aşağıda)                                 |
| `npm test`                             | PASS        | 3 s  | Vitest **30 dosya / 496 test** + `test:security` 5 + `test:docs` 3                               |
| `npm run test:coverage`                | PASS        | 3 s  | Satır %98,52 · dal %93,16 · fonksiyon %96,49 · ifade %97,62                                      |
| `npm run test:negative-gates`          | PASS        | 5 s  | Bilerek bozulan iki prob dosyası kapılarca reddedildi                                            |
| `npm run build`                        | PASS        | 4 s  | Web (Vite) + Worker + local/staging/production Wrangler dry-run                                  |
| `npm run secret:scan`                  | PASS        | <1 s | 230 kaynak/build dosyası, 0 bulgu                                                                |
| `GITLEAKS_BIN=… npm run secrets:check` | PASS        | —    | Git geçmişi + kaynak + build çıktısı, “no leaks found”                                           |
| `npm run test:e2e`                     | PASS        | 20 s | Playwright Chromium + yerel Worker: **55/55** (önceki belgelerde 54)                             |
| `npm audit`                            | 11 moderate | —    | Hepsi geliştirme bağımlılığı (ESLint → `minimatch` ReDoS zinciri); `npm audit --omit=dev`: **0** |

¹ `docs/WORKFLOW_BUILDER_V2_TECH_ROADMAP.md` ve `…_UPDATED.md` repoya eklenmemiş, Prettier biçiminde değil. Güncel
roadmap biçimlendirilmiş hâliyle `docs/v2/TECH_ROADMAP.md` olarak eklendi (içerik aynı; yalnız tablo ayraçları ve
vurgu işaretleri değişti). Eski v2.0 dosyası takip edilmiyor.

**Coverage kapsamı:** `vitest.config.ts` yalnız saf mantık dosyalarını ölçer — `packages/*/src`, `apps/worker/src`,
web'de 14 model/istemci dosyası (`model.ts`, `history.ts`, `draft-storage.ts`, `firebase-auth.ts`, `ai-api.ts` …).
React bileşenleri (`*.tsx`) kapsam dışıdır; E2E ile doğrulanır. Coverage için **eşik tanımlı değil**. En düşük
dosya: `apps/web/src/i18n/i18n.ts` (satır %63).

## 2. CI ve depo kuralları

| Konu                   | Durum                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow'lar           | `quality.yml` (PR + push), `deploy.yml` (manuel, onaylı), `smoke.yml` (manuel, salt okunur)                                                               |
| `quality` adımları     | `npm ci` → typecheck → lint → format:check → **test:coverage** → build → Chromium → test:e2e → Gitleaks (`secrets:check`, `secrets:self-test`) → artefakt |
| `main` koruması        | Zorunlu check: `quality` (strict, güncel dal şart); force-push kapalı; admin'e de uygulanır; onay sayısı 0; lineer geçmiş zorunlu değil                   |
| Son `main` koşuları    | 7/7 `Quality` success (29 Ekim–1 Kasım), son: [41259059818](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/41259059818) (`7bfeaee`)          |
| Bağımsız staging smoke | GitHub ağından `Smoke` [41261959419](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/41261959419): success                                    |
| Yerel smoke            | `node scripts/smoke.mjs https://workflow-staging.oguzsoykan.com` → 6/6; production (salt okunur) → 6/6                                                    |
| GitHub environments    | **Tanımlı değil** (`staging`/`production` yok, `CLOUDFLARE_API_TOKEN` yok) → `deploy.yml` şu an çalışamaz; deploy'lar yerel `wrangler` ile yapılıyor      |

## 3. Paket sınırları (kodla doğrulandı)

| Kontrol                                  | Sonuç                                        |
| ---------------------------------------- | -------------------------------------------- |
| `apps/web` → `apps/worker` import        | 0                                            |
| `apps/worker` → `apps/web` import        | 0                                            |
| `apps/*` → `packages/*/src` derin import | 0                                            |
| `workflow-core` dış bağımlılıkları       | yalnız `@workflow-builder/workflow-contract` |
| `workflow-contract` dış bağımlılıkları   | `zod`, `@noble/hashes`                       |

Satır sayıları (yaklaşık, `.ts/.tsx/.css`): web 6.620 · worker 2.040 · contract 640 · core 690 · tests 3.740.

## 4. Ortamlar, değişkenler ve secret'lar

| Ortam      | Worker                        | Alan adı                          | D1                            | `vars`                                                                                                               | Secret adları                            |
| ---------- | ----------------------------- | --------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| local      | `workflow-builder-local`      | —                                 | `workflow-builder` (yerel)    | `infra/.dev.vars` (git-ignored)                                                                                      | —                                        |
| staging    | `workflow-builder-staging`    | `workflow-staging.oguzsoykan.com` | `workflow-builder-staging`    | `AI_ENABLED=true`, `AI_PROVIDER=mock`, `FIREBASE_PROJECT_ID=workflow-builder-staging-a31fe`                          | `FIREBASE_WEB_API_KEY`                   |
| production | `workflow-builder-production` | `workflow.oguzsoykan.com`         | `workflow-builder-production` | `AI_ENABLED=true`, `AI_PROVIDER=openai`, `AI_MODEL=gpt-6-luna`, `FIREBASE_PROJECT_ID=workflow-builder-staging-a31fe` | `FIREBASE_WEB_API_KEY`, `OPENAI_API_KEY` |

Her ortamın kendi D1'i ve `AiBudget` Durable Object'i vardır; **Firebase projesi staging ve production arasında
paylaşılıyor** (WB2-002 konusu). `*.workers.dev` kapalı.

## 5. AI değerlendirmesi

Kaynak: `docs/evals/ai-eval-live-2026-10-28.json` (yeniden çalıştırılmadı — ücretli; gerek görülürse kullanıcı onayıyla).

| Alan                | Değer                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| Tarih / mod / model | 2026-10-28 · live · `gpt-6-luna`                                                   |
| Sonuç               | **19/20** (%95; hedef %85), 19 geçerli öneri                                       |
| Harcama             | 10.374 mikro-USD (≈0,0104 USD); en kötü durum 85.366; değerlendirme tavanı 500.000 |

## 6. V1 API ve sözleşme envanteri

**Uygulanan uçlar (13)** — `apps/worker/src`:

| Yöntem | Yol                                  | Yetki                                                         |
| ------ | ------------------------------------ | ------------------------------------------------------------- |
| GET    | `/api/health`                        | açık                                                          |
| GET    | `/api/config`                        | açık                                                          |
| GET    | `/api/v1/me`                         | üye                                                           |
| GET    | `/api/v1/workflows`                  | üye                                                           |
| POST   | `/api/v1/workflows`                  | doğrulanmış üye                                               |
| GET    | `/api/v1/workflows/:id`              | sahibi                                                        |
| PUT    | `/api/v1/workflows/:id`              | doğrulanmış üye, `expectedRevision` (409 `REVISION_CONFLICT`) |
| DELETE | `/api/v1/workflows/:id`              | sahibi (yumuşak silme)                                        |
| GET    | `/api/v1/workflows/:id/revisions`    | sahibi                                                        |
| GET    | `/api/v1/workflows/:id/revisions/:n` | sahibi                                                        |
| GET    | `/api/v1/ai/limits`                  | üye                                                           |
| POST   | `/api/v1/ai/workflows/generate`      | doğrulanmış üye, `Idempotency-Key`                            |
| POST   | `/api/v1/ai/workflows/edit`          | doğrulanmış üye, `Idempotency-Key`                            |

**Belgelenmiş ama uygulanmamış (3)** — `docs/openapi.json` 16 işlem tanımlar: `PATCH /api/v1/me`,
`DELETE /api/v1/me`, `POST /api/v1/workflows/{id}/restore`. Bu yollar Worker'da tanımlı değil (kodda
aranarak doğrulandı; kimliksiz istek rota eşleşmeden 401 alır). `RevisionSource` tipinde `restore` değeri hazır ama kullanılmıyor.

**Sözleşme (`workflow-contract`, `schemaVersion: 1`):** adım türleri `start`/`approval`/`condition`/`end`; çıkışlar
`next`/`true`/`false`/`approved`/`rejected`; sınırlar 50 adım · 100 bağlantı · 30 alan · 100 seçenek · 1.000 karakter
metin · 256 KB · derinlik 12 · 20.000 değer; katı nesneler; kanonik JSON + SHA-256 içerik özeti.
**Çekirdek (`workflow-core`) public API:** `validateWorkflow`, `validateWorkflowJSON`, `validateTopology`,
`validateConditions`, `normalizeInputs`, `evaluateCondition`, `startSimulation`, `decideApproval`, `applyPatch`,
`diffWorkflows`.
**Veri modeli (D1, `0001_workflows.sql`):** `users`, `workflows` (`(owner_uid, id)` PK, `current_revision_number`),
`workflow_revisions` (değiştirilemez, `content_hash`, `source`, ≤256 KB `graph_json`).

## 7. Bilinen açıklar

| #   | Öncelik | Açık                                                                                                      | Önerilen görev         |
| --- | ------- | --------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | P0      | Staging ve production aynı Firebase projesini paylaşıyor; staging hesabı production'da geçerli            | WB2-002                |
| 2   | P1      | CI `test:security`, `test:docs` ve `test:negative-gates`'i çalıştırmıyor (yalnız yerelde koşuyor)         | WB2-005                |
| 3   | P1      | Statik SPA için CSP ve güvenlik başlıkları yok (Worker yanıtlarında Hono `secureHeaders` var)             | WB2-006                |
| 4   | P1      | AI dışındaki API uçlarında istek sınırlama yok                                                            | WB2-006                |
| 5   | P1      | OpenAPI ↔ uygulama sapması: `PATCH/DELETE /me`, `restore` belgede var, kodda yok (hesap silme/KVKK dahil) | WB2-003 / UI307        |
| 6   | P2      | GitHub `staging`/`production` environment ve secret'ları yok; `deploy.yml` kullanılamıyor                 | WB2-002 / WB2-506      |
| 7   | P2      | Coverage eşiği yok; React bileşenleri coverage dışında                                                    | WB2-005 / UI404        |
| 8   | P2      | `npm audit`: 11 moderate (yalnız geliştirme bağımlılığı, ESLint zinciri)                                  | WB2-608                |
| 9   | P2      | `STATUS.md` 27 Ekim'den kalma; Faz 6 sonrası durum ve V2 başlangıcı yansımıyor                            | Bu görevde güncellendi |
| 10  | P3      | Önceki belgelerde E2E sayısı 54; güncel 55 (favicon testi)                                                | Bu görevde düzeltildi  |

## 8. Yeniden üretme

```sh
git checkout 7bfeaee && npm ci
npm run typecheck && npm run lint && npm run format:check
npm test && npm run test:coverage && npm run test:negative-gates
npm run build && npm run secret:scan
GITLEAKS_BIN=/path/to/gitleaks npm run secrets:check
npm run test:e2e
npm audit && npm audit --omit=dev
node scripts/smoke.mjs https://workflow-staging.oguzsoykan.com
gh workflow run smoke.yml -f url=https://workflow-staging.oguzsoykan.com
```
