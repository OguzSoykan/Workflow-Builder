# Proje durumu

**Son güncelleme:** 26 Ekim 2026 (Europe/Istanbul).

**Faz 1'in yerel uygulaması tamamlandı; çıkış kapısı kapanmadı.** Şema, hash,
saf validator, test/CI ve dokümantasyon hazır. Sabit araç zinciriyle temiz kurulum,
gerçek Wrangler/Chromium, tam Worker artifact taraması ve hosted CI/PR/merge
kanıtları eksik. Bu nedenle Faz 1 veya WB-004C Done olarak işaretlenmez.

Dal: `feat/WB-002A-workflow-contract`. Son main commit'i `1fae401` (WB-001B).
GitHub'a push/PR/merge, cloud kaynağı, deploy veya canlı model çağrısı yapılmadı.
Kullanıcı onayları korunur; Faz 1 için yeniden ürün kararı beklenmiyor.

## Mevcut durum

| İş          | Durum     | Kanıt / kalan                                                                                         |
| ----------- | --------- | ----------------------------------------------------------------------------------------------------- |
| WB-001A/B   | Main'de   | `18a9018` / `1fae401`; önceki doğrulama kayıtları korunur                                             |
| WB-001C     | Blocked   | Health + contract platform testleri hazır; gerçek Wrangler/Chromium smoke çalışamadı                  |
| WB-002A/B/C | Review    | Zod şeması, güvenli parser, SHA-256, round-trip, fixture/limit/hash vektörleri; yerel testler geçti   |
| WB-003A/B/C | Review    | Yapısal/semantik validator, deterministik issues, hostile/frozen girdi, coverage/50-node ölçümü geçti |
| WB-004A     | Blocked   | CI, scanner ve negatif gate deneyi hazır; hosted CI ve tam Worker build taraması eksik                |
| WB-004B     | Review    | OpenAPI gerçek Workflow şemasıyla eşleşiyor; env, ADR-014, issue-code ve migration belgeleri hazır    |
| WB-004C     | Blocked   | Aşağıdaki ortam/hosted kapıları tamamlanmadan çıkış yok                                               |
| Faz 2–6     | Başlamadı | Editor, simulator, auth, D1/DO veya AI uygulaması yok                                                 |

Review yerel kod/öz inceleme durumudur; bağımsız insan onayı veya remote merge değildir.

## Onay ve teknik kararlar

Kullanıcı “bunlarla devam” talimatıyla 30 input / 256 KiB, case-sensitive metin,
optional default / null reddi, enum `in` listesi ve konumdan bağımsız içerik hash'ini
onayladı. [DECISIONS](docs/DECISIONS.md) ve [ADR-014](docs/adr/ADR-014-workflow-v1.md)
ID/alan/unknown-key, canonicalization, şema-semantic ayrımı ve hata kodlarını kaydeder.
D-03 taslak saklama ve D-11 AI payload/patch politikaları sonraki fazda açık kalır.

## Gerçek doğrulama

Kaynaklar `/private/tmp/workflow-builder-review` altındaki izole kopyada, yerel npm
önbelleğinden kurulan araçlarla doğrulandı. Node 24.18.0/npm 11.16.0 kullanıldı;
repo hâlâ Node 24.22.1/npm 11.19.1 ister. Vite/ESLint/Hono gibi bazı doğrulama
sürümleri farklıdır; ayrıntılı tablo [Faz 1 kanıtında](docs/verification/PHASE-1.md).
Yeni contract bağımlılıkları Zod 4.3.6 ve noble/hashes 2.0.1 sabit sürümleriyle
çalıştırıldı. Global Node ayarı ve repo engine-strict kuralı değiştirilmedi.

| Kontrol                                | Sonuç                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run typecheck`                    | PASS; dört workspace + tools/test, ES-only contract/core, skipLibCheck yok                   |
| `npm run lint`, `npm run format:check` | PASS, izole araç zinciri                                                                     |
| `npm test`                             | PASS: 178 Vitest + 2 scanner + 3 API doküman testi, toplam 183                               |
| `npm run test:coverage`                | PASS; toplam satır %98,78 / branch %94,01, core satır %100                                   |
| `npm run test:negative-gates`          | PASS; temiz typecheck sonrası gerçek TS2322/assertion nonzero, probe'lar silindi             |
| Web build                              | PASS, Vite 8.3.4; mevcut health davranışı korunur                                            |
| Browser contract test bundle           | PASS; 91 modül, yalnız tests/platform/dist; gerçek browser çalışması değildir                |
| `npm run benchmark:validator`          | PASS; Apple M1 Pro/Node 24.18.0, 50 node/97 edge, 1000 örnek: median 0,604 ms / p95 0,909 ms |
| `npm run test:e2e`                     | NOT RUN; Wrangler bulunamadı, sunucu hazırlığı exit 127; 8 senaryo çalışmadı                 |
| Worker build / tam secret scan         | NOT RUN; kaynak ve web/test browser bundle ön taraması yapıldı, Worker artifact yok          |
| Sabit sürümlü temiz kurulum            | NOT RUN; araç sürümü ve offline paket eksiği; önceki npm ci ENOTCACHED                       |
| Hosted CI / PR / merge                 | NOT RUN; GitHub DNS erişimi yok, GitHub eklentisi bağlı değil                                |

Hash sabit UTF-8 vektörü Node SHA-256 ve Node Web Crypto ile karşılaştırıldı.
Gerçek Chromium + Worker eşitlik testi eklendi fakat çalıştırılamadı; Node kanıtı
onun yerine sunulmaz. Benchmark yerel validator içindir, simulator/Cloudflare CPU
hedefini kanıtlamaz. Orijinal sekiz planlama belgesi değiştirilmedi.

## Kalan çıkış adımları

26 Ekim devam kontrolünde npm registry ve GitHub erişimi yeniden denendi:
`curl` exit 6 ve `git ls-remote origin HEAD` exit 128 (DNS çözümleme hatası).
Yerelde Node 24.22.1 hâlâ yok. CI, `npm ci` öncesinde npm 11.19.1'i açıkça
kuracak şekilde düzeltildi; setup-node'un beraberinde gelen npm sürümüne bağımlı
değil. Bu değişiklik hosted CI çalıştırıldığı anlamına gelmez.

1. Ağ erişimli ortamda Node 24.22.1/npm 11.19.1 ile normal `npm ci`.
2. Typecheck/lint/format/test/build/secret scan; Chromium kurulumu ve 8787/8788
   portlarında Playwright; gerçek Worker/browser hash vektörü ve health smoke.
3. GitHub PR/hosted CI pozitif ve ayrı bozuk PR check kanıtları, yetki dahilinde
   review/merge; sonra WB-004C çıkış kaydı. Branch protection doğrulanmış değildir.

Sonraki ürün işi WB-005 (ERP canvas temeli); **Faz 2 başlatılmadı** ve ayrıca faz
onayı gerekir. Mevcut Faz 1 uygulama onayı tekrar istenmez.

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
