# ADR-014 — Workflow v1 şeması, canonical hash ve validator

**Durum:** Uygulandı; yerel doğrulama kanıtı [PHASE-1](../verification/PHASE-1.md).
**Tarih:** Kullanıcı varsayılan onayı 23 Ekim 2026; teslim doğrulaması 26 Ekim 2026.
**Kapsam:** WB-002A/B/C, WB-003A/B/C; D-01/02/04/15. Orijinal planlama dosyaları
değiştirilmez; bu ADR onaylı varsayılanları ve teknik alan ayrıntılarını tamamlar.

## Karar ve katmanlar

`workflow-contract` ortak Zod şeması, tipler, güvenli parser, serializer ve hash
fonksiyonlarını sunar. `workflow-core` yalnız contract'ın public arayüzünü kullanır;
graph/condition kuralları burada doğrulanır. UI, fetch, DB, saat, rastgelelik veya
sağlayıcı SDK bağımlılığı yoktur. Simulator veya patch uygulaması eklenmedi.

`parseWorkflow(unknown)` / `parseWorkflowJSON(unknown)` başarıda `{success:true,data}`,
hatada `{success:false,issues}` döndürür. `validateWorkflow` / `validateWorkflowJSON`
aynı güven sınırından geçer, ardından `{valid,issues}` döndürür. TypeScript tipi
sunucu doğrulamasının yerine geçmez. Şeması geçerli boş/eksik graph yapısal olarak
parse edilebilir; çalıştırılabilir sayılmaz. Bu ayrım taslak kaydetme politikasını
onaylamaz; D-03 sonraki fazda açık kalır.

## D-02 / D-04 / D-15 alan ve güvenlik ayrıntıları

| Alan                                | V1 davranışı                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Belge limiti                        | 50 node, 100 edge, 30 input; UTF-8 olarak 262144 byte (256 KiB)                                                                       |
| Raw JSON                            | Whitespace dahil dosyanın tamamı byte limitine girer; HTTP envelope limiti ayrı sonraki iştir                                         |
| Bellekte belge                      | Güvenli JSON ağacı kontrolünden sonra compact `JSON.stringify` byte uzunluğu ölçülür                                                  |
| ID                                  | 1–128 ASCII karakter; ilk karakter alfanümerik, devamı alfanümerik / `_` / `-`; UUID/ULID/string kabul edilebilir                     |
| Input key                           | 1–64 ASCII karakter; ilk karakter harf / `_`, devamı harf / rakam / `_`                                                               |
| Yasak anahtarlar                    | `__proto__`, `prototype`, `constructor`; ID/key değerlerinde de reddedilir                                                            |
| ID benzersizliği                    | Node ID'leri ve edge ID'leri kendi koleksiyonlarında, input key'leri input koleksiyonunda benzersiz                                   |
| Başlık / label / roleLabel / option | 1–120 UTF-16 code unit; sadece whitespace olamaz; trim/normalizasyon uygulanmaz                                                       |
| Açıklama / string değer             | En fazla 1000 UTF-16 code unit; string boş olabilir                                                                                   |
| Sayı                                | Finite JSON number; string sayıya dönüştürülmez; IEEE-754 dışında para/hassasiyet özelliği eklenmez                                   |
| Tarih                               | Gerçek Gregoryen takvim tarihi, `YYYY-MM-DD`, yıl 0001–9999; leap-day denetimi, timezone dönüşümü yok                                 |
| Enum                                | 1–100 benzersiz option; eşleşme case-sensitive; `in` 1–100 benzersiz izinli değer listesi                                             |
| Required / default                  | `required` açık boolean; true/false için default opsiyonel, null geçersiz; missing runtime input davranışı simülatörün sonraki işidir |
| Validation                          | Number/date: `min?`, `max?`; string: `minLength?`, `maxLength?` (0–1000); aralık ters olamaz; default aralığa uyar                    |
| Boolean / enum validation           | Ek validation nesnesi yok; enum'un options kümesi sınırdır                                                                            |
| Position / layout                   | Finite x/y; optional `layout.viewport={x,y,zoom}` ve pozitif finite zoom; başka layout/config alanları reddedilir                     |
| Unknown alanlar                     | Belge, node, edge, input, config, validation ve viewport strict; script/eval/regex/owner_uid gibi alanlar kabul edilmez               |
| Metadata                            | Revision/timestamp/auth bilgisi workflow dışındaki API envelope'unda; workflow içine gelirse reddedilir                               |

Güvenli parser Zod'dan önce en fazla 12 seviye / 20000 JSON değerini kabul eder;
cyclic reference, sparse array, nonfinite sayı, undefined/function/symbol/BigInt,
custom prototype, accessor ve `toJSON` metotlarını reddeder. Getter/toJSON çağırmaz.
Bu sınır canlı, kötü niyetli JavaScript Proxy çalıştırmayı izole eden bir sandbox
değildir; güvenilmeyen veri raw JSON olarak alınmalıdır. HTML metni çalıştırılmaz;
sonraki UI bu değerleri metin olarak render etmelidir.

## D-01 canonical içerik ve SHA-256

Hash girdisi: `schemaVersion`, `workflowId`, `title`, varsa `description`, `locale`,
input tanımları, node `{id,type,label,config}` ve edge tanımları. Böylece başlık,
etiket, dil, default/validation veya iş mantığı değişikliği hash'i değiştirir.
`contentHash`, position ve layout hash'e girmez. Revision/timestamp zaten envelope
alanıdır; hash API'sine belge içine yerleştirilerek gönderilemez.

- Object key'leri UTF-16 kod birimi sırasıyla; node/edge array'leri ID, input
  array'i key ile sıralanır. `localeCompare`, saat ve rastgelelik kullanılmaz.
- Enum options ve `in` literal listeleri iş mantığında küme olduğu için aynı
  karşılaştırıcıyla sıralanır. Export ise kullanıcının array sırasını korur.
- Sayı/string encoding'i ECMAScript `JSON.stringify` biçimidir; Unicode
  normalizasyonu yoktur. UTF-8 byte dizisinin SHA-256 sonucu küçük harf 64 hex'tir.
- `canonicalizeWorkflow` sadece business JSON üretir; layout kaybettiğinden
  export/import snapshot'ı olarak kullanılmaz.
- `serializeWorkflow` / `withContentHash` tam snapshot'ı korur, türetilmiş hash'i
  yeniler ve hash eklenmiş son belgenin byte limitini yeniden doğrular.
- `contentHash` yeni taslak oluşturulabilmesi için parser'da opsiyoneldir; varsa
  biçimi kontrol edilir. Export her zaman hesaplanmış hash içerir.
  `hasValidContentHash` mevcut hash'i yeniden hesaplayarak doğrular. Graph validator
  hash'i yetkilendirme, imza veya stale-proposal kontrolü olarak kullanmaz.

Konum değişikliğinin hash'i değiştirmemesi, AI apply sırasında layout'un üzerine
yazılabileceği anlamına gelmez. Layout/revision/stale-proposal birleştirme davranışı
Faz 5'in işidir. Hash düzeni veya alan allowlist'i değişirse sürüm/migration kararı
ve test vektörleri birlikte güncellenir; desteklenmeyen schemaVersion sessizce
dönüştürülmez.

## Validator algoritması ve issue sözleşmesi

Şema doğrulamasından sonra tam bir Start, en az bir End, dangling reference,
handle kardinalitesi, Start girişi/End çıkışı ve erişilebilirlik denetlenir.
Tarjan SCC gerçek cycle üyelerini raporlar; cycle'dan sonraki node'ları cycle üyesi
saymaz. Recursion en fazla şemanın izin verdiği 50 node'dur. Tüm yolların sonlanması,
End'lerden başlayıp bütün zorunlu çıkışları sonlanan node'ları ekleyen sınırlı bir
sabit nokta hesabıdır; End'e ulaşan tek bir yol yeterli değildir.

Condition field referansı, input türüne izinli operator ve typed literal denetlenir.
Sayı/string/boolean dönüştürmesi yapılmaz; enum/date ayrıca doğrulanır. Condition
literal'ının input validation aralığı dışında olması tek başına hata değildir:
örneğin `max=100` alanına `gt 10000` koşulu eklemek sabit false sonuç verebilir;
Faz 1 validator koşulu çalıştırmaz. Approval rejected çıkışı başka doğrusal onay
yoluna gidebilir; sonuç ulaşılacak End'in outcome'udur.

Her issue `severity:error`, sabit `code` ve ilgili nodeId/edgeId/fieldKey taşır.
UI mesajı, prompt veya ham input değeri döndürülmez. Çıktı code, nodeId, edgeId,
fieldKey ve sıralanmış translationParams ile deduplicate/sort edilir. Array index'i
hata kimliğine girmez; aynı graph farklı sırayla aynı normalize sonucu verir.

| Code                                               | Anlam                                                   |
| -------------------------------------------------- | ------------------------------------------------------- |
| INVALID_JSON                                       | JSON olmayan, unsafe veya parse edilemeyen girdi        |
| SCHEMA_INVALID                                     | Bilinmeyen alan/tür veya diğer yapısal şema ihlali      |
| SCHEMA_VERSION_UNSUPPORTED                         | Eksik/yanlış schemaVersion                              |
| GRAPH_LIMIT_EXCEEDED                               | Node/edge/input/byte veya güvenli derinlik/değer sınırı |
| DUPLICATE_ID / DUPLICATE_INPUT_KEY                 | Tekrar eden node/edge ID veya alan key'i                |
| INPUT_DEFAULT_INVALID                              | Default tipi, enum üyeliği veya aralığı geçersiz        |
| INPUT_VALIDATION_INVALID / INPUT_OPTIONS_INVALID   | Validation aralığı ya da options tanımı geçersiz        |
| DATE_INVALID                                       | Input tanımında geçersiz takvim tarihi                  |
| START_COUNT_INVALID / END_MISSING                  | Başlangıç/bitiş sayısı geçersiz                         |
| EDGE_DANGLING                                      | Kaynak/hedef node bulunamadı                            |
| HANDLE_MISSING / HANDLE_INVALID / DUPLICATE_HANDLE | Eksik, uyumsuz veya çoğaltılmış çıkış                   |
| START_INCOMING / END_OUTGOING                      | Start'a giriş veya End'den çıkış                        |
| UNREACHABLE_NODE                                   | Start'lardan erişilemeyen node                          |
| CYCLE_DETECTED / PATH_NOT_TERMINATING              | Döngü veya bütün yolların sonlanmaması                  |
| INPUT_FIELD_MISSING                                | Koşulun field referansı bulunamadı                      |
| OPERATOR_TYPE_MISMATCH                             | Operator alan türüyle uyumsuz                           |
| CONDITION_VALUE_INVALID                            | Koşul literal tipi/tarihi/enum üyeliği geçersiz         |

Gelecekteki Worker envelope eşlemesi: INVALID_JSON/SCHEMA_INVALID/version için 400,
limit için 413, diğer graph/input semantik ihlallerinde 422 ve `error.details`
altında issues. Faz 1'de yeni public validation/AI/CRUD endpoint'i eklenmedi.

## Bağımlılık ve çalıştırma kararı

Zod **4.3.6** kullanılır. Denenen 4.6.5'in declarations'ı ambient URL tipi istediği
için ES-only sınırı bozuyordu. DOM eklemek veya skipLibCheck kullanmak yerine
aynı ihtiyaçları ES-only derleyen sürüm sabitlendi. SHA-256 için saf
`@noble/hashes` **2.0.1** kullanılır; elle kriptografi implementasyonu yazılmadı.
Hash randomBytes veya provider/network API'si çağırmaz.

Ortak kaynaklar `.ts` import'ları ve `erasableSyntaxOnly` ile Node 24'ün yerel
type stripping'i altında da çalışır; ek tsx/loader bağımlılığı yoktur.
`getWorkflowJsonSchema()` yalnız doküman üretiminde çağrılır; validator import'unda
JSON Schema üretim maliyeti oluşturmaz. `docs:sync-api` OpenAPI bileşenini üretir,
test birebir eşleşmeyi kontrol eder. JSON Schema custom byte/unique/default/takvim
kurallarının tamamını ifade etmez; `x-runtime-checks` bu sınırı açık tutar.

Test-only browser bundle ve 8788'deki Worker fixture production asset/Worker'a
eklenmez. Production hedefi hâlâ `infra/wrangler.jsonc` içindeki tek Worker'dır.
Gerçek Chromium/Worker testleri ortamda çalışmadığında sonuç NOT RUN olarak
kaydedilir; Node Web Crypto karşılaştırması bunların yerine sunulmaz.

### 27 Ekim 2026 — açık Zod güvenlik advisory'si

`npm audit` Zod 4.3.6 için GHSA-mrhx-c7xc-m3w5 yüksek önem seviyeli advisory
bildiriyor (sınırlı koleksiyonlarda aşırı bellek kullanımı). 4.6.7 denemesi saf
ES-only contract/core typecheck'inde ambient DOM `URL` tipi istediğinden kabul
edilmedi. Parser Zod'dan önce derinlik/değer/byte limitleri uygular; bu ek sınır
advisory'yi kapatmış sayılmaz. Zod sürüm yükseltmesi, DOM bağımlılığı getirmeyen
uyumlu bir upstream sürüm veya onaylı dar type çözümüyle ayrı olarak kapatılmalıdır.
Bu risk npm audit çıktısında ve proje durumunda açık tutulur.
