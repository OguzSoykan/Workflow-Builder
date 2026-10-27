# Faz 2 — Editör ve yerel çalışma

**Durum:** WB-005A/B ve WB-006A/B main’de. D-03/D-08 onaylandı; WB-007A main’de. WB-007A/B ve WB-008A main’de. WB-008B undo/redo ve Faz 2 çıkış senaryosu uygulandı; PR merge edilince faz kartları tamamlanır. Faz 3 ayrı onay gerektirir. Fazın tamamı henüz bitmedi.
İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-2.md). Kaynak kapsam: PRD FR-01–03/05,
AC-01/05/11 ve BACKLOG WB-005–008. Mevcut şema/limit/kimlik sözleşmesi korunur.

| Kart    | İş                             | Durum  | Kabul / bağımlılık                                                                                                                                                |
| ------- | ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-005A | Tuval ve temel graph düzenleme | Done   | Dört node ekle/seç/taşı/etiketle/sil; zoom; bağlantı ekle/sil; stable ID; 50 node/100 edge sınırı; Start hedefi, geçersiz handle, duplicate çıkış ve cycle engeli |
| WB-005B | Node config özellik paneli     | Done   | Start açıklaması, Approval rolü, End sonucu, Condition ayarlarının ilgili input görevine bağlanması; şema uyumlu değişiklikler                                    |
| WB-006A | Tipli input alanları           | Done   | number/string/boolean/date/enum; benzersiz key, default/options/validation; mevcut alan referanslarına etkiler görünür                                            |
| WB-006B | Koşul ve onay dalı deneyimi    | Done   | Alan türüne uygun operatör/değer; true/false ve approved/rejected bağlantıları, açıklayıcı hatalar                                                                |
| WB-007A | Yerel kayıt                    | Done   | D-03/D-08 kararları; refresh ile devam; bozuk/quota/çok sekme senaryoları                                                                                         |
| WB-007B | Güvenli import/export          | Done   | Boyut/şema/semantik sınırlar; bozuk import çalışma kopyasını değiştirmez; D-03 taslak politikası                                                                  |
| WB-008A | Graph validation UX            | Done   | Mevcut saf validator; lokalize açıklama, ilgili node/edge/alanı gösterme; AC-05                                                                                   |
| WB-008B | Undo/redo ve Faz 2 çıkışı      | Review | Anlamlı işlem bazlı geri al/yeniden yap; oluştur/düzenle/kaydet/import akışının E2E kanıtı                                                                        |

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
henüz çözülmüş sayılmaz. Yalnız bağımlı kartlar bekler. Zod güvenlik takibi 27 Ekim'de kapatıldı (ADR-016);
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

## WB-007B uygulama sınırı

- Export `serializeWorkflow` ile kanonik JSON ve yeniden hesaplanmış `contentHash` üretir (ADR-014). Semantik eksikli taslak dışa aktarılabilir (D-03); sorun sayısı uyarı olarak gösterilir. Hash eklenince 256 KiB aşılırsa indirme yapılmaz.
- Import dosya boyutunu okumadan önce sınırlar, ardından `parseWorkflowJSON` ile byte/şema/kimlik kurallarını uygular. Hatalı dosya çalışma kopyasını değiştirmez; bilinen hata kodu genel şema hatasına tercih edilerek Türkçe açıklanır.
- Geçerli dosya, uyarılarla birlikte açık onaydan sonra taslağın yerine geçer ve otomatik kaydedilir. Hash uyuşmazlığı ret değil bilgi notudur; editör türetilmiş hash'i saklamaz.
- Kanıt: 283 Vitest + 2 scanner + 3 OpenAPI; 26 Chromium senaryosu. Contract/core ve bağımlılık değişikliği yok.

## WB-008A uygulama sınırı

- Mevcut public `validateWorkflow` çıktısı web katmanında Türkçe cümleye çevrilir; adım adı ve çıkış adı (Doğru/Yanlış, Onaylandı/Reddedildi) kullanılır. Contract/core ve issue kodları değişmez.
- Liste önce graph geneli sorunları, sonra adımları tuval sırasıyla gösterir. Aynı adımın başka sorunu varsa türetilmiş `PATH_NOT_TERMINATING` gizlenir. Soruna tıklamak ilgili adımı veya bağlantıyı seçer.
- Sorunlu kartlar çerçeve ve “⚠ N sorun” etiketiyle işaretlenir; geçerli akışta “çalıştırılabilir” durumu görünür. D-03 gereği sorunlu taslak kaydı engellenmez.
- Kanıt: 287 Vitest + 2 scanner + 3 OpenAPI; 27 Chromium senaryosu. Bağımlılık değişikliği yok.

## WB-008B uygulama sınırı ve Faz 2 çıkışı

- `historyReducer` mevcut `editorReducer`'ı sarar; yalnız bellekte 50 adım tutar (D-08). Başarılı ve içeriği değiştiren işlem bir adımdır; seçim, reddedilen ve etkisiz işlem adım açmaz. Bir sürükleme (`onNodeDragStart` checkpoint) tek adımdır. Import/diğer sekme yüklemesi geri alınabilir.
- Başlıkta Geri al/Yinele; form alanı dışında Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z ve Ctrl+Y. Metin alanlarında tarayıcının yerel geri alması korunur. Yenileme geçmişi sıfırlar.
- Çıkış kanıtı (`tests/e2e/phase2-exit.spec.ts`): alan + koşul + iki dallı onay ile çalıştırılabilir akış oluşturma, yenilemede koruma, export, bozma, import, undo/redo ve tekrar yenileme. Toplam 292 Vitest + 2 scanner + 3 OpenAPI; 29 Chromium senaryosu.
- Kalan riskler: React Flow tip yaması (ADR-015, upstream bekliyor) ve bağımsız insan review yok. Zod advisory ADR-016 ile kapatıldı. 390px mobil görsel inceleme 27 Ekim'de yapıldı; Dosya bölümünün sıkışması ve panel/dosya sorun sayısı farkı düzeltildi.
