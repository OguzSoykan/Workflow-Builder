# Faz 2 — Editör ve yerel çalışma

**Durum:** Kullanıcı başlama onayı verdi. Aktif kart WB-005A. Fazın tamamı henüz bitmedi.
İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-2.md). Kaynak kapsam: PRD FR-01–03/05,
AC-01/05/11 ve BACKLOG WB-005–008. Mevcut şema/limit/kimlik sözleşmesi korunur.

| Kart    | İş                             | Durum       | Kabul / bağımlılık                                                                                                                                                |
| ------- | ------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WB-005A | Tuval ve temel graph düzenleme | In Progress | Dört node ekle/seç/taşı/etiketle/sil; zoom; bağlantı ekle/sil; stable ID; 50 node/100 edge sınırı; Start hedefi, geçersiz handle, duplicate çıkış ve cycle engeli |
| WB-005B | Node config özellik paneli     | Backlog     | Start açıklaması, Approval rolü, End sonucu, Condition ayarlarının ilgili input görevine bağlanması; şema uyumlu değişiklikler                                    |
| WB-006A | Tipli input alanları           | Backlog     | number/string/boolean/date/enum; benzersiz key, default/options/validation; mevcut alan referanslarına etkiler görünür                                            |
| WB-006B | Koşul ve onay dalı deneyimi    | Backlog     | Alan türüne uygun operatör/değer; true/false ve approved/rejected bağlantıları, açıklayıcı hatalar                                                                |
| WB-007A | Yerel kayıt                    | Backlog     | D-03/D-08 kararları; refresh ile devam; bozuk/quota/çok sekme senaryoları                                                                                         |
| WB-007B | Güvenli import/export          | Backlog     | Boyut/şema/semantik sınırlar; bozuk import çalışma kopyasını değiştirmez; D-03 taslak politikası                                                                  |
| WB-008A | Graph validation UX            | Backlog     | Mevcut saf validator; lokalize açıklama, ilgili node/edge/alanı gösterme; AC-05                                                                                   |
| WB-008B | Undo/redo ve Faz 2 çıkışı      | Backlog     | Anlamlı işlem bazlı geri al/yeniden yap; oluştur/düzenle/kaydet/import akışının E2E kanıtı                                                                        |

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
