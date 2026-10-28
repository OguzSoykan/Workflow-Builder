# Açık kararlar, tutarsızlıklar ve riskler

**26 Ekim 2026:** D-01/D-02/D-04'ün Faz 1 varsayılanları kullanıcı onayıyla
kesinleşti; D-15 teknik ayrıntıları ADR-014 ile uygulandı. Aşağıdaki tablo ilk açılış
gerekçelerini korur; güncel onay kaydı bu belgenin sonunda bulunur. D-03/D-11 ve
sonraki faz ürün politikaları açık kalır. Açık karar yalnızca bağımlı işi bekletir.

## Korunan kesin kararlar

PRD §2 ve AC'ler aynen korunur: ERP arayüz/TR-EN; dört node; manuel approval simülasyonu; tipli kullanıcı alanları; anonim browser/JSON; üye owner-private D1; Firebase email/password; AI create/edit için diff ve açık onay; stable ID/hash/revision; anonim tek hak hedefi + Turnstile/kota/global koruma; tek seferlik 5 USD bütçe ve 4,50 USD stop. Architecture ADR-001–011 bu belgede yeniden tanımlanmaz. Yeni auth/AI/UI/infra seçimi yapılmadı.

## Karar kayıtları ve takip

| ID   | Kaynak ve eksik/tutarsız nokta                                                                                                                                                                                                                                  | Çözüm için gerekli karar/kanıt                                                                                                                                                                                                            | Bağımlı iş / sahibi                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D-01 | Workflow Contract §1 `contentHash` belgenin içinde; iş graph'ı/canvas sırası ayrımı var, ancak alan allowlist'i ve canonical algoritma yok. §6 `baseContentHash`, PRD/Architecture bazı yerlerde `baseHash` kullanıyor.                                         | Hash algoritması, UTF-8 canonicalization, ID ile array sıralama, hash/metadata dışlaması; label/title/locale/layout/position etkisi; wire isimlerinin eşlemesi. Layout değişmişken AI apply'ın görsel değişikliği ezmemesi kuralı.        | WB-002B, WB-020 / teknik öneri + ürün sahibi UX onayı      |
| D-02 | 50 node/100 edge PRD'de kesin; 30 field Workflow Contract'ta öneri, CODEX_PHASE_1'de kabul koşulu. Boyut bir yerde 256 KB, diğerinde 256 KiB; graph mı HTTP envelope mı belirsiz.                                                                               | 30 field'ın statüsü; tam byte limiti, UTF-8 ölçümü ve envelope payı. Prompt 2.000 karakter ölçüm birimi, string/key/layout derinlik sınırları ve hangi katmanda kontrol edileceği. 50/100 sınırını değiştirme yetkisi yok.                | WB-002A/C ve API / ürün sahibi + teknik                    |
| D-03 | Yerel editör eksik graph üretir; API tüm kayıtlarda tam semantik validator ister. Eksik taslakların local autosave/export/import/cloud-save davranışı açık değil.                                                                                               | Şema geçerliliği ile yürütülebilir graph ayrımı; eksik taslak hangi ortamda saklanabilir? Invalid import mevcut belgeyi bozmaz kuralını koruyarak draft round-trip UX.                                                                    | WB-004B, WB-007/014 / ürün sahibi                          |
| D-04 | Workflow Contract §2 case-sensitive string yalnızca öneri; optional input/default/validation şekli, enum `in` literal tipi, key grameri ve boş/null davranışı tanımlı değil.                                                                                    | Tip/literal/default/options/required/validation tablosu; case ve Unicode politikası, geçerli takvim tarihi, sayı aralığı/hassasiyeti. Para hesaplaması veya custom regex/script özelliklerini kendiliğinden ekleme.                       | WB-002A, WB-003B, WB-009 / ürün sahibi + teknik            |
| D-05 | PRD UJ-05/§9 e-posta doğrulamasını önerilen varsayılan diyor; API bunu kesin gibi yazıyor. Üye 3/UTC gün ve anonim hakkın üyeye ek olması PRD §10'da ertelenmiş. AC-10 tüm public AI isteklerini, Architecture ağırlıkla anonim Turnstile kontrolünü anlatıyor. | Email verification gate, doğrulanmamış üye davranışı, günlük kota, guest→user hakları ve üye/public Turnstile kapsamı için açık ürün kararı.                                                                                              | WB-012/013/017 ve final API / ürün sahibi                  |
| D-06 | PRD UJ-06 taşıma isteğe bağlı öneri; Architecture kesin onay davranışı tarif ediyor. Local workflowId ile server-created workflowId ilişkisi, tekrarlı kopyalama ve logout ayrımı yok.                                                                          | Taşıma onayı, duplicate/idempotency/ID eşlemesi, yerel kopya saklama ve ortak cihaz/logout davranışı. Onaysız otomatik yükleme yapma.                                                                                                     | WB-007/014/015 / ürün sahibi + teknik                      |
| D-07 | PRD AC-09 eşiğe varıldığında çağrı yok derken Architecture §4 yalnızca 4,50 USD üzerini reddediyor; Data Model invariant `<= stop_at` izin veriyor.                                                                                                             | Tam eşik rezervasyonunun kabul/ret kuralı, integer micro-USD/yuvarlama, timeout/crash/unknown billing uzlaştırması, quota refund ve idempotency replay sonucu. 4,50/5 USD değerleri ve fail-closed kararı değişmez.                       | WB-016–018 / ürün sahibi + teknik                          |
| D-08 | Browser storage IndexedDB/localStorage olarak iki seçenekli; storage quota, bozuk kayıt, multi-tab conflict ve browser eviction davranışları yok.                                                                                                               | Minimum storage seçimi, failure/restore UX, local revision/undo saklama sınırı, çok sekme politikası; gereksiz sync altyapısı kurma.                                                                                                      | WB-007/008 / teknik + ürün sahibi UX                       |
| D-09 | Veri saklama/silme politikası açık; metrics 30 gün öneri; soft delete, token revocation, Firebase hesap silme ve D1 temizliği tutarlılığı tamamlanmamış.                                                                                                        | Hangi verinin ne kadar tutulacağı, kullanıcı silme/export beklentileri, cleanup/backup ve revocation davranışı; gerekirse uzman değerlendirmesi. Bu belge hukuki uygunluk kararı vermez.                                                  | WB-013/014/023, P1 hesap silme / ürün sahibi               |
| D-10 | Architecture §5 D1 atomik işlem incelemesini WB-020'ye bağlıyor; backlog WB-020 AI edit, D1 görevi WB-014.                                                                                                                                                      | Referans düzeltmesi ve WB-014 altında teknik D1 transaction/batch spike: partial failure rollback, unique revision, conditional update ve paralel PUT kanıtı. Bu, D1'i veya revision tasarımını değiştirmez.                              | WB-014 / teknik; kaynak düzeltmesi kaydı                   |
| D-11 | AI payload'da API `candidateWorkflow`, Workflow Contract `candidateGraph`; patch sıralaması ve operation payload'ları eksik. Idempotency-Key API'de opsiyonel, ledger güvenliği için gerekli görünüyor. JSON genel kuralı DELETE 204 ile istisna gerektiriyor.  | Kanonik wire isimleri, request/response schemas, patch atomicity/order/delete referansları, idempotency scope/hash/TTL/replay, 204 bodysiz yanıt. Faz 1 OpenAPI taslağı karar verilmemiş AI detaylarını TBD gösterir.                     | WB-004B, WB-016/018/020 / teknik; UX etkisinde ürün sahibi |
| D-12 | Planlama paketindeki model adı/Structured Outputs uygunluğu, fiyatlar ve Cloudflare/Firebase free limitleri canlı olarak doğrulanmış değil. Staging/prod ayrı DO kullanırsa toplam 5 USD bütçenin koordinasyonu belirsiz.                                       | Resmi kaynak + tarih + hesap erişimiyle model/limit doğrulaması; tek toplam bütçede staging/prod/live eval payı, merkezi sınır veya toplamı aşmayan tahsis. Staging için varsayılan mock; daha pahalı fallback yok.                       | WB-016/018/021/023 / teknik + bütçe sahibi                 |
| D-13 | 20 canlı prompt değerlendirmesi ve model değişince tekrar test, küçük tek seferlik bütçeyi tüketebilir. Provider error/retry ücretleri kesinleştirilmemiş.                                                                                                      | Mock contract testleriyle canlı kalite eval'ini ayır; canlı çalıştırmadan önce model fiyatı, token üst sınırı, ayrılmış bütçe ve izin kaydı. ≥%85 ölçülebilir kalite hedefidir, kesin başarı vaadi değil.                                 | WB-018/021 / teknik + bütçe sahibi                         |
| D-14 | FR-13 şablon P1, WB-011 P0; FR-14 restore/history için yeterli ayrı görev yok. AC-03 15000/5000 bekler ama fixture condition eşik/operator'u yazmıyor. Erişilebilirlik standardı ve 1 saniye referans makinesi belli değil.                                     | Öncelik/release kapsamı; restore/history kartları; örneğin `amount > 10000` için onaylı fixture; klavye senaryoları, dar ekran ölçütleri ve benchmark ortamı.                                                                             | WB-006/009/011/022/023 / ürün sahibi + teknik              |
| D-15 | Workflow ID UUID/string ve DB UUID/ULID, config/metadata/validation alanları ayrıntısız; bazı schema hatalarının issue code karşılığı yok.                                                                                                                      | ID formatları ve üretim sınırı, unknown key politikası, duplicate/invalid literal/date/input için stable code tablosu; API error envelope ile validator issues eşlemesi. ID'lerin etiketten üretilmemesi ve güncellemede korunması kesin. | WB-002A/C, WB-003A/B, WB-004B / teknik                     |

## Süreç tutarsızlıkları ve bu teslimdeki çözüm

- Eski `CODEX_PHASE_1` “tek gerçek kaynak” derken yeni görev ürün belgelerini esas alıyor. [AGENTS](../AGENTS.md) PRD ürün önceliğini, teknik belge rollerini ve TASKS yürütme planını ayırır; kaynak gereksinimler değiştirilmedi.
- WB-001 ve WB-004 ikisi de CI içeriyor. Temel yerel araçlar WB-001A–C, hosted CI WB-004A, doküman/spec WB-004B, bütünleşik kapı WB-004C olarak ayrıldı. Üst görev kabul koşulları korunur.
- Backlog genel DoD staging smoke isterken Faz 1 bulut entegrasyonu/deploy kapsam dışıdır. Faz 1 yerel/CI smoke kullanır; cloud staging doğrulaması WB-023'te ve staging'i etkileyen işlerde zorunludur. Bu yorum ürün/production kapısını gevşetmez.
- `main` koruması bir hedeftir. Local branch bir koruma kuralı değildir; GitHub özellikleri/yetkileri ve gerçek required checks doğrulanmadan “korumalı” denmez.

## Operasyonel takip

22 Ekim 2026 kullanıcı depoyu oluşturduğunu bildirdi. Doğrulanan gerçek hedef [OguzSoykan/Workflow-Builder](https://github.com/OguzSoykan/Workflow-Builder), görünürlük **public**, varsayılan dal `main`. Önceki `proje-v1/private` varsayımı bu bilgiyle değiştirildi; depo yeniden oluşturulmaz veya görünürlüğü değiştirilmez. GitHub oturumu ve remote eşleşiyor; `main` koruması kontrol anında kapalı. Remote/PR kanıtı [STATUS](../STATUS.md) içinde tutulur; secret/token yazılmaz.

## 23 Ekim 2026 — D-01/D-02/D-04 Faz 1 kararı (onaylandı)

Ürün sahibi bu oturumda aşağıdaki varsayılanlara “bunlarla devam” diyerek onay verdi.
Karar tarihi 23 Ekim 2026; etkilenen işler WB-002A/B/C ve WB-003A/B/C.
Doğrulama: tip/default/operator matrisi, UTF-8 eşik testleri, hash değişim vektörleri.

- D-02: en fazla 30 input; workflow JSON'u UTF-8 olarak en fazla 262144 byte
  (256 KiB). HTTP envelope limiti sonraki API görevinde ayrıca belirlenir.
- D-04: case-sensitive metin; optional alan default olmadan tanımlanabilir, null
  kabul edilmez. Enum `in` izinli option değerlerinden oluşan liste alır.
- D-01: başlık/etiket/dil ve iş mantığı hash'e girer; position/layout girmez.
  SHA-256, stable ID/key sıralaması ve metadata/hash dışlaması teknik ADR ile
  belirtilecek. Layout değişikliklerinin AI apply sırasında korunması sonraki
  fazda açık kalır; hash tek başına layout çakışmasını çözmüş sayılmaz.
- D-03/D-11: taslak saklama, AI payload/patch/idempotency politikaları sonraki
  fazların kararlarıdır; OpenAPI taslağında TBD olarak görünür.

Önceki bekleme kalktı. D-15 teknik biçim/unknown-key/issue-code kararı
[ADR-014](adr/ADR-014-workflow-v1.md) ile kaydedilir. D-03/D-11 ve diğer sonraki
faz ürün politikaları açık kalır; auth/AI/hosting kapsamı değişmez.

## 27 Ekim 2026 — D-03/D-08 yerel taslak kararı (onaylandı)

Ürün sahibi bu oturumda önerilen seçenekleri seçerek onay verdi. Etkilenen işler
WB-007A/B; cloud-save (WB-014) kuralı değişmez.

- D-03: Workflow v1 şemasından geçen her taslak, semantik olarak eksik olsa da
  (bağlanmamış çıkış, alanı seçilmemiş koşul) tarayıcıda otomatik saklanabilir ve
  import/export edilebilir. Validator hataları uyarı olarak gösterilir. Cloud kayıt
  sonraki fazda tam semantik doğrulama ister.
- D-08: Depolama `localStorage`, tek anahtar; belge 256 KiB sınırına sığar. Bozuk
  kayıt yedek anahtara taşınır ve editör boş taslakla açılır. Quota veya erişim hatası
  çalışmayı silmez, kullanıcıya gösterilir. Başka sekme aynı taslağı değiştirirse
  `storage` olayıyla uyarı çıkar; otomatik kayıt durur ve kullanıcı diğer sekmenin
  sürümünü yüklemeyi veya bu sekmedekiyle üzerine yazmayı seçer (son yazan kazanır).
  Undo/revizyon geçmişi saklanmaz; sync altyapısı kurulmaz.

## 28 Ekim 2026 — D-14 Faz 3 simülasyon kararları (onaylandı)

- Koşul eşiği dinamiktir: simülatör karşılaştırmayı akıştaki koşul ayarından okur, motorda
  sabit eşik yoktur. AC-03 örnek akışı ve testi varsayılan olarak `tutar > 10000` kullanır
  (15000 → Doğru, 5000 → Yanlış); kullanıcı panelden değiştirebilir.
- Eksik giriş: varsayılanı olmayan alan zorunluysa veya bir koşulda kullanılıyorsa simülasyon
  başlamadan değer istenir; boş değerle koşul değerlendirilmez.
- WB-011 (satın alma/izin/masraf örnekleri ve E2E) Faz 3'te P0'dır; örnekler editörde
  “Örnekten başla” ile yüklenir. FR-14 restore/history kapsam dışında kalır.

## 28 Ekim 2026 — Faz 4 kararları: D-05/D-06/D-09/D-12 (onaylandı)

- D-12: Gerçek Firebase projesi ve Cloudflare D1 bu fazda açılmaz. Proje kimliği ve public web
  config env değişkeniyle bağlanır; yapılandırma yoksa bulut hesabı özellikleri devre dışı
  görünür. Worker doğrulaması kendi üretilen anahtarlarla imzalanmış sahte token'larla, D1
  yerel SQLite (wrangler/miniflare) ile test edilir.
- D-05: Bulut kayıt e-posta doğrulaması ister; doğrulanmamış hesap `/me`'yi görür ama
  workflow yazamaz (`403 EMAIL_NOT_VERIFIED`). AI kota kısmı Faz 5'te kalır.
- D-06 (WB-015 basit hali): “Buluta kaydet” açık onayla yerel taslaktan yeni bulut kaydı
  oluşturur; yerel taslak silinmez. Aynı taslak tekrar kaydedilince yeni revizyon eklenir.
  Revizyon listesi salt okunurdur; restore P1 olarak kapsam dışıdır.
- D-09: Workflow silme soft delete'tir; revizyonlar korunur. Kalıcı temizleme ve hesap
  silme (P1) bu fazda yoktur, açık risk olarak izlenir.
- D-10 (teknik): Atomik kayıt D1 `batch` (tek transaction) + `(workflow_id, revision_number)`
  UNIQUE + koşullu güncelleme ile sağlanır; paralel PUT testi WB-014 kanıtıdır.

## 28 Ekim 2026 — Faz 5 kararları: D-07/D-13 ve kota (onaylandı)

- D-07: Tek global Durable Object ledger'ı; tutarlar tam sayı mikro-USD. Rezervasyon yalnız
  `committed + outstanding + requested_max ≤ 4.500.000` iken kabul edilir (eşikte çağrı yok, AC-09).
  Başarılı çağrıda gerçek maliyet düşülür, fark iade edilir. Zaman aşımı/bilinmeyen maliyette tam
  rezervasyon harcanmış sayılır (fail-closed); bekleyen rezervasyonlar kendiliğinden serbest bırakılmaz.
  Sağlayıcının kesin olarak ücretlendirmediği hatalarda (istek gönderilemedi, 4xx doğrulama) rezervasyon
  ve kota iade edilir. Aynı `requestId` tekrarında yeni rezervasyon/çağrı yapılmaz.
- Kota (D-05 ile birlikte): misafir AI hakkı yoktur; yalnız e-postası doğrulanmış üyeler UTC günü
  başına 1 AI isteği yapabilir. Turnstile ve misafir cookie'si bu kararla kapsam dışıdır.
- D-13: Testler mock/kayıtlı yanıtlarla yapılır. 20 prompt'luk canlı kalite değerlendirmesi kullanıcının
  sağlayacağı ayrı OpenAI key'iyle, çalıştırma öncesi model fiyatı, token üst sınırı ve harcama sınırı
  kaydedilerek bir kez yapılır. Key repoya/loga/sohbete yazılmaz.
