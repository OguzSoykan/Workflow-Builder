# Faz 2 — Editör ve yerel çalışma

**Durum:** WB-005A/B ve WB-006A/B main’de. D-03/D-08 onaylandı; WB-007A yerel taslak kaydı uygulandı, PR ve hosted CI bekleniyor. Sonraki kart WB-007B. Fazın tamamı henüz bitmedi.
İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-2.md). Kaynak kapsam: PRD FR-01–03/05,
AC-01/05/11 ve BACKLOG WB-005–008. Mevcut şema/limit/kimlik sözleşmesi korunur.

| Kart    | İş                             | Durum   | Kabul / bağımlılık                                                                                                                                                |
| ------- | ------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-005A | Tuval ve temel graph düzenleme | Done    | Dört node ekle/seç/taşı/etiketle/sil; zoom; bağlantı ekle/sil; stable ID; 50 node/100 edge sınırı; Start hedefi, geçersiz handle, duplicate çıkış ve cycle engeli |
| WB-005B | Node config özellik paneli     | Done    | Start açıklaması, Approval rolü, End sonucu, Condition ayarlarının ilgili input görevine bağlanması; şema uyumlu değişiklikler                                    |
| WB-006A | Tipli input alanları           | Done    | number/string/boolean/date/enum; benzersiz key, default/options/validation; mevcut alan referanslarına etkiler görünür                                            |
| WB-006B | Koşul ve onay dalı deneyimi    | Done    | Alan türüne uygun operatör/değer; true/false ve approved/rejected bağlantıları, açıklayıcı hatalar                                                                |
| WB-007A | Yerel kayıt                    | Review  | D-03/D-08 kararları; refresh ile devam; bozuk/quota/çok sekme senaryoları                                                                                         |
| WB-007B | Güvenli import/export          | Backlog | Boyut/şema/semantik sınırlar; bozuk import çalışma kopyasını değiştirmez; D-03 taslak politikası                                                                  |
| WB-008A | Graph validation UX            | Backlog | Mevcut saf validator; lokalize açıklama, ilgili node/edge/alanı gösterme; AC-05                                                                                   |
| WB-008B | Undo/redo ve Faz 2 çıkışı      | Backlog | Anlamlı işlem bazlı geri al/yeniden yap; oluştur/düzenle/kaydet/import akışının E2E kanıtı                                                                        |

## WB-005A uygulama sınırı

- Uygulama içinde ana rota editör; teknik health ekranı `/health` üzerinden korunur.
- Graph modelinin otoritesi Workflow contract'tır. React Flow selection/ölçüm gibi
  UI alanları canonical belgeye eklenmez. ID üretimi web sınırında yapılır.
- Şema uyumlu ancak semantik olarak eksik taslak oturum belleğinde düzenlenebilir.
  Bu karar yerel saklama/import/cloud-save politikasını belirlemez.
- Node/edge silme bağlı referansları temizler. Etiket/konum değişimi ID'yi değiştirmez.
- Tuvalin yanında klavye ile kullanılabilen node listesi ve bağlantı formu bulunur.
- Kaydetme henüz yoktur; kullanıcıya yenilemenin oturum değişikliklerini sileceği açıkça söylenir.

## Kalite ve kararlar

WB-005A için saf düzenleme fonksiyonları: geçerli ve hatalı bağlantılar, silmede
referans temizliği, stable ID, limitler ve değişmezlik. Playwright: gerçek tuvalde
node ekleme, etiket, taşıma, bağlantı ve silme; mevcut health/hash senaryoları korunur.
Typecheck/lint/format/unit/build/secret scan ve PR CI sonuçları günlüğe yazılır.

D-03 (taslak saklama), D-08 (storage ve çok sekme UX), D-14'ün ilgili kabul maddeleri
henüz çözülmüş sayılmaz. Yalnız bağımlı kartlar bekler. Zod güvenlik takibi açık;
Faz 2 başlatma onayı bu advisory'nin giderildiği anlamına gelmez.

## WB-005B uygulama sınırı

- Özellik paneli ad ile Start açıklaması, Approval rolü veya End sonucunu tek işlemde uygular. Boş açıklama isteğe bağlı alanı kaldırır.
- Şema kontrolü reddederse belge ve seçili adım korunur; kısmi güncelleme yapılmaz. ID, konum ve bağlantılar değişmez, türetilmiş hash kaldırılır.
- Başka bir adıma geçmek uygulanmamış form girişlerini bırakır; kayıtlı değerler yeniden gösterilir. Bu davranış arayüzde açıklanır.
- Condition adı düzenlenebilir; alan/operatör/değer paneli WB-006'ya bağlıdır. Kalıcı kayıt henüz yoktur.
- Kanıt: 205 Vitest + 2 scanner + 3 OpenAPI; 15 Chromium senaryosu. Güncel PR/CI ve entegrasyon sonuçları çalışma günlüğünde.

## WB-006A uygulama sınırı

- Beş alan türü, 30 alan limiti, benzersiz ASCII key ve tür bazlı defaults/options/validation ortak şemayla doğrulanır. Varsayılan yok, sıfır, false ve boş metin ayrı değerlerdir.
- Key değişimi bağlı condition referanslarıyla birlikte atomiktir. Kullanılan alan silinmez; mevcut koşulu bozan tür/seçenek değişikliği reddedilir. Uyumlu seçenek eklemeye izin verilir.
- Alan listesi bağlı koşulları ve varsa tür/değer uyumsuzluğunu gösterir. Ekleme sırasında mevcut eksik koşulun ayarı otomatik değiştirilmez; condition paneli WB-006B'dedir.
- Hatalı form belgeyi değiştirmez; girişler düzeltilebilir. Başka alan seçimi/vazgeçme uygulanmamış girişleri bırakır. Son aday, referanslar güncellendikten sonra byte limiti için de doğrulanır.
- Kanıt: 239 Vitest + 2 scanner + 3 OpenAPI; 18 Chromium senaryosu. Yeni bağımlılık, persistence veya cloud değişikliği yok.

## WB-006B uygulama sınırı

- Condition paneli tanımlı alanı, alan türüne uygun operatörü (`OPERATORS`) ve tipli değeri sunar: sayı/tarih/metin girişi, doğru-yanlış ve enum seçimi, enum `in` için çoklu seçim. Alan yoksa önce alan eklenmesi istenir.
- Ad ve koşul ayarı tek `update-condition` işlemiyle uygulanır. Şema veya public validator (`INPUT_FIELD_MISSING`, `OPERATOR_TYPE_MISMATCH`, `CONDITION_VALUE_INVALID`) reddederse belge ve seçim değişmez; türe özgü Türkçe açıklama gösterilir. ID, konum ve bağlantılar korunur, türetilmiş hash kaldırılır.
- Start/Approval/Condition panelinde her çıkışın hedefi veya bağlı olmadığı açıklanır. Bağlantı formu ilk boş çıkışı önerir ve bağlı çıkışları işaretler; dolu çıkış hatası korunur. Tuval kartı geçerli koşulun özetini gösterir.
- Kanıt: 260 Vitest + 2 scanner + 3 OpenAPI; 20 Chromium senaryosu. Contract/core, bağımlılık, persistence veya cloud değişikliği yok.

## WB-007A uygulama sınırı

- D-03/D-08 (27 Ekim, kullanıcı onayı): şema-geçerli her taslak, semantik eksikleri olsa da `localStorage` içinde tek anahtarda (`workflow-builder:draft:v1`) otomatik saklanır; yenilemede geri yüklenir. Yükleme tek başına kaydı yeniden yazmaz.
- Okunamayan, şema dışı veya 256 KiB'ı aşan kayıt `…:corrupt` anahtarına yedeklenir, editör boş taslakla açılır ve kullanıcı bilgilendirilir. Quota/erişim hatasında düzenleme sürer; kayıt yapılamadığı açıkça gösterilir.
- Başka sekme aynı anahtarı değiştirirse `storage` olayıyla uyarı çıkar, otomatik kayıt durur. Kullanıcı diğer sekmenin sürümünü yükler veya bu sekmedekini kaydeder (son yazan kazanır). Undo geçmişi saklanmaz; sync yok.
- Kanıt: 268 Vitest + 2 scanner + 3 OpenAPI; 24 Chromium senaryosu. Contract/core ve bağımlılık değişikliği yok.
