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
