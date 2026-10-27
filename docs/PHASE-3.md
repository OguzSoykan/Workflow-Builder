# Faz 3 — Simülasyon

**Durum:** WB-009/010 main’de; WB-011 Review. PR merge edilince Faz 3 kartları tamamlanır; Faz 4 ayrı onay gerektirir. İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-3.md).
Kaynak: PRD FR-04/13, AC-02–04, Workflow Contract §5, BACKLOG WB-009–011, D-14 kararı.

| Kart   | İş                          | Durum       | Kabul                                                                                                |
| ------ | --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| WB-009 | Saf deterministik simülatör | In Progress | Aynı girdi + kararlar = aynı trace; Approval'da bekler; doğru handle/outcome; IO yok; 50 node ölçümü |
| WB-010 | Simülasyon UX               | Backlog     | Girdi formu, adım adım çalıştırma, onay/ret, trace ve yol vurgusu, sonuç                             |
| WB-011 | Örnek akışlar ve E2E        | Backlog     | Satın alma/izin/masraf örnekleri “Örnekten başla” ile yüklenir; her biri E2E simüle edilir           |

## WB-009 uygulama sınırı

- Saf API ve semantik [ADR-017](adr/ADR-017-simulator.md) içinde. UI yok; WB-010 bu API'yi kullanacak.
- Kanıt: 323 Vitest (31 yeni) + 2 scanner + 3 OpenAPI; 29 Chromium; simülatör benchmark median 57 ms (50 node + 48 karar).

## WB-010 uygulama sınırı

- Tuvalin altındaki Simülasyon paneli: “yalnız simülasyon” etiketi, tipli girdi formu (boş kontrol gönderilmez; varsayılan ve D-14 zorunluluk kuralı core'da), başlat/yeniden başlat/temizle.
- Onay adımında rol ile birlikte Onayla/Reddet; adım kaydı Türkçe (koşul özeti ve gerçek değer dahil); tuvalde mevcut adım, izlenen adımlar ve bağlantılar vurgulanır.
- İş mantığı değişirse (içerik hash'i) run “eski” olur, karar düğmeleri kapanır ve vurgu kalkar; yalnız konum değişimi run'ı bozmaz. Geçersiz akışta panel önce doğrulamayı ister. Run yalnız bellekte.
- Kanıt: 327 Vitest + 2 scanner + 3 OpenAPI; 31 Chromium; 390px mobil görünüm incelendi.

## WB-011 uygulama sınırı ve Faz 3 çıkışı

- Üç sentetik örnek (`apps/web/src/editor/examples.ts`): satın alma (`tutar > 10000` → yönetici onayı), izin (5 günü aşan izin yönetici + İK, kısa izin ekip lideri), masraf (faturasız ret, `tutar >= 2500` finans onayı). Eşikler normal koşul ayarlarıdır, kullanıcı değiştirebilir.
- “Örnekten başla” paneli onay ister, her yüklemede yeni workflowId verir; yükleme geri alınabilir ve otomatik kaydedilir.
- Simülasyon panelinde `select` girdileri etikete `htmlFor` ile bağlandı (seçenek metinleri erişilebilir adı bozuyordu).
- Kanıt: her örnek geçerli; 9 senaryo unit testi; 4 Chromium senaryosu (her örnek UI'dan uçtan uca simüle edilir, AC-03/04 dahil). Toplam 340 Vitest + 2 scanner + 3 OpenAPI; 35 Chromium.
- Faz 3 çıkış ölçütleri (ROADMAP): aynı girdi/karar aynı trace (unit), Approval'da durma ve doğru handle/outcome (unit + E2E), harici IO yok (saf core), 50 node ölçümü (median 57 ms, M1 Pro), örnek E2E. Kalan: bağımsız insan review yok; React Flow tip yaması upstream bekliyor.
