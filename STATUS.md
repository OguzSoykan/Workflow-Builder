# Proje durumu

**Son güncelleme:** 27 Ekim 2026 (Europe/Istanbul).

Faz 1'in yerel uygulaması ve gerçek Worker/Chromium doğrulaması tamamlandı.
Çıkış kapısı, bu dalın PR'ı için hosted CI ve merge kanıtı gelene kadar açık.

Dal: `feat/WB-002A-workflow-contract`; `origin/main` güncel ve korumalı.
Faz 2, cloud deploy ve canlı model çağrısı başlatılmadı.

## Mevcut durum

| İş          | Durum     | Kanıt / kalan                                                                            |
| ----------- | --------- | ---------------------------------------------------------------------------------------- |
| WB-001A/B   | Main'de   | Önceki PR'larla birleşti                                                                 |
| WB-001C     | Review    | Yerel gerçek Worker/Chromium health + contract smoke: 10/10                              |
| WB-002A/B/C | Review    | Şema, hash, round-trip ve sınır matrisi; testler/Browser Worker hash vektörü geçti       |
| WB-003A/B/C | Review    | Validator, hostile input, deterministik issue; testler ve coverage geçti                 |
| WB-004A     | Review    | Hosted önceki pozitif/negatif run kanıtları var; bu güncel workflow yerel kapıları geçti |
| WB-004B     | Review    | OpenAPI, env, ADR ve issue-code belgeleri hazır; eşleşme testleri geçti                  |
| WB-004C     | Blocked   | Güncel dal için hosted PR check ve merge bekleniyor                                      |
| Faz 2–6     | Başlamadı | Ayrı faz onayı gerekir                                                                   |

Review yerel inceleme/doğrulamadır; bağımsız insan onayı veya remote merge değildir.

## Onay ve teknik kararlar

Kullanıcı “bunlarla devam” talimatıyla 30 input / 256 KiB, case-sensitive metin,
optional default / null reddi, enum `in` listesi ve konumdan bağımsız içerik hash'ini
onayladı. [DECISIONS](docs/DECISIONS.md) ve [ADR-014](docs/adr/ADR-014-workflow-v1.md)
ID/alan/unknown-key, canonicalization, şema-semantic ayrımı ve hata kodlarını kaydeder.
D-03 taslak saklama ve D-11 AI payload/patch politikaları sonraki fazda açık kalır.

## Gerçek doğrulama

Repo kökünde sabit Node 24.22.1/npm 11.19.1 ile `npm ci` temiz kuruldu.
Build'ler Wrangler 4.151.3, Vite 8.3.5; test ve tarayıcı aynı sabit lockfile
bağımlılıklarıyla çalıştı. Global Node ayarı değişmedi.

| Kontrol                                                     | Sonuç                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm ci`                                                    | PASS; lockfile ile temiz kurulum                                                     |
| `npm run typecheck`, `npm run lint`, `npm run format:check` | PASS                                                                                 |
| `npm test`                                                  | PASS: 179 Vitest + 2 scanner + 3 API doküman testi                                   |
| `npm run test:coverage`                                     | PASS; satır %99,09 / branch %94,01; core satır %100                                  |
| `npm run test:negative-gates`                               | PASS; tip ve assertion gate'leri beklenen şekilde reddetti                           |
| `npm run build`                                             | PASS; Vite build + Wrangler Worker dry-run, deploy yok                               |
| `npm run secret:scan`                                       | PASS; 90 kaynak/build dosyasında bulgu yok                                           |
| `npm run secrets:check`                                     | PASS; Git geçmişi, kaynak ve web/Worker artifact tarandı                             |
| `npm run secrets:self-test`                                 | PASS; sentetik token yakalandı, gerçek credential kullanılmadı                       |
| `npm run test:e2e`                                          | PASS; 10 Chromium testi, gerçek local Worker health ve hash vektörü dahil            |
| `npm run benchmark:validator`                               | PASS; M1 Pro/Node 24.22.1, 50 node/97 edge/1000 örnek: median 0,589 ms, p95 0,886 ms |
| `npm audit`                                                 | 1 yüksek Zod bulgusu; ayrıntısı aşağıda                                              |
| GitHub hosted PR check                                      | Bu son dalda henüz çalışmadı                                                         |

Güncel dalda GitHub Actions workflow'u checksum ile sabitlenmiş action sürümleri,
Node/npm pinleri, tam Gitleaks taraması ve Faz 1 kalite kapılarını içerir. Önceki
hosted negatif denemeler API'den doğrulandı: tip hatası Typecheck adımında,
bozuk assertion Unit tests adımında başarısız oldu. Main'de `quality` zorunlu
check'i ve PR kuralı mevcut; required approving review sayısı sıfır.

Zod 4.3.6, bağımlılık taramasında `GHSA-mrhx-c7xc-m3w5` yüksek bulgusunu taşıyor.
Önerilen Zod 4.6.7'ye geçiş saf contract/core TypeScript derlemesinde DOM `URL`
tiplerini zorunlu kılıyor; deneme bu nedenle reddedildi ve mimaride onaysız
ortam tipi eklenmedi. Zod öncesi JSON-tree parser 12 derinlik, 20.000 değer,
256 KiB sınırları koyuyor; ancak bu, advisory'yi ortadan kaldırmaz. Bu Faz 1
çıkışında açık güvenlik riski olarak kalır ve şema sürüm yükseltmesi/uyumluluk
çözümü gerektirir.

`npm ci` install-script izin uyarısı iki platforma özel `fsevents` kopyası içindi;
repo allowScripts kuralları değişmedi. `npm audit fix --force` çalıştırılmadı.
Hosted PR check ve merge sonrası WB-004C kapanabilir; WB-005/Faz 2 ayrıca
onaylanmadan başlamaz.

## Önceki teslimler

- `6700239`: orijinal planlama paketi; `775b001`: yönetim temeli.
- `18a9018` / `1fae401`: workspace / health main commit'leri.
- `09f8326`: test/CI/API taslağı; `d91a7a7`: ilk devam oturumunun kanıt kaydı.
- PR #1 geçmiş kullanıcı oturum onayıyla birleştirildi; aynı hesabın bağımsız
  Approve review verdiği iddia edilmez. Bu devam oturumunda remote merge yapılmadı.

## Bu teslimin commit'leri

- `c035cce`: WB-002 şema/parser/hash/fixture, onay kaydı ve OpenAPI eşlemesi.
- `294fc2f`: WB-003 validator ve browser/Worker uyumluluk test hazırlığı.
- Tamamlayıcı doküman commit'i: bu durum/README/TASKS ve gerçek doğrulama kaydı.

Son kaynak incelemesi: 85 dosya + 4 web/test bundle artifact'inde imza eşleşmesi yok;
75 yerel Markdown bağlantısı sağlam, 8 orijinal belge değişmedi. Core/contract'a
eklenen geçici compiler probe'larında URL/fetch/process ayrı ayrı reddedildi;
ES-only sınırı korunuyor. Probe'lar temizlendi.
