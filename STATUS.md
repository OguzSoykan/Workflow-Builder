# Proje durumu

**Son güncelleme:** 27 Ekim 2026 (Europe/Istanbul).

**Faz 1 tamamlandı.** PR #5 (`feat(contract): complete Phase 1 workflow validation`)
27 Ekim'de squash merge edildi: `e5ad0ea`. PR check ve merge sonrası main `quality`
check'i geçti. Main run: [40495104283](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40495104283).

Faz 2 kullanıcı onayıyla başladı; aktif görev WB-005A tuval temeli. Cloud deploy ve canlı model çağrısı başlatılmadı. Zod advisory'si aşağıda
açık takip riski olarak kayıtlıdır; Faz 1 kabul testleri/CI'ı engellemedi.

## Aktif çalışma

[Faz 2 planı](docs/PHASE-2.md) ve [adım günlüğü](docs/worklogs/PHASE-2.md).
WB-005A uygulandı; yerel doğrulama ve PR teslimi sürüyor. Aşağıdaki Faz 1 sonuçları tarihsel teslim kanıtıdır.

## Yapılanların özeti

- React web uygulaması ve Hono/Worker health API temeli kuruldu; aynı origin'de çalışıyor.
- Workflow v1 şeması, güvenli JSON parse/serialize, SHA-256 içerik hash'i ve limitler uygulandı.
- Graph bağlantıları, döngüler, erişilebilirlik ve tipli koşullar için saf validator tamamlandı.
- OpenAPI taslağı, ortam ayrımı, ADR'ler ve hata kodları belgelendi.
- Sabit Node/npm kurulumu, testler, gerçek Chromium/Worker kontrolleri, build ve secret taramaları geçti.
- Kod [PR #5](https://github.com/OguzSoykan/Workflow-Builder/pull/5) ile `e5ad0ea`,
  kapanış belgeleri [PR #6](https://github.com/OguzSoykan/Workflow-Builder/pull/6) ile `edb0941` olarak main'e alındı.
  PR #6 sonrası [main CI 40496069027](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40496069027) başarılı.

Görev dalında `/` görsel editör, `/health` servis ekranıdır. Dört adım türü, etiket/konum düzenleme, bağlantı ve silme uygulanmıştır. Taslak yalnız oturum belleğindedir. Simülasyon, kullanıcı hesabı, bulut kayıt ve AI henüz yoktur.

## Sıradaki işler

1. **Açık güvenlik takibi:** Zod advisory'sini ES-only contract/core sınırını koruyarak çözmek.
   Güncel paket/advisory durumu yeniden doğrulanmalı; çözümden sonra npm audit, tip kontrolü,
   şema/validator ve browser/Worker uyumluluğu kanıtlanmalı. Mevcut girdi limitleri açığın
   giderildiği anlamına gelmez.
2. **WB-005A review:** Tuval tesliminin PR/CI kontrolü; adımlar ve kanıtlar çalışma günlüğünde.
3. **Faz 2 devamı:** WB-005B config paneli → tipli input/condition → yerel kayıt ve import/export → validation UX ve undo/redo. D-03/D-08 kararları saklama işinden önce netleşecek.
4. **Sonraki fazlar:** Simülasyon → auth/bulut kayıt → bütçe kontrollü AI → yayın kalitesi.
   Ayrıntılı kapsam ve bağımlılıklar [ROADMAP](ROADMAP.md), yakın işler [TASKS](TASKS.md) içinde.

27 Ekim sonraki kullanıcı talimatı Faz 2 uygulamasını başlattı; güncel sıra Faz 2 planındadır.

## Mevcut durum

| İş          | Durum       | Kanıt / kalan                                                                     |
| ----------- | ----------- | --------------------------------------------------------------------------------- |
| WB-001A/B   | Done        | Main'de; PR #1/#2 birleşti                                                        |
| WB-001C     | Done        | PR #3/#5; gerçek Worker/Chromium health + contract smoke: 10/10                   |
| WB-002A/B/C | Done        | PR #5; şema, hash, round-trip, limit matrisi ve browser/Worker hash vektörü geçti |
| WB-003A/B/C | Done        | PR #5; validator, hostile input, deterministik issue ve coverage geçti            |
| WB-004A     | Done        | PR #4/#5; main quality workflow, pozitif ve beklenen negatif CI kanıtları         |
| WB-004B     | Done        | PR #5; OpenAPI, env, ADR, issue-code ve eşleşme testleri geçti                    |
| WB-004C     | Done        | PR #5 merge; PR ve merge sonrası main quality check geçti                         |
| Faz 2       | In Progress | WB-005A; kullanıcı başlama onayı alındı                                           |
| Faz 3–6     | Başlamadı   | Ayrı faz onayı gerekir                                                            |

Kod öz incelemesi bağımsız insan review olarak gösterilmedi. Main branch protection required `quality` check uygular; approving review sayısı 0 olarak ayarlıdır.

## Onay ve teknik kararlar

Kullanıcı “bunlarla devam” talimatıyla 30 input / 256 KiB, case-sensitive metin,
optional default / null reddi, enum `in` listesi ve konumdan bağımsız içerik hash'ini
onayladı. [DECISIONS](docs/DECISIONS.md) ve [ADR-014](docs/adr/ADR-014-workflow-v1.md)
ID/alan/unknown-key, canonicalization, şema-semantic ayrımı ve hata kodlarını kaydeder.
D-03 taslak saklama ve D-11 AI payload/patch politikaları sonraki fazda açık kalır.

## Faz 1 gerçek doğrulaması (tarihsel)

Repo kökünde sabit Node 24.22.1/npm 11.19.1 ile `npm ci` temiz kuruldu.
Build'ler Wrangler 4.151.3, Vite 8.3.5; test ve tarayıcı aynı sabit lockfile
bağımlılıklarıyla çalıştı. Global Node ayarı değişmedi.

| Kontrol                                                     | Sonuç                                                                                               |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm ci`                                                    | PASS; lockfile ile temiz kurulum                                                                    |
| `npm run typecheck`, `npm run lint`, `npm run format:check` | PASS                                                                                                |
| `npm test`                                                  | PASS: 179 Vitest + 2 scanner + 3 API doküman testi                                                  |
| `npm run test:coverage`                                     | PASS; satır %99,09 / branch %94,01; core satır %100                                                 |
| `npm run test:negative-gates`                               | PASS; tip ve assertion gate'leri beklenen şekilde reddetti                                          |
| `npm run build`                                             | PASS; Vite build + Wrangler Worker dry-run, deploy yok                                              |
| `npm run secret:scan`                                       | PASS; 90 kaynak/build dosyasında bulgu yok                                                          |
| `npm run secrets:check`                                     | PASS; Git geçmişi, kaynak ve web/Worker artifact tarandı                                            |
| `npm run secrets:self-test`                                 | PASS; sentetik token yakalandı, gerçek credential kullanılmadı                                      |
| `npm run test:e2e`                                          | PASS; 10 Chromium testi, gerçek local Worker health ve hash vektörü dahil                           |
| `npm run benchmark:validator`                               | PASS; M1 Pro/Node 24.22.1, 50 node/97 edge/1000 örnek: median 0,589 ms, p95 0,886 ms                |
| `npm audit`                                                 | 1 yüksek Zod bulgusu; ayrıntısı aşağıda                                                             |
| GitHub hosted PR check                                      | PASS; [PR run 40494769664](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40494769664) |

Güncel dalda GitHub Actions workflow'u checksum ile sabitlenmiş action sürümleri,
Node/npm pinleri, tam Gitleaks taraması ve Faz 1 kalite kapılarını içerir. Önceki
hosted negatif denemeler API'den doğrulandı: tip hatası Typecheck adımında,
bozuk assertion Unit tests adımında başarısız oldu. Main'de zorunlu `quality` check'i ve PR kuralı mevcut; required approving review sayısı sıfır. PR ve main run bağlantıları yukarıda.

Zod 4.3.6, bağımlılık taramasında `GHSA-mrhx-c7xc-m3w5` yüksek bulgusunu taşıyor.
Önerilen Zod 4.6.7'ye geçiş saf contract/core TypeScript derlemesinde DOM `URL`
tiplerini zorunlu kılıyor; deneme bu nedenle reddedildi ve mimaride onaysız
ortam tipi eklenmedi. Zod öncesi JSON-tree parser 12 derinlik, 20.000 değer,
256 KiB sınırları koyuyor; ancak bu, advisory'yi ortadan kaldırmaz. Bu Faz 1
çıkışında açık güvenlik riski olarak kalır ve şema sürüm yükseltmesi/uyumluluk
çözümü gerektirir.

`npm ci` install-script izin uyarısı iki platforma özel `fsevents` kopyası içindi;
repo allowScripts kuralları değişmedi. `npm audit fix --force` çalıştırılmadı.
Faz 1 çıkışı tamamlandı; Faz 2 için başlama onayı alındı.

## Önceki teslimler

- `6700239`: orijinal planlama paketi; `775b001`: yönetim temeli.
- `18a9018` / `1fae401`: workspace / health main commit'leri.
- `09f8326`: test/CI/API taslağı; `d91a7a7`: ilk devam oturumunun kanıt kaydı.
- PR #1 geçmiş kullanıcı oturum onayıyla birleştirildi; aynı hesabın bağımsız
  Approve review verdiği iddia edilmez. PR #5 `e5ad0ea` olarak squash merge edildi; merge sonrası main `quality` check geçti.

## Bu teslimin commit'leri

- `c035cce`: WB-002 şema/parser/hash/fixture, onay kaydı ve OpenAPI eşlemesi.
- `294fc2f`: WB-003 validator ve browser/Worker uyumluluk test hazırlığı.
- `e5ad0ea`: PR #5 squash teslimi; `edb0941`: PR #6 Faz 1 kapanış belgeleri.

Önceki offline kaynak incelemesi: 85 dosya + 4 web/test bundle artifact'inde imza eşleşmesi yok;
75 yerel Markdown bağlantısı sağlam, 8 orijinal belge değişmedi. Core/contract'a
eklenen geçici compiler probe'larında URL/fetch/process ayrı ayrı reddedildi;
ES-only sınırı korunuyor. Probe'lar temizlendi.
