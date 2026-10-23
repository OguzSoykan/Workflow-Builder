# Ortamlar ve yapılandırma

Faz 1 yalnızca yerel React + Worker health iskeletidir. Hiçbir değişken, hesap,
Firebase/D1/DO binding'i veya API anahtarı gerekmez. `npm run dev`, built React
asset'lerini ve `/api/health` rotasını `http://127.0.0.1:8787` üzerinde sunar.
`npm run dev:web` isteğe bağlı Vite geliştirme sunucusudur; API için ayrıca
`npm run dev:worker` çalışmalıdır.

| Ortam      | Mevcut durum                                                 | Yapılandırma / izolasyon                                                                                             |
| ---------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Local      | Uygulama hedefi mevcut; bu oturumda Wrangler çalıştırılamadı | `infra/wrangler.jsonc`, hesap/binding/key yok; örnek dosyaları kopyalamak gerekmez                                   |
| CI         | Workflow tanımlı, hosted çalıştırma bekliyor                 | Sabit Node/npm, `npm ci`, unit/security/docs/negatif kapılar, build ve Playwright; production secret veya deploy yok |
| Staging    | Provision edilmedi                                           | Yalnızca Wrangler ortam adı var; sonraki fazda ayrı D1 ve Firebase test yapılandırması, varsayılan mock AI           |
| Production | Provision edilmedi                                           | Ayrı Worker/D1/secret yapılandırması ve açık deploy yetkisi sonraki fazlarda gerekir                                 |

Wrangler ortam adlarının bulunması cloud kaynağı yaratıldığı anlamına gelmez.
`npm run build` web build ve `wrangler deploy --dry-run` çalıştırır; yayın yapmaz.
Staging/prod config'i bu aşamada deploy için hazır sayılmaz.

## Public ve secret ayrımı

- [.env.example](../.env.example) yalnızca browser/public yapılandırmayı açıklar.
  `VITE_*` değişkenleri build çıktısına girer ve kullanıcı tarafından okunabilir.
- [infra/.dev.vars.example](../infra/.dev.vars.example) gelecekteki server secret
  adlarını yalnızca yorum satırı ve yer tutucularla gösterir. Gerçek `.dev.vars`
  dosyası config'in yanında tutulur; `.env*`, `.dev.vars*` ve private-key dosyaları
  Git ignore kapsamındadır. Gerçek dosyalar repoya veya CI artifact'ine eklenmez.
- OpenAI anahtarı, Turnstile secret, oturum imzalama anahtarı veya Firebase
  service-account private key hiçbir zaman frontend değişkeni olmaz.
- Firebase istemci yapılandırması public olabilir; kimlik doğrulama ve ownership
  kontrollerinin yerine geçmez. Faz 1 bu entegrasyonu uygulamaz.
- 5 USD toplam bütçe ve 4,50 USD stop sınırı staging/prod/live eval dahil ortak
  kapsamda korunmalıdır. Ayrı ortamlarda bağımsız bütçe açılmaz; D-07/D-12 açık.

## API taslağı

[openapi.json](openapi.json) OpenAPI 3.1 taslağıdır. Yalnızca `/api/health`
uygulanmıştır; `/api/v1` rotaları `x-status: planned` olarak işaretlidir.
`WorkflowDraft`, AI payload'ları ve ürün politikaları açık `TBD` alanlarıdır;
runtime doğrulama şeması olarak kullanılamaz. `npm run test:docs` yerel referansları,
rota durumlarını, bearer/204 kurallarını, JSON Schema derlemesini ve mevcut
health/error örneklerini kontrol eder; kapsamlı bir harici OpenAPI linter'ı değildir.
