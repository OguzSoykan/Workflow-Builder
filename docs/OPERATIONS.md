# Operasyon ve yayın (WB-023)

Bu belge staging/production'a çıkışın nasıl yapılacağını, kontrol listesini ve geri alma adımlarını tanımlar.
**Staging kuruldu (2026-11-01): `https://workflow-staging.oguzsoykan.com` (Cloudflare custom domain; `workers.dev` kapalı), D1 `workflow-builder-staging`, Firebase `workflow-builder-staging-a31fe`. Production henüz açılmadı (D-12).** Aşağıdaki hesap/secret işlemleri ürün
sahibinin açık onayıyla yapılır.

## Ortamlar (AC-13)

|          | Staging                                                        | Production                                          |
| -------- | -------------------------------------------------------------- | --------------------------------------------------- |
| Worker   | `workflow-builder-staging`                                     | `workflow-builder-production`                       |
| D1       | `workflow-builder-staging` (ayrı)                              | `workflow-builder-production` (ayrı)                |
| AI       | `AI_PROVIDER=mock`, gerçek çağrı yok                           | `AI_PROVIDER=openai`, `AI_ENABLED=false` ile başlar |
| Firebase | Ayrı test projesi                                              | Ayrı üretim projesi                                 |
| Bütçe    | 5 USD tahsisi tek ve ortaktır; ortam başına ayrı bütçe açılmaz | aynı                                                |

Binding'ler ve değişkenler `infra/wrangler.jsonc` içinde ortam başına tanımlıdır (Wrangler devralmaz).
`npm run build` her iki ortamı da dry-run ile derler; `apps/worker/test/environments.test.ts` ayrıklığı denetler.

## Tek seferlik kurulum (ürün sahibi, ortam başına)

1. Cloudflare: `wrangler d1 create workflow-builder-<ortam>` → dönen `database_id`'yi `infra/wrangler.jsonc`
   içindeki yer tutucu (`00000000-…aaaa`/`…bbbb`) yerine yazın. Yer tutucu kaldıkça `npm run deploy:check` deploy'u durdurur.
2. Firebase: ortam başına proje, Authentication → E-posta/Şifre açık; yetkili alan adına Worker adresini ekleyin.
3. Worker değişkenleri: `FIREBASE_PROJECT_ID` → `wrangler.jsonc` `vars`; `FIREBASE_WEB_API_KEY` public olsa da `AIza…` kalıbı
   secret tarayıcılarını tetiklediği için `wrangler secret put FIREBASE_WEB_API_KEY --env <ortam>` ile yüklenir.
   E-posta/şifre sağlayıcısı ve yetkili alan adı Identity Toolkit admin API'siyle de açılabilir (Authentication önce konsoldan başlatılmalı).
4. Secret'lar (yalnız production, AI açılacaksa): `wrangler secret put OPENAI_API_KEY --env production`
   — ayrı OpenAI projesi, mümkünse sabit harcama limiti. Key repoya, loga, sohbete yazılmaz.
5. GitHub: `staging` ve `production` environment'ları; `production` için zorunlu onaylayıcı. Environment secret'ları
   `CLOUDFLARE_API_TOKEN` (yalnız Workers/D1 düzenleme izinli), `CLOUDFLARE_ACCOUNT_ID`; değişken `APP_URL`.

## Yayın kontrol listesi

- [ ] `main` üzerinde `quality` PASS (typecheck, lint, format, unit, security, docs, negatif kapılar, build, E2E, Gitleaks).
- [ ] `npm audit` 0 yüksek bulgu; yeni bağımlılık varsa ADR/gerekçe.
- [ ] Migration'lar geriye uyumlu (yalnız ileri); D1 Time Travel geri yükleme noktası not edildi.
- [ ] Önce staging: Actions → Deploy → `staging`; smoke PASS; elle: giriş, buluta kayıt, simülasyon, (mock) AI.
- [ ] Production: Actions → Deploy → `production` (onaylayıcı); smoke PASS.
- [ ] AI açılacaksa: ledger durumu, `AI_ENABLED=true`, ilk istek ve harcama doğrulaması; 4,50 USD stop korunur.
- [ ] Sonuç STATUS ve çalışma günlüğüne yazılır.

## Ağ notu

Bazı ağlar `*.workers.dev` alan adına TLS bağlantısını engelliyor (staging kurulumunda geliştiricinin ağında görüldü). Doğrulama için
Actions → **Smoke** (`.github/workflows/smoke.yml`, salt okunur) GitHub ağından çalışır. Bu yüzden staging özel alan adında yayındadır; production için `workflow.oguzsoykan.com` ayrılmıştır (kök alan adı kişisel sitedir, kullanılmaz).

## İzleme

- Workers Observability her iki ortamda açık (`observability.enabled`); loglarda prompt, token, e-posta yoktur.
- Her yanıtta `X-Request-ID`; hata zarfı stack/ayrıntı sızdırmaz.
- AI harcaması: ledger toplamları (DO) ve OpenAI proje kullanım paneli; `/api/v1/ai/limits` kaba durum verir.
- Ücretsiz katman: Workers CPU ve D1 okuma/yazma kotaları Cloudflare panelinden izlenir; ölçüm staging'de ilk yayında yapılacaktır (NOT RUN).

## Geri alma

1. Worker: `wrangler rollback --env <ortam>` (önceki sürüme döner) veya önceki commit'ten Deploy workflow'u.
2. AI'ı hemen kapatmak: `AI_ENABLED=false` (değişken) — manuel editör çalışmaya devam eder.
3. D1: migration'lar yalnız ileri; veri sorunu için `wrangler d1 time-travel restore workflow-builder-<ortam> --timestamp <ISO>`.
4. Secret sızıntısı: ilgili key'i sağlayıcıda iptal et, `wrangler secret put` ile yenisini yükle, Gitleaks ile geçmişi tara.
