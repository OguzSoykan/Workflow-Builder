# Faz 3 — Simülasyon

**Durum:** Kullanıcı onayıyla başladı (28 Ekim 2026). İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-3.md).
Kaynak: PRD FR-04/13, AC-02–04, Workflow Contract §5, BACKLOG WB-009–011, D-14 kararı.

| Kart   | İş                          | Durum       | Kabul                                                                                                |
| ------ | --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| WB-009 | Saf deterministik simülatör | In Progress | Aynı girdi + kararlar = aynı trace; Approval'da bekler; doğru handle/outcome; IO yok; 50 node ölçümü |
| WB-010 | Simülasyon UX               | Backlog     | Girdi formu, adım adım çalıştırma, onay/ret, trace ve yol vurgusu, sonuç                             |
| WB-011 | Örnek akışlar ve E2E        | Backlog     | Satın alma/izin/masraf örnekleri “Örnekten başla” ile yüklenir; her biri E2E simüle edilir           |

## WB-009 uygulama sınırı

- Saf API ve semantik [ADR-017](adr/ADR-017-simulator.md) içinde. UI yok; WB-010 bu API'yi kullanacak.
- Kanıt: 323 Vitest (31 yeni) + 2 scanner + 3 OpenAPI; 29 Chromium; simülatör benchmark median 57 ms (50 node + 48 karar).
