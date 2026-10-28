# ADR-021 — Global AI bütçe ve kota ledger'ı

**Durum:** Kabul edildi (28 Ekim 2026). **Kart:** WB-016. Kaynak: Architecture §4, Data Model §6, D-07, Faz 5 kararları.

## Karar

- Tek SQLite tabanlı Durable Object (`AI_BUDGET`, ad `global`), sınıf `AiBudget`. Mantık saf
  `BudgetLedger` sınıfındadır ve DO `storage.sql` arayüzüyle çalışır; tüm kontrol ve yazmalar
  senkron olduğundan DO içinde başka istek araya giremez (atomik rezervasyon).
- Tutarlar tam sayı mikro-USD. Rezervasyon yalnız `committed + outstanding + max ≤ 4.500.000` iken
  kabul edilir; eşiğe ulaşıldığında yeni çağrı yoktur. `committed` = faturalanan gerçek maliyet +
  bilinmeyen maliyette tam rezervasyon; `outstanding` = bekleyen rezervasyonlar.
- Uzlaştırma: `billed` gerçek maliyeti (tahmini aşsa da) kaydeder; `unknown` tam rezervasyonu harcar;
  `not_billed` (istek gönderilemedi/üretim öncesi ret) bütçe ve kotayı iade eder. Bekleyen rezervasyon
  süreyle serbest bırakılmaz (fail-closed). Uzlaştırma bir kez yapılır; sonraki çağrılar durumu döndürür.
- Kota: kişi başına UTC günü 1 istek (misafir yok). Aynı `requestId` tekrarında yeni rezervasyon,
  kota tüketimi veya sağlayıcı çağrısı olmaz; başka kişiyle aynı ID `IDEMPOTENCY_CONFLICT`.
- Worker istemcisi binding yoksa, DO hata verirse veya yanıt bozuksa `AI_LEDGER_UNAVAILABLE` döner;
  AI kapalı sayılır, manuel editör çalışmaya devam eder.

## Kanıt

`node:sqlite` (gerçek SQLite) üzerinde 8 ledger testi: 200 rezervasyon denemesinde sınırın aşılmaması,
tam eşik, fail-closed, iade, günlük kota, idempotency, tahmin üstü maliyet, kalıcılık. DO protokol ve
fail-closed istemci testleri. `wrangler deploy --dry-run` binding'i `env.AI_BUDGET (AiBudget)` olarak tanır.

## Sonuçlar

Takılı kalan bir rezervasyon (Worker çökmesi) bütçede kalır; elle uzlaştırma aracı yoktur. Gerçek
workerd üzerinde DO SQL çalışması bu kartta otomatik test edilmedi (yerel E2E auth gerektiriyor);
staging smoke'ta doğrulanmalıdır.
