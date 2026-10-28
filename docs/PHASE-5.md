# Faz 5 — AI ve bütçe koruması

**Durum:** Kullanıcı onayıyla başladı (28 Ekim 2026). İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-5.md).
Kaynak: PRD FR-06–08/12, AC-06/07/09–11, Architecture §4, Data Model §5–6, API Contract §5, DECISIONS Faz 5 kararları.

| Kart   | İş                                                    | Durum   | Kabul                                                                                        |
| ------ | ----------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| WB-016 | Durable Object bütçe/kota ledger'ı, idempotency       | Review  | Rezervasyonlar 4,50 USD'yi aşmaz; eşikte çağrı yok; fail-closed; tekrar eden istek tek çağrı |
| WB-017 | Üye kotası ve AI erişim politikası (misafir yok)      | Backlog | Doğrulanmış üye 1/gün; misafir ve doğrulanmamış üye reddedilir; AI kapalıyken manuel akış    |
| WB-018 | OpenAI adaptörü, Structured Outputs, mock, kullanım   | Backlog | Key secret; model hataları; otomatik pahalı retry yok; kullanım → maliyet                    |
| WB-019 | Prompt'tan workflow oluşturma + önizleme/uygula       | Backlog | Sunucu doğrulaması; sessiz üzerine yazma yok                                                 |
| WB-020 | AI düzenleme patch'i, semantik diff, stable ID        | Backlog | Eski hash reddedilir; değişmeyen ID'ler korunur                                              |
| WB-021 | Onay/ret/geri al UX; 20 prompt kalite değerlendirmesi | Backlog | Reddedilen değişiklik kalıcı olmaz; canlı eval kullanıcı key'iyle, ≥%85 hedefi               |

## WB-016 uygulama sınırı

- Ayrıntılar [ADR-021](adr/ADR-021-ai-budget-ledger.md). Henüz AI rotası yok; ledger WB-018/019'da sağlayıcı çağrısını sarar.
- Kanıt: gerçek SQLite üzerinde ledger testleri, DO protokol/fail-closed testleri, build dry-run'da DO binding'i.

## WB-017 uygulama sınırı

- `/api/v1/ai/*` koruması: `AI_ENABLED` “true” değilse `403 AI_DISABLED`, doğrulanmamış e-posta `403 EMAIL_NOT_VERIFIED`; ledger çağrısından önce. Misafir yolu ve Turnstile yoktur (kullanıcı kararı).
- `GET /api/v1/ai/limits`: `aiEnabled`, `memberRemaining` (UTC günü 1 hak), kaba `budgetState` (ok/low/exhausted/unavailable); ledger tutarları açılmaz, ledger yoksa AI kapalı.

## WB-018 uygulama sınırı

- Ayrıntılar [ADR-022](adr/ADR-022-openai-adapter.md). Henüz rota yok; WB-019 sağlayıcıyı ledger rezervasyonu ve uzlaştırmasıyla sarar.
- `infra/.dev.vars.example` yalnız yer tutucu içerir; key satırı açıklama olarak yazıldı (repo secret taraması atama biçimini haklı olarak yakaladı).

## WB-019 uygulama sınırı

- Ayrıntılar [ADR-023](adr/ADR-023-ai-create.md): `POST /api/v1/ai/workflows/generate`, ledger'da saklı yanıt ile idempotent tekrar, strict taslak şeması → sunucuda ID/yerleşim → contract + validator; web “AI ile oluştur” paneli (kalan hak, önizleme, onaylı ve geri alınabilir uygulama, ret hiçbir şey yazmaz).
- Kanıt: 462 Vitest + 2 scanner + 3 OpenAPI; 45 Chromium. Canlı model: NOT RUN (WB-021).

## WB-020 uygulama sınırı

- Ayrıntılar [ADR-024](adr/ADR-024-ai-edit-patch.md): çekirdekte `applyPatch`/`diffWorkflows`, `POST /api/v1/ai/workflows/edit`, AI panelinde “Bu akışı düzenle” modu (diff özeti, uygulamadan önce hash kontrolü).
- Kanıt: 488 Vitest + 2 scanner + 3 OpenAPI; 47 Chromium. Canlı model: NOT RUN (WB-021).
