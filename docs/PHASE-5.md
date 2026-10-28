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
