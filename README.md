# AI Workflow Builder

Görsel veya doğal dil ile workflow tasarlama ve manuel onay/ret ile simülasyon ürünü.
Ürün gereksinimleri [PRD v1.1](docs/PRD.md) içinde korunur.

**26 Ekim 2026:** Faz 1'in şema, canonical SHA-256 hash, saf graph/condition validator,
test/CI ve API/ortam dokümanları yerel devam dalında uygulandı. Kullanıcının onayladığı
30 alan / 256 KiB / case-sensitive / hash varsayılanları geçerlidir.
**Faz 1 çıkış kapısı henüz kapanmadı:** sabit araç zinciriyle temiz kurulum, gerçek
Wrangler/Chromium ve hosted CI/PR kanıtları bu ortamın erişim kısıtları nedeniyle açık.
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
- `test:coverage`: contract/core/Worker Vitest V8 kapsam raporu.
- `test:negative-gates`: geçici tip/assertion hatalarının beklenen şekilde reddini
  kontrol eder, probe dosyalarını temizler; temiz typecheck/test sonrasında çalıştırın.
- `build`: web asset'leri + Worker `deploy --dry-run`; cloud'a yayın yapmaz.
- `secret:scan`: kaynakları ve iki build çıktısını tarar. Önce build gerekir; eksik
  build başarılı sonuç sayılmaz. Her secret veya PII türünü tespit garantisi yoktur.
- Playwright gerçek uygulamayı 8787, yalnız test amaçlı contract Worker fixture'ını
  8788 portunda açar. İki port da boş olmalıdır. Test bundle'ı production asset'lerine eklenmez.
  CI'da Chromium sistem bağımlılıkları `--with-deps` ile kurulur.
- CI tanımı [.github/workflows/ci.yml](.github/workflows/ci.yml) içindedir; bu oturumda
  GitHub üzerinde çalıştırılmadı ve branch protection etkinleştirilmedi.

## Yapı

```text
apps/web/                   React/Vite health ekranı
apps/worker/                Hono health ve JSON hata envelope'u
apps/worker/test/           Binding gerektirmeyen HTTP birim testleri
packages/workflow-contract/ Zod şeması, güvenli parser, serializer ve SHA-256 hash
packages/workflow-core/     Saf graph ve condition validator
tests/e2e/                  Health/hata/timeout ve browser/Worker hash eşitliği
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

## Ortak paketleri kullanma

```ts
import {
  parseWorkflowJSON,
  computeContentHash,
  serializeWorkflow,
} from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';

const parsed = parseWorkflowJSON(jsonText);
if (parsed.success) {
  const result = validateWorkflow(parsed.data);
  if (result.valid) {
    const hash = computeContentHash(parsed.data);
    const snapshot = serializeWorkflow(parsed.data);
    // Caller decides what to do with hash/snapshot; these functions perform no I/O.
  }
}
```

Parser yalnız yapıyı doğrular; çalıştırılabilir graph için validator gerekir.
`canonicalizeWorkflow` layout'u dışlar ve export formatı değildir; export için
`serializeWorkflow` kullanılır. `contentHash` türetilmiş veridir, kimlik doğrulama
veya yetkilendirme sağlamaz. Tip/operator/ID/unknown-key/metadata/migration ayrıntıları
ve issue kodları [ADR-014](docs/adr/ADR-014-workflow-v1.md) içindedir.

OpenAPI bileşenini yenilemek: `npm run docs:sync-api`. TypeScript şemasından üretilen
bileşenin dokümanla eşleşmesi test edilir. Saf validator ölçümü:
`npm run benchmark:validator`; bu yerel ölçüm Cloudflare CPU veya simulator kanıtı değildir.
