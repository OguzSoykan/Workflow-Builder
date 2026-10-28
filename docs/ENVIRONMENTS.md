# Ortamlar ve yapılandırma

Yerel geliştirme: `npm run dev` built React asset'lerini ve Worker API'sini `http://127.0.0.1:8787` üzerinde sunar;
`npm run db:migrate:local` yerel D1'i hazırlar. Hesap özellikleri `FIREBASE_PROJECT_ID` + `FIREBASE_WEB_API_KEY`,
AI `AI_ENABLED`/`AI_PROVIDER` (+ secret `OPENAI_API_KEY`) ile açılır; ayrıntı `infra/.dev.vars.example`.

| Ortam      | Mevcut durum                         | Yapılandırma / izolasyon                                                                    |
| ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Local      | Çalışır                              | `infra/wrangler.jsonc` kök ayarları, yerel D1/DO (yer tutucu ID), secret yok                |
| CI         | Her PR ve `main` push'unda `quality` | Sabit Node/npm, tüm kapılar, iki ortamın dry-run build'i; production secret veya deploy yok |
| Staging    | Provision edilmedi                   | Ayrı Worker/D1/DO binding'leri, `AI_PROVIDER=mock`; kurulum [OPERATIONS](OPERATIONS.md)     |
| Production | Provision edilmedi                   | Ayrı Worker/D1/DO, `AI_ENABLED=false` ile başlar; elle ve onaylı Deploy workflow'u          |

`npm run build` web build'ini ve üç Worker yapılandırmasının `wrangler deploy --dry-run`'ını çalıştırır; yayın yapmaz.

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

[openapi.json](openapi.json) OpenAPI 3.1; uygulanmış operasyonlar `x-status: implemented` ile işaretlidir
(health, public config, `/api/v1/me`, workflow CRUD/revizyonlar, AI limits/generate/edit). `npm run test:docs`
referansları, rota durumlarını, bearer/204 kurallarını ve JSON Schema derlemesini kontrol eder.
