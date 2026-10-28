# Proje durumu

**Son güncelleme:** 27 Ekim 2026 (Europe/Istanbul).

**Faz 1 tamamlandı.** PR #5 (`feat(contract): complete Phase 1 workflow validation`)
27 Ekim'de squash merge edildi: `e5ad0ea`. PR check ve merge sonrası main `quality`
check'i geçti. Main run: [40495104283](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40495104283).

**Faz 5 başladı (28 Ekim, kullanıcı onayı):** [plan](docs/PHASE-5.md), [günlük](docs/worklogs/PHASE-5.md). WB-016 bütçe ledger'ı [PR #25](https://github.com/OguzSoykan/Workflow-Builder/pull/25) (`5960e2b`) ile main'de ([ADR-021](docs/adr/ADR-021-ai-budget-ledger.md)). WB-017 AI erişim politikası [PR #26](https://github.com/OguzSoykan/Workflow-Builder/pull/26) (`af9684e`) ile main'de. WB-018 OpenAI adaptörü [PR #27](https://github.com/OguzSoykan/Workflow-Builder/pull/27) (`673fdee`) ile main'de ([ADR-022](docs/adr/ADR-022-openai-adapter.md)). WB-019 oluşturma [PR #28](https://github.com/OguzSoykan/Workflow-Builder/pull/28) (`80b1c24`) ile main'de ([ADR-023](docs/adr/ADR-023-ai-create.md)). WB-020 AI düzenleme patch/diff uygulandı ([ADR-024](docs/adr/ADR-024-ai-edit-patch.md)). Ücretli OpenAI çağrısı yapılmadı. Faz 4 tamamlandı: WB-012–015 PR #21–#24 ile main'de (`561efb6`).

**Faz 4 başladı (28 Ekim, kullanıcı onayı):** [plan](docs/PHASE-4.md), [günlük](docs/worklogs/PHASE-4.md). WB-013 token doğrulaması ve `/me` [PR #21](https://github.com/OguzSoykan/Workflow-Builder/pull/21) (`89f6e45`) ile main'de ([ADR-018](docs/adr/ADR-018-firebase-token-verification.md)). WB-014 D1 workflow API [PR #22](https://github.com/OguzSoykan/Workflow-Builder/pull/22) (`2cfc5c9`) ile main'de ([ADR-019](docs/adr/ADR-019-d1-workflow-storage.md)). WB-012 hesap arayüzü [PR #23](https://github.com/OguzSoykan/Workflow-Builder/pull/23) (`65729d8`) ile main'de ([ADR-020](docs/adr/ADR-020-browser-auth.md)). WB-015 buluta kayıt ve revizyon listesi uygulandı; kapılar PASS (403 Vitest, 42 E2E). Merge sonrası Faz 4 tamamlanır; Faz 5 (AI, bütçe) ayrı onay ister. Gerçek Firebase projesi/D1 açılmadı (D-12). Faz 3 tamamlandı: WB-009–011 PR #18–#20 ile main'de (`c30bc4a`).

**Faz 3 başladı (28 Ekim, kullanıcı onayı):** WB-009 saf simülatör [PR #18](https://github.com/OguzSoykan/Workflow-Builder/pull/18) (`1f148c1`) ile main'de ([ADR-017](docs/adr/ADR-017-simulator.md)). WB-010 simülasyon paneli [PR #19](https://github.com/OguzSoykan/Workflow-Builder/pull/19) (`e7b18f9`) ile main'de. WB-011 uygulandı: satın alma/izin/masraf örnekleri “Örnekten başla” ile yüklenir ve her biri E2E simüle edilir. Yerel kapılar PASS (340 Vitest, 35 E2E); PR ve hosted CI bekleniyor. Merge sonrası Faz 3 tamamlanır; Faz 4 (auth/D1) ayrı onay ister. Plan [Faz 3](docs/PHASE-3.md), günlük [PHASE-3 worklog](docs/worklogs/PHASE-3.md). **Faz 2 tamamlandı:** WB-005–008 PR #8–#16 ile main'de (`e7e3e0e`), merge sonrası main quality PASS ([40563748969](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40563748969)). Cloud deploy ve canlı model çağrısı başlatılmadı. Zod advisory'si Zod 4.6.7 ile kapatıldı ([ADR-016](docs/adr/ADR-016-zod-declarations.md)); `npm audit` 0 bulgu.

## Aktif çalışma

[Faz 2 planı](docs/PHASE-2.md) ve [adım günlüğü](docs/worklogs/PHASE-2.md).
WB-005A temeli PR #8, mobil tuval/mini harita düzeltmesi [PR #9](https://github.com/OguzSoykan/Workflow-Builder/pull/9) ile main'e alındı (`9ddbc8a`). PR #9 güncel main ile yenilendi; [quality 40546965579](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40546965579) PASS sonrası kullanıcı talimatıyla birleştirildi.

WB-005B [PR #10](https://github.com/OguzSoykan/Workflow-Builder/pull/10) (`d47d1bd`), WB-006A [PR #11](https://github.com/OguzSoykan/Workflow-Builder/pull/11) (`30699d8`) ve WB-006B koşul/onay dalı deneyimi [PR #12](https://github.com/OguzSoykan/Workflow-Builder/pull/12) (`431e24a`, kullanıcı merge izniyle) main'de. Codex oturumu kota nedeniyle durdu, Claude Code devraldı (P2-026). D-03/D-08 kullanıcı onayıyla karara bağlandı (DECISIONS). WB-007A yerel taslak kaydı [PR #13](https://github.com/OguzSoykan/Workflow-Builder/pull/13) (`9960e7a`) main'de; kullanıcı kalan Faz 2 PR'larının CI sonrası agent merge'üne izin verdi. WB-007B import/export [PR #14](https://github.com/OguzSoykan/Workflow-Builder/pull/14) (`9f0e8b1`) main'de. WB-008A validation UX [PR #15](https://github.com/OguzSoykan/Workflow-Builder/pull/15) (`66cf83d`) main'de. WB-008B uygulandı: bellekte 50 adımlık undo/redo (sürükleme tek adım, import geri alınabilir, kısayollar form alanı dışında) ve Faz 2 uçtan uca çıkış senaryosu. Yerel typecheck/lint/format, 292 Vitest + 2 scanner + 3 OpenAPI, coverage, 29/29 E2E (yeni spec'ler 5 tekrar 55/55), build ve Gitleaks PASS. Bu PR merge edilince WB-005–008 tamamlanır; Faz 3 ayrı kullanıcı onayı gerektirir.

## Yapılanların özeti

- React web uygulaması ve Hono/Worker health API temeli kuruldu; aynı origin'de çalışıyor.
- Workflow v1 şeması, güvenli JSON parse/serialize, SHA-256 içerik hash'i ve limitler uygulandı.
- Graph bağlantıları, döngüler, erişilebilirlik ve tipli koşullar için saf validator tamamlandı.
- OpenAPI taslağı, ortam ayrımı, ADR'ler ve hata kodları belgelendi.
- Sabit Node/npm kurulumu, testler, gerçek Chromium/Worker kontrolleri, build ve secret taramaları geçti.
- Kod [PR #5](https://github.com/OguzSoykan/Workflow-Builder/pull/5) ile `e5ad0ea`,
  kapanış belgeleri [PR #6](https://github.com/OguzSoykan/Workflow-Builder/pull/6) ile `edb0941` olarak main'e alındı.
  PR #6 sonrası [main CI 40496069027](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40496069027) başarılı.

Görev dalında `/` görsel editör, `/health` servis ekranıdır. Dört adım türü, özellik paneli, tipli giriş alanları, koşul ayarı, etiket/konum düzenleme, bağlantı ve silme uygulanmıştır. Taslak tarayıcının localStorage alanında otomatik saklanır. Simülasyon, kullanıcı hesabı, bulut kayıt ve AI henüz yoktur.

## Sıradaki işler

1. **Faz 5:** WB-016 merge → WB-017 üye kotası/erişim → WB-018 OpenAI adaptörü (mock) → WB-019 oluşturma → WB-020 düzenleme → WB-021 onay UX ve kullanıcı key'iyle canlı eval. Gerçek Firebase/D1 staging kurulumu (D-12) ayrıca kullanıcı kararıdır. Gerçek Firebase projesi bağlanınca staging smoke gerekir.
2. **Açık takip:** React Flow declaration yaması upstream [#6038](https://github.com/xyflow/xyflow/issues/6038) düzeltmesi yayınlanınca kaldırılacak (ADR-015); düzeltme PR'ları #6039/#6045/#6060 27 Ekim'de açık. Bağımsız insan review yok.
3. **Tamamlanan güvenlik takibi:** Zod 4.6.7 + saf paketlerde `skipLibCheck` (ADR-016); ES-only sınırı probe ile doğrulandı.
4. **Sonraki fazlar:** Simülasyon → auth/bulut kayıt → bütçe kontrollü AI → yayın kalitesi.
   Ayrıntılı kapsam ve bağımlılıklar [ROADMAP](ROADMAP.md), yakın işler [TASKS](TASKS.md) içinde.

27 Ekim sonraki kullanıcı talimatı Faz 2 uygulamasını başlattı; güncel sıra Faz 2 planındadır.

## Mevcut durum

| İş          | Durum     | Kanıt / kalan                                                                     |
| ----------- | --------- | --------------------------------------------------------------------------------- |
| WB-001A/B   | Done      | Main'de; PR #1/#2 birleşti                                                        |
| WB-001C     | Done      | PR #3/#5; gerçek Worker/Chromium health + contract smoke: 10/10                   |
| WB-002A/B/C | Done      | PR #5; şema, hash, round-trip, limit matrisi ve browser/Worker hash vektörü geçti |
| WB-003A/B/C | Done      | PR #5; validator, hostile input, deterministik issue ve coverage geçti            |
| WB-004A     | Done      | PR #4/#5; main quality workflow, pozitif ve beklenen negatif CI kanıtları         |
| WB-004B     | Done      | PR #5; OpenAPI, env, ADR, issue-code ve eşleşme testleri geçti                    |
| WB-004C     | Done      | PR #5 merge; PR ve merge sonrası main quality check geçti                         |
| Faz 2       | Review    | WB-008B Review; WB-005–008A main’de                                               |
| Faz 3–6     | Başlamadı | Ayrı faz onayı gerekir                                                            |

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

Tarihsel: Zod 4.3.6 `GHSA-mrhx-c7xc-m3w5` yüksek bulgusunu taşıyordu; Faz 1'de 4.6.7
denemesi saf paketlerde DOM `URL` declaration hatası nedeniyle ertelendi. 27 Ekim'de
Zod 4.6.7'ye geçildi; yalnız contract/core'da `skipLibCheck` ile çözüldü, ortam tipi
eklenmedi ([ADR-016](docs/adr/ADR-016-zod-declarations.md)). `npm audit` 0 bulgu.

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
