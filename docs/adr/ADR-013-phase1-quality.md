# ADR-013 — Faz 1 test ve kalite kapıları

**Tarih:** 23 Ekim 2026. **Durum:** Uygulandı; tam kurulum, Wrangler/Playwright ve
hosted CI doğrulaması bekliyor. WB-001C, WB-004A ve WB-004B hazırlığı.

Vitest, Worker'ın Hono uygulamasını network/binding olmadan `app.request` ile
kontrol eder. Bu test Worker runtime entegrasyonu diye sunulmaz. Playwright built
SPA ve API'yi tek gerçek Wrangler local origin'inde kontrol eder. API erişim
hatası, hatalı JSON/yanıt, HTTP hatası, timeout ve yeniden deneme senaryoları vardır.
Harici model çağrısı veya cloud deployment yoktur.

`tsconfig.test.json` testlere Node/DOM tiplerini ayrı sağlar; contract/core üretim
config'leri ES-only kalır. Test config'leri de typecheck'e dahildir. Vitest ve V8
coverage aynı sürüme sabitlenir; keyfi coverage yüzdesi kotası eklenmez.

CI yalnızca `contents: read` ister. Typecheck, lint, format, coverage, security/doc
testleri, kasıtlı bozuk tip/assertion deneyleri, web/Worker dry build, secret scan ve
browser smoke çalıştırır. Negatif deneyler `finally` içinde temizlenir ve yalnızca
beklenen TypeScript/assertion hatası kabul edilir; eksik executable başarı sayılmaz.
Hosted pozitif ve ayrı başarısız PR check kanıtlarının yerine yerel test yazılmaz.

Secret scanner bağımlılıksızdır; Git kaynaklarını ve ignore edilmiş iki build
dizinini birlikte tarar. Eksik build veya okunamayan dosyada hata verir. Bilinen
credential/private-key biçimlerini yakalar; yalnızca dosya/rule adını yazar, eşleşen
secret değerini yazmaz. Sentetik fixture testleri kaynak/build tespiti ve çıkış
kodunu doğrular. Bu dar imza taraması her secret biçimini veya PII'yi bulmayı garanti
etmez; diff incelemesi de gereklidir.

OpenAPI JSON seçimi ek YAML parser ihtiyacını kaldırır. Ajv yalnızca development
bağımlılığıdır; JSON Schema 2020 örneklerini ve şemaları doğrular. Tam OpenAPI
standart linter'ı iddiası yoktur. Açık ürün kararları taslakta açıkça korunur.

## Kaynaklar

- [Vitest coverage](https://vitest.dev/guide/coverage)
- [Playwright web server](https://playwright.dev/docs/test-webserver)
- [OpenAPI specification](https://spec.openapis.org/oas/latest.html)
