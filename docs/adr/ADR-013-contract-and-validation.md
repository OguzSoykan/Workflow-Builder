# ADR-013 — Faz 1 sözleşme ayrıntıları

**Tarih:** 22 Ekim 2026. **Kapsam:** WB-002A/B/C, WB-003A/B/C; PRD v1.1 korunur.

Kullanıcı Faz 1'in tamamını yetkilendirdi. 30 input/256 KiB/strict tip/case-sensitive tarih-metni ve hash kapsamı önerilerinden sonra “devam” talimatı verdi; belirtilen varsayılanlarla ilerlediğimiz bildirildi. D-01/02/04/15'in Faz 1 kısmı aşağıdaki şekilde somutlaştırılır. Sonraki fazların ürün politikalarına bu karar taşınmaz.

## Sözleşme ve katmanlar

Zod 4.6.7'nin declaration dosyaları kullanılmayan URL validator tipleri için global `URL` bekler. Ortak paketlere DOM/Node globals eklememek için `skipLibCheck` yalnızca declaration kontrolünü atlar; proje kaynaklarının strict kontrolü devam eder. Web/Worker tüketici derlemeleri ve runtime testleri ayrıca çalışır. `URL` şeması kullanılmaz.

- Zod strict nesneleri: unknown key reddedilir; sessiz type coercion/trim/default ekleme yapılmaz. `schemaVersion=1`, dört node ve beş input türü vardır.
- Schema/parsing, alanların biçimini ve kimlik benzersizliğini kontrol eder. `workflow-core` tüm topology, handle, condition/literal ve default/options/validation tutarlılığını denetler. Topolojik olarak eksik graph schema açısından temsil edilebilir; tam validator onu geçerli saymaz. Bu, eksik taslakların saklanması için ürün kararı değildir (D-03 sonraki faza açık).
- Limitler: 50 node, 100 edge, 30 input; JSON metni UTF-8 olarak en fazla **262144 byte**. Başlık 1–120, açıklama en fazla 1000 karakter. API envelope için bu graph limiti yeterli değildir; route body/prompt bütçeleri sonraki API uygulamasında ayrıca uygulanır.
- Teknik kimlikler: node/edge/workflow ID 1–128 ASCII harf/rakam/alt çizgi/tire; UUID ve ULID temsil edilebilir. Field key 1–64 ASCII harf/alt çizgi ile başlar, devamında rakam olabilir; prototype anahtarları yasaktır. Etiket ID üretim kaynağı değildir.
- Herhangi bir tek metin alanı JSON byte üst sınırını aşamaz. Enum options boş olamaz ve benzersizdir; opsiyon listesi ve `in` dizisi en fazla 100 öğe. Teknik JSON koruması en fazla 16 seviye ve 10000 ziyaret edilen değer kabul eder; bu sınırlar mevcut şemanın normal belgelerini etkilemez.
- Giriş yalnızca JSON ağacı olabilir: cycle, accessor/getter, custom prototype, symbol/function/bigint/undefined ve non-finite number reddedilir. Girdi değiştirilmez; ham girdi error mesajına taşınmaz. JSON parse ve derinlik kontrolleri şema recursion'ından önce gelir.
- Input `required` boolean zorunlu, `defaultValue` opsiyonel ve tam tipli; null kabul edilmez. Default'un required şartını karşılama/eksik input yürütme davranışı Faz 3'e aittir. Validator default varsa tip ve kısıt uyumunu kontrol eder.
- Optional `validation`: number/date için `min/max`, string için `minLength/maxLength`; custom regex/JS yok. Boolean/enum ek validation taşımaz. Tarih Gregorian `YYYY-MM-DD`, yıl 0001–9999, gerçek takvim günü; timezone dönüşümü yok. String equality/contains case-sensitive olarak belgelenir; evaluator bu fazda yazılmaz.
- Layout yalnızca opsiyonel `viewport{x,y,zoom}`; node position ayrı tutulur. Ek UI metadatası gerçek ihtiyaç çıktığında açık sözleşme değişikliğiyle eklenir.

## Hash

- SHA-256, küçük harf 64 hex karakter. Ortak kaynakta test edilen senkron serializer; kendimize ait kriptografik algoritma yazmak yerine küçük `@noble/hashes` bağımlılığı kullanılır.
- `schemaVersion`, `workflowId`, title/description/locale, inputs ve node/edge iş alanları dahildir. `contentHash`, node position ve layout hariçtir. Cloud revision/zaman damgası zaten graph dışında ayrı metadata'dır.
- Object key'leri UTF-16 code-unit sırası ile, input'lar key, node/edge'ler ID ile sıralanır; enum options ve `in` değerleri kümelerin görüntü sırasından bağımsız sıralanır. Locale-sensitive sort kullanılmaz. Undefined alan eklenmez; Unicode normalize edilmez ve metin değerleri aynen korunur; sayılar JSON kurallarına göre yazılır.
- `contentHash` dış input'ta opsiyoneldir; varsa biçimi kontrol edilir, doğruluk otoritesi sayılmaz. Hash fonksiyonu bu alanı dışlayıp yeniden hesaplar. Canonical export helper türetilmiş hash'i ekler. API/cloud save ve AI apply ileride sunucu/local güncel hash'i tekrar hesaplamalıdır.
- Konum değişikliği hash'i değiştirmez. Gelecekteki patch apply, kullanıcı daha sonra konum değiştirdiyse bu görsel düzeni ayrıca korumalıdır; bu fazda patch/apply kodu yoktur.

## Hatalar ve testler

Machine-readable `{code,severity,nodeId?,edgeId?,fieldKey?,translationParams?}`. Şema/girdi hatalarında ayrıca bounded path olabilir. Codes sabit; mesaj üretimi UI'ya aittir. Issues deterministik sıralanır, duplicate issue'lar temizlenir. Önce schema/parsing, sonra saf graph kontrolü; invalid shape üzerinde graph traversal yapılmaz.

Pozitif/negatif tablo, limit/eşik+1, serializer round-trip, native SHA-256 karşılaştırması, array reorder, frozen input ve hostile JSON testleri gerekir. Eksik/dangling/cyclic graph'ların traversal'ı sınırlıdır; hata sonucunda mevcut kullanıcı state'ine dokunulmaz. Topology `O(V+E)` geçişlerle değerlendirilir; 50-node ölçümü kaydedilir. Bu ölçüm Faz 3 simulator veya production Worker CPU ölçümü yerine geçmez.

## Açık kalanlar

D-03 taslak saklama, D-05/06 auth/kota/taşıma, D-07 bütçe eşitliği, D-09 silme, D-11 patch ordering/idempotency ve D-12–14 sonraki faz gereksinimleri açık kalır. OpenAPI bunları planned/TBD olarak işaretler. `candidateWorkflow` ve `baseContentHash` wire isimleri API belgesine göre kullanılır; restore/history uygulanmaz.
