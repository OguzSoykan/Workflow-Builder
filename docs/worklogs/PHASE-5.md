# Faz 5 çalışma günlüğü

## P5-001 — Faz 5 başlangıcı (2026-10-28)

- PR #24 (WB-015) agent tarafından birleştirildi: main `561efb6`; merge sonrası main [quality 40604609033](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40604609033) PASS. Faz 4 tamamlandı.
- Kullanıcı “devam” dedi; Faz 5 onayı AGENTS'a kaydedildi. Kararlar: belirsiz maliyette tam rezervasyon harcanır (fail-closed); yalnız üye, günde 1 AI isteği, misafir yok (Turnstile kapsam dışı); canlı 20 prompt eval kullanıcının vereceği key'le. DECISIONS'a yazıldı.
- `feat/WB-016-budget-ledger` açıldı. Plan: saf `BudgetLedger` (DO SQL depolama arayüzü üzerinde, senkron kontrol+yazma ile atomik), Node 24 `node:sqlite` ile gerçek SQLite testleri; ince `AiBudget` Durable Object sarmalayıcı ve wrangler binding (yerel, deploy yok).

## P5-002 — WB-016 bütçe ve kota ledger'ı (2026-10-28)

- `apps/worker/src/ai/budget-ledger.ts` (saf, senkron SQL), `budget-object.ts` (`AiBudget` DO, JSON komut protokolü, fail-closed istemci), wrangler `durable_objects` + `new_sqlite_classes` migration'ı; `index.ts` sınıfı dışa aktarır. Testler Node 24 `node:sqlite` ile gerçek SQLite üzerinde (`test/sqlite-store.ts`).
- Kanıt: 8 ledger + 3 DO testi (200 denemede 112 kabul, toplam 4,48 USD; 20.001 µ$ red, 20.000 µ$ tam eşik kabul, sonra her istek red; bilinmeyen maliyet tam harcanır; not_billed iade; 1/gün kota; replay; kalıcılık). `npm run build` DO binding'ini tanıdı.
- Kapılar: typecheck/lint PASS; format, koşu sırasında düzenlenen `docs/PHASE-5.md` nedeniyle FAIL → prettier → PASS; 414 Vitest + 2 + 3, coverage satır %99,09, negatif kapılar, build, secret:scan, Gitleaks PASS; E2E 42/42. Karar ADR-021. Gerçek workerd'de DO SQL: NOT RUN (auth'lu rota yok; staging smoke).

## P5-003 — WB-016 merge ve WB-017 başlangıcı (2026-10-28)

- [PR #25](https://github.com/OguzSoykan/Workflow-Builder/pull/25) [quality 40607895816](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40607895816) PASS sonrası agent squash merge: main `5960e2b`. WB-016 Done.
- `feat/WB-017-ai-access` açıldı. Misafir kararı nedeniyle kart: `/api/v1/ai/*` koruması (`AI_ENABLED`, doğrulanmış e-posta), ledger'a `quota` komutu, `GET /api/v1/ai/limits` (kalan hak + kaba bütçe durumu; tutar sızdırılmaz).

## P5-004 — WB-017 AI erişim politikası (2026-10-28)

- `apps/worker/src/ai/routes.ts`: `/api/v1/ai/*` koruması ve `GET /api/v1/ai/limits`; ledger'a `quota` komutu; `AI_ENABLED` binding'i. OpenAPI'de `getAiLimits` implemented + `AiLimits` şeması.
- 7 test (gerçek SQLite ledger'lı DO): kalan hak 1 → rezervasyon sonrası 0, kişi başı ayrı; AI kapalı/bayrak yok/doğrulanmamış → kapalı; ledger yok veya hatalı → fail-closed; korunan rota sırası (AI_DISABLED → EMAIL_NOT_VERIFIED → 404 henüz rota yok); kaba bütçe eşlemesi. İlk denemede PASS.
- Kapılar: typecheck/lint/format, 421 Vitest + 2 + 3, coverage satır %99,11, negatif kapılar, build, secret:scan, Gitleaks PASS; E2E 42/42.

## P5-005 — WB-017 merge ve WB-018 başlangıcı (2026-10-28)

- [PR #26](https://github.com/OguzSoykan/Workflow-Builder/pull/26) [quality 40608488207](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40608488207) PASS sonrası agent squash merge: main `af9684e`. WB-017 Done.
- Resmi kaynak doğrulaması (28 Ekim 2026): [OpenAI fiyatlandırma](https://developers.openai.com/api/docs/pricing) — `gpt-6-luna` girdi 0,10 / önbellekli 0,01 / çıktı 0,50 USD per 1M token; [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — Responses API `text.format: {type: json_schema, name, schema, strict: true}`, `additionalProperties: false`, tüm alanlar `required`, ret `refusal` ile. API reference sayfası 403 verdi (yanıt alanları guides + bilinen şema ile kuruldu; canlı eval'de doğrulanacak).
- `feat/WB-018-openai-adapter` açıldı. Plan: yalnız fiyatı kodda doğrulanmış model; girdi token üst sınırı = UTF-8 bayt (BPE token ≥ 1 bayt), maliyet tavanı mikro-USD yukarı yuvarlanır; sonuç → ledger uzlaştırması (billed/unknown/not_billed); retry yok; zaman aşımı; mock sağlayıcı; key yalnız Worker secret.

## P5-006 — WB-018 OpenAI adaptörü (2026-10-28)

- `apps/worker/src/ai/provider.ts`: Responses API + strict Structured Outputs, fiyat tablosu, bayt tabanlı maliyet tavanı, uzlaştırma eşlemesi, mock sağlayıcı, `providerFromEnv`; `Bindings`'e `AI_PROVIDER`/`OPENAI_API_KEY`/`AI_MODEL`; `infra/.dev.vars.example`.
- Hatalar: testte `undefined` argümanı varsayılan parametreyi tetikledi (`null` ile düzeltildi), `exactOptionalPropertyTypes` tip hatası. Repo `secret:scan` `.dev.vars.example` içindeki yorum satırı `OPENAI_API_KEY=…` atamasını işaretledi (FAIL); kural gevşetilmedi, satır açıklamaya çevrildi → 0 bulgu.
- Kapılar: typecheck/lint/format, 435 Vitest + 2 + 3, coverage satır %99,14 (provider %100 satır), negatif kapılar, build, secret:scan (düzeltme sonrası), Gitleaks PASS; E2E 42/42. Canlı OpenAI çağrısı yok. Karar ADR-022.

## P5-007 — WB-018 merge ve WB-019 başlangıcı (2026-10-28)

- [PR #27](https://github.com/OguzSoykan/Workflow-Builder/pull/27) [quality 40609133122](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40609133122) PASS sonrası agent squash merge: main `673fdee`. WB-018 Done.
- `feat/WB-019-ai-create` açıldı. Plan: ledger'a sonuç saklama (aynı Idempotency-Key tekrarında model çağrısı yok), strict AI taslak şeması → sunucuda ID/konum/bağlantı üretimi → contract + validator, `POST /api/v1/ai/workflows/generate`, mock üretici, web AI paneli (limit, önizleme, onaylı ve geri alınabilir uygulama).

## P5-008 — WB-019 prompt'tan oluşturma (2026-10-28)

- Worker: ledger'a `result` sütunu/komutu, `ai/draft.ts` (strict taslak şeması, talimat, ID/yerleşim üretimi, mock), `registerGenerateRoute`. Web: `account/ai-api.ts`, `AiPanel`. OpenAPI: generate implemented + `AiGenerateRequest`/`AiProposal`.
- Hatalar: ledger `UPDATE` değişikliği önceki biçimlendirme yüzünden ilk denemede uygulanmadı (`TS6133`), elle düzeltildi; `fail` yardımcısında 422 tipi eksikti; testte kullanıcıya kapsamlı key'in başka kullanıcıda çakışma vereceği yanlış varsayılmıştı (tasarım doğru, beklenti düzeltildi); lint `any`/kullanılmayan değişken; tam koşuda `ai-access` korunan rota testi 404 bekliyordu, rota artık var → 415 (gövde kontrolü) beklentisi; ADR koşu sırasında yazıldığı için format FAIL → prettier.
- Kapılar: typecheck/lint/format, 462 Vitest + 2 + 3, coverage, negatif kapılar, build, secret:scan, Gitleaks PASS; E2E 45/45. Canlı OpenAI çağrısı yok. Karar ADR-023.
