# AI Workflow Builder

Görsel veya doğal dil ile workflow tasarlama ve manuel onay/ret ile simülasyon ürünü.
Ürün gereksinimleri [PRD v1.1](docs/PRD.md) içinde korunur.

**23 Ekim 2026:** Workspace ve React/Worker health iskeleti main'de. Devam dalında
Vitest/Playwright testleri, CI/secret kontrolleri, OpenAPI taslağı ve ortam belgeleri
hazırlandı. **Faz 1 henüz tamamlanmadı:** workflow şeması/hash/validator açık ürün
kararlarını; tam kurulum, Wrangler smoke ve hosted CI ağ erişimini bekliyor.
Gerçek sonuçlar [STATUS](STATUS.md) ve [Faz 1 kanıtında](docs/verification/PHASE-1.md).

## Kurulum ve çalıştırma

Node **24.22.1**, npm **11.19.1** kullanılır. `.nvmrc` ve `engine-strict` sürümü
sabitler; mevcut global Node kurulumunu değiştirmek gerekmez. Bir sürüm yöneticisi
veya resmi Node dağıtımı ile bu sürümü seçin. Kökten tek lockfile ile kurun:

```sh
node --version
npm --version
npm ci
npm run dev
```

`http://127.0.0.1:8787` built React uygulamasını, `/api/health` aynı origin'deki
Worker yanıtını sunar. Faz 1 için hesap, `.env`, API anahtarı veya cloud kaynağı yoktur.
İsteğe bağlı hızlı frontend geliştirmede iki terminalde `npm run dev:worker` ve
`npm run dev:web` kullanın. [Ortam ayrımı](docs/ENVIRONMENTS.md).

## Kontroller

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run test:negative-gates
npm run build
npm run secret:scan
npx --no-install playwright install chromium
npm run test:e2e
```

- `npm test`: Vitest Worker testleri, bağımsız Node secret scanner ve API doküman testleri.
- `test:coverage`: Vitest V8 kapsam raporu; henüz uygulanmamış contract/core için
  coverage iddiası yoktur.
- `test:negative-gates`: geçici tip/assertion hatalarının beklenen şekilde reddini
  kontrol eder, probe dosyalarını temizler; temiz typecheck/test sonrasında çalıştırın.
- `build`: web asset'leri + Worker `deploy --dry-run`; cloud'a yayın yapmaz.
- `secret:scan`: kaynakları ve iki build çıktısını tarar. Önce build gerekir; eksik
  build başarılı sonuç sayılmaz. Her secret veya PII türünü tespit garantisi yoktur.
- Playwright gerçek Wrangler local sunucusunu açar; 8787 portu boş olmalıdır.
  CI'da Chromium sistem bağımlılıkları `--with-deps` ile kurulur.
- CI tanımı [.github/workflows/ci.yml](.github/workflows/ci.yml) içindedir; bu oturumda
  GitHub üzerinde çalıştırılmadı ve branch protection etkinleştirilmedi.

## Yapı

```text
apps/web/                   React/Vite health ekranı
apps/worker/                Hono health ve JSON hata envelope'u
apps/worker/test/           Binding gerektirmeyen HTTP birim testleri
packages/workflow-contract/ Şema için public entry point; henüz boş
packages/workflow-core/     Saf validator için public entry point; henüz boş
tests/e2e/                  Playwright health/hata/yeniden deneme/timeout
scripts/                    Secret, API taslağı ve negatif kapı kontrolleri
infra/wrangler.jsonc        Tek Worker + statik asset; local ve ortam adları
docs/openapi.json           Health + planlanan API rotaları; açık TBD alanları
docs/verification/          Gerçek doğrulama kayıtları
```

Web/Worker yalnızca ortak paketlerin public export'larını kullanır. Core/contract
UI, ağ, DB veya sağlayıcı SDK'sına bağımlı değildir. Editor, simulator, auth, D1,
Durable Object ve AI uygulaması sonraki fazlardadır.

## Plan ve çalışma kuralları

[AGENTS](AGENTS.md), [TASKS](TASKS.md), [ROADMAP](ROADMAP.md),
[açık kararlar](docs/DECISIONS.md), [Git süreci](docs/DEVELOPMENT.md) ve
[belge dizini](docs/README.md). Orijinal sekiz planlama belgesi değiştirilmez.

[GitHub deposu](https://github.com/OguzSoykan/Workflow-Builder).
5 USD toplam AI bütçesi / 4,50 USD stop kararı korunur; Faz 1 canlı model çağrısı yapmaz.
