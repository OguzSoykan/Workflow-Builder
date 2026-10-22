# Görevler ve Faz 1 kabul planı

**22 Ekim 2026:** WB-PM dokümantasyon paketi kullanıcı tarafından GitHub main'e taşındı; “devam et” talimatıyla WB-001A uygulandı, yerel kapıları geçti ve `Review` durumunda. Diğer uygulama görevleri `Backlog`. [STATUS](STATUS.md) güncel yürütme kaydıdır. WB-001–004 kimlikleri korunur; aşağıdaki alt görevler onların bütün kabul koşullarını kapsar.

## Hazır ve tamamlanmış iş tanımı

**Ready:** Açık kapsam, kaynak FR/AC/contract, tamamlanmış bağımlılıklar, çözümlenmiş ilgili D-kararları, izin verilen çalışma kapsamı, pozitif/negatif doğrulama ve maliyet etkisi belli. Bir kartın onayı aynı üst işteki diğer kartlara kendiliğinden izin vermez; kullanıcı birden fazla kartı/fazı açıkça onaylayabilir.

**Done:** Kartın kabul kriterleri + uygulanabilir kapıları geçti; diff/review kanıtı ve gerekli dokümanlar güncel; [Git sürecindeki](docs/DEVELOPMENT.md) merge/review tamam. Kanıt yoksa `Review` veya `Blocked`; bağımlılığı bekleyen henüz başlanmamış işler `Backlog` kalır. Şu anda `typecheck` vardır; diğer script adları ilgili kartta kurulacak sözleşmedir.

### Ortak kalite kapıları

| Kapı | Gerekli kanıt |
|---|---|
| Q-DOC | İlgili doküman linkleri ve WB/D/FR/AC referansları; diff/whitespace kontrolü; değişen karar için onay kaydı |
| Q-STATIC | Strict `typecheck`, `lint`, `format:check`; modül bağımlılıklarının ters dönmediği inceleme |
| Q-TEST | Göreve özgü başarı, hata ve sınır testleri; deterministik tekrar; test sonuçlarının gerçek kaydı |
| Q-BUILD | Etkilenen paketler ve ilgili tüketicilerin build'i; faz çıkışında web + Worker birlikte |
| Q-SEC | Secret/PII yok; minimum gerekçeli bağımlılık; güvenilmeyen girdiler sınırlı; canlı/ücretli servis çağrısı yok; scanner hazır olduğunda kaynak + build çıktısı taraması |
| Q-CI | Lockfile ile temiz kurulum, uygulanabilir kontroller başarılı; bozuk type/test değişikliği CI'ı kırar; secret yok; deploy yok |
| Q-REVIEW | Tek amaçlı küçük diff, kabul kriteri/kanıt eşlemesi ve review kaydı; öz inceleme bağımsız review diye sunulmaz |

WB-001A'da henüz uygulama/test runner yoktur: Q-TEST yerine workspace/config doğrulaması, Q-BUILD yerine kurulmuş temel TS kontrolü kullanılır ve gerekçe yazılır. WB-001B health kanıtını manuel smoke ile verebilir; WB-001C aynı davranışı otomatikleştirir. Bu istisnalar üst WB-001 veya Faz 1 kapısını kaldırmaz. Cloud staging smoke, yalnızca staging/deploy'u etkileyen sonraki görevlerde gerekir; Faz 1 yerel/CI doğrulamasıyla kapanır.

## Özet ve sıra

| ID | Üst iş | Boyut | Görev | Bağımlılıklar | Durum |
|---|---|---|---|---|---|
| WB-001A | WB-001 | S | Workspace, sürümler, modül sınırları | Uygulama onayı alındı | Review |
| WB-001B | WB-001 | S | React/Worker health iskeleti | 001A | Backlog |
| WB-001C | WB-001 | S | Vitest ve Playwright smoke altyapısı | 001B | Backlog |
| WB-004A | WB-004 | S | PR CI ve secret kalite kapısı | 001C, GitHub erişimi | Backlog |
| WB-002A | WB-002 | S | Şema v1 ve tipli alanlar | 001C; D-02/D-04/D-15 | Backlog |
| WB-002B | WB-002 | S | Canonical serialization ve hash | 002A; D-01 | Backlog |
| WB-002C | WB-002 | S | Fixture, round-trip ve limit matrisi | 002A/002B; D-02/D-15 | Backlog |
| WB-003A | WB-003 | S | Yapısal graph validator | 002C | Backlog |
| WB-003B | WB-003 | S | Condition/input semantik validator | 003A; D-04 | Backlog |
| WB-003C | WB-003 | S | Determinizm ve kötü girdi sertleştirmesi | 003B | Backlog |
| WB-004B | WB-004 | S | OpenAPI, env ve ADR dokümantasyonu | 001B/002C; D-03/D-11/D-15 | Backlog |
| WB-004C | WB-004 | S | Faz 1 çıkış kanıtı ve inceleme | Diğer tüm Faz 1 alt görevleri | Backlog |

Önerilen yürütme sırası tablodaki sıradır. `004A` erkene alınarak sonraki kod PR'ları CI ile korunur. Tek aktif uygulama kartı; daha sonraki bir karar yalnızca ona bağlı kartları bekletir. D-03/D-11'in sonraki faz politikaları OpenAPI'de açık `TBD` olabilir; Faz 1 şemasını etkileyen payload kısmı çözülmeden ilgili schema kesinleştirilmez.

## WB-001A — Workspace, sürümler ve modül sınırları

- **Kaynak/kapsam:** CODEX_PHASE_1 §2; Architecture §2, ADR-001/002/003. npm veya pnpm arasından en basit uygun workspace seçimi ve gerekçeli teknik ADR; Node/package-manager sürümü ve tek lockfile; strict TS temel ayarı; web/worker/contract/core sınırları. Bu bir ürün değişikliği değildir.
- **Kabul:** Temiz checkout'ta sabit sürüm + lockfile ile kurulum tekrarlanır; workspace paketleri çözümlenir; strict TS yanlış tipi reddeder; core/contract config'i React/Worker/D1/LLM import'u gerektirmez. README gerçek kurulum komutlarını gösterir.
- **Doğrulama:** Temiz kurulum + temel TS kontrolü; geçici yanlış tip fixture'ı beklenen nonzero sonucu verir ve teslimden çıkarılır. Henüz olmayan runtime/test kapıları açıkça N/A'dır.
- **Kapılar:** Q-DOC, Q-STATIC (mevcut config), Q-SEC, Q-REVIEW. Ek UI paketi, cloud binding, uygulama özelliği yok.
- **Teslim kanıtı:** [ADR-012](docs/adr/ADR-012-workspace-toolchain.md), [doğrulama kaydı](docs/verification/WB-001A.md); dal `feat/WB-001A-workspace`, [taslak PR #1](https://github.com/OguzSoykan/Workflow-Builder/pull/1). İnsan review/merge bekleniyor.

## WB-001B — Minimal health iskeleti

- **Kaynak/kapsam:** CODEX_PHASE_1 §2; tek Worker + React statik asset. Vite/React, Hono, Wrangler local, strict lint/format ayarları; `/api/health` ve yalnızca bunu gösteren minimal UI.
- **Kabul:** Sağlıklı istek 200; bilinmeyen route kontrollü 404; frontend aynı origin'de health'e ulaşır; health erişilemezken UI anlaşılır hata gösterir. D1, Firebase, OpenAI veya gerçek key olmadan çalışır. Web + Worker build başarılı.
- **Doğrulama:** Local başlatma, HTTP 200/404 ve bağlantı kesilmesi smoke; çıktılar kaydedilir. SPA fallback'in `/api/*` hatasını HTML başarıya çevirmediği kontrol edilir.
- **Kapılar:** Q-DOC, Q-STATIC, Q-BUILD, Q-SEC, Q-REVIEW; manuel Q-TEST kanıtı, 001C'de otomasyon.

## WB-001C — Test altyapısı

- **Kaynak/kapsam:** CODEX_PHASE_1 teknik hedefi ve WB-001 kabulü; Vitest saf paket/Worker testleri ve Playwright health smoke. Simulator veya editor yazılmaz.
- **Kabul:** `test` en az bir anlamlı test çalıştırır; Worker health 200 ve unknown API 404 otomatik doğrulanır; Playwright UI/health smoke geçer; testler secrets/network provider istemez. Bozuk assertion nonzero exit verir.
- **Doğrulama:** Başarı ve kasıtlı başarısız assertion deneyi, ardından bozuk örneği kaldırma; typecheck/lint/format/test/build; tüm testler için hangi runner'ın gerektiği README'de.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-REVIEW.

## WB-004A — PR CI ve secret kalite kapısı

- **Kaynak/kapsam:** CODEX_PHASE_1 §5, PRD AC-13. GitHub Actions, lockfile install, typecheck/lint/format/unit/build; health smoke ve kaynak/build secret scan. İlk PR'dan itibaren iş akışı.
- **Kabul:** Temiz PR başarılı; geçici tip hatası ve test hatası ayrı denemelerde gerekli check'i başarısız yapar; secret scanner zararsız sentetik fixture'ı yakalar, gerçek credential kullanılmaz. Workflow deploy yapmaz ve production secrets istemez; minimum izinler kullanır.
- **Doğrulama:** GitHub run/PR bağlantıları ve başarısız denemelerin sonuçları; yerel çalıştırma hosted CI kanıtı yerine geçmez. Remote/policy yetkisi yoksa eksik kapı açıkça raporlanır.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-CI, Q-REVIEW. Branch protection'ın etkin olup olmadığı ayrıca kaydedilir.

## WB-002A — Canonical şema v1

- **Kaynak/kapsam:** FR-01/02/03, Workflow Contract §1–4, CODEX_PHASE_1 §3. Zod/types: dört node, beş input türü, node/edge/handle/ID, version=1; sadece public package exports.
- **Kabul:** Her node ve input türü geçer; bilinmeyen version/type/handle, duplicate ID/key, malformed edge, yanlış config/default/options ve yasak alanlar tanımlı parse issue ile reddedilir. Şema doğrulaması ile graph semantiğinin görev sınırı belgelenir; tekrar eden kontroller tek kaynaktan gelir.
- **Doğrulama:** Tablo tabanlı geçerli/geçersiz örnekler; ID/etiket/position ayrımı; şema paketi UI/DB/LLM olmadan derlenir. D-02/04/15 kararları testlere çevrilir.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-CI, Q-REVIEW.

## WB-002B — Canonical serialization/hash

- **Kaynak/kapsam:** AC-07, Workflow Contract §1/6, Architecture §5. D-01 onaylı alan listesi, sıralama/encoding, hash algoritması ve türetilmiş hash alanının davranışı. Patch uygulaması bu kartta yok.
- **Kabul:** Aynı mantıksal graph farklı object-key/array/canvas sıralamasında aynı hash; iş mantığı değişikliği farklı hash; self-hash/revision/timestamp hesaplamaya girmez. Position/layout/metadata/locale etkisi D-01'deki açık kararla eşleşir. Etiket veya konum değişikliği node/edge ID'lerini değiştirmez.
- **Doğrulama:** Onaylı hash test vektörleri browser ve Worker uyumlu ortamda aynı sonucu verir; unsupported/güvenilmeyen girdi reddedilir; round-trip stable. Tarih veya rastgelelikten etkilenmez.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-CI, Q-REVIEW.

## WB-002C — Fixture ve limit matrisi

- **Kaynak/kapsam:** CODEX_PHASE_1 §3, PRD 50 node/100 edge, Workflow Contract §7. Bir geçerli satın alma örneği ve kontrollü negatif fixture'lar; tip/serialization testleri; sürümleme/migration stratejisi dokümantasyonu.
- **Kabul:** Serialize/parse eşdeğerliği; 50/51 node ve 100/101 edge sınırları sözleşme katmanında ayrıştırılır. D-02 kararıyla field sayısı ve UTF-8 byte limiti tam eşik/eşik+1 test edilir; Türkçe çok byte karakter örneği vardır. Sürüm desteklenmiyorsa kontrollü hata; fixture'lar gerçek kişisel veri içermez.
- **Doğrulama:** Birbirinden bağımsız sınır fixture'ları diğer ihlallerden etkilenmeden ilgili kontrolü sınar. Henüz semantik olarak geçerli olması gerekmeyen schema sınır örnekleri ile gerçek geçerli graph açıkça ayrılır. Import UI/saklama uygulaması yok.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-CI, Q-REVIEW.

## WB-003A — Yapısal validator

- **Kaynak/kapsam:** FR-03, AC-05, Workflow Contract §3/4, CODEX_PHASE_1 §4. Saf TS topology/handle/reference kontrolü.
- **Kabul:** Geçerli satın alma graph'ı `valid=true, issues=[]`; 0/2 Start, End yok, dangling edge, Start'a giriş, End'den çıkış, eksik/yanlış/duplicate handle, erişilemeyen node, cycle/self-loop ve bitmeyen yol reddedilir. Her hata machine-readable code ve ilgili ID ile ilişkilidir.
- **Doğrulama:** Her invariant için izole negatif fixture ve birleşik hata örneği; sonsuz dolaşım yok; count limitleri parser/validator sınırında belgelenmiş. UI render/network/DB gerekmeyen unit testler.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-CI, Q-REVIEW.

## WB-003B — Input/condition semantik validator

- **Kaynak/kapsam:** FR-02/03, AC-03/05, Workflow Contract §2/4. Tip/operatör/literal/field referansı tutarlılığı; koşul değerlendiren simulator yazılmaz.
- **Kabul:** number/string/boolean/date/enum için izinli operatörler kabul edilir; olmayan field, uyumsuz literal/operator, geçersiz takvim tarihi, enum dışı değer ve D-04'e aykırı optional/default/validation örnekleri reddedilir. Numeric string number'a sessizce çevrilmez. Eval/custom script yok.
- **Doğrulama:** Her tip/operatör sınıfı için pozitif/negatif tablo; finite number, leap-day, enum `in` ve required/default sınırları; istikrarlı issue codes + fieldKey.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-CI, Q-REVIEW.

## WB-003C — Determinizm ve kötü girdiler

- **Kaynak/kapsam:** PRD güvenlik/kalite hedefleri; CODEX_PHASE_1 §4. Validator tamamlayıcı negatif testleri, issue sıralama sözleşmesi ve coverage raporu; keyfi yüzde kotası eklenmez.
- **Kabul:** Tekrar ve graph sıralaması değişiminde aynı normalize issues; büyük/derin/malformed girdi, prototype anahtarları ve uzun string'ler kontrollü reddedilir; taşma veya takılma yok. Caller'ın girdisi değiştirilmez. Core dosyaları fetch/DB/provider SDK import etmez.
- **Doğrulama:** Frozen-input testi, parametrik kritik dal matrisi, coverage çıktısı; 50-node validator ölçümünde cihaz/ortam ve süre kaydı. Bu ölçüm Faz 3'ün 1 saniyelik simulator hedefi yerine geçmez; Worker CPU uygunluğu Faz 6'da gerçek ortamda ölçülür.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-CI, Q-REVIEW.

## WB-004B — OpenAPI, env ve ADR

- **Kaynak/kapsam:** CODEX_PHASE_1 §5, API Contract, ADR-001–011. OpenAPI 3.1 taslağı, local/staging/prod env matrisi, yalnızca yer tutucu env örnekleri; yeni teknik ADR'ler. Cloud kaynakları oluşturulmaz.
- **Kabul:** Planlanan endpoint'ler ve success/error/status/bearer/ownership/revision semantiği belgelenir; tek çalışan health ile planlanan rotalar ayırt edilir. Auth register/login Worker endpoint'i veya server simulation endpoint'i eklenmez. 204 body içermez. Secret/public config ayrımı ve ortam izolasyonu açık.
- **Doğrulama:** OpenAPI parse/validation, örneklerin şemaya uygunluğu, kırık referans taraması; henüz onaysız policy/operation payload'ı `TBD` olarak işaretlenir, uydurulmuş kesin contract sunulmaz. D-03/11/15'te Faz 1'i etkileyen kararlar çözülür.
- **Kapılar:** Q-DOC, Q-SEC, Q-CI, Q-REVIEW; schema/example validation Q-TEST. Yeni runtime dependency yok; spec validation aracı gerekiyorsa yalnızca geliştirme aracı olarak gerekçelendirilir.

## WB-004C — Faz 1 çıkış incelemesi

- **Kaynak/kapsam:** CODEX_PHASE_1 §6; WB-001–004 bütün kabul koşulları. Yeni özellik eklenmez.
- **Kabul:** Temiz checkout ile kurulum, local health, web/Worker build, typecheck/lint/format/unit/smoke ve secret scan başarılı; hosted CI pozitif/negatif kanıtları mevcut. Contract/validator negatif matrisi ve açık kararlar raporlu. Faz 1 dışında uygulama yok.
- **Doğrulama:** Gerçek komutlar, sonuçlar, commit/PR/run referansları ve WB üst iş eşlemesi STATUS'a yazılır; çalıştırılmayan kontrol başarı sayılmaz. Orijinal PRD değişiklikleri varsa onayları izlenebilir. Tamamlanmayan bağımlılıkta faz kapanmaz.
- **Kapılar:** Q-DOC, Q-STATIC, Q-TEST, Q-BUILD, Q-SEC, Q-CI, Q-REVIEW. Kullanıcıya Faz 2 önerisi sunulur; faz onayı gelmeden başlanmaz.

## Sonraki fazların işleri

WB-005–027 bu teslimde uygulama kartlarına bölünmedi. Kapsam/bağımlılıkları [ROADMAP](ROADMAP.md) ve [BACKLOG](docs/BACKLOG.md) içinde korunur; ilgili faz onayından önce aynı küçük kart formatına ayrılır. Böylece henüz ihtiyaç olmayan altyapı tasarlanmaz.
