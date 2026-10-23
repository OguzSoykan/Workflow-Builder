# Fazlara göre yol haritası

**Durum:** WB-001A/B main'de; Faz 1 test/CI/API dokümanları devam dalında hazırlandı.
Şema/validator kararları ve tam doğrulama kapıları açık; Faz 1 henüz kapanmadı.
Güncel kanıt [STATUS](STATUS.md), kapsam [TASKS](TASKS.md) içindedir. Faz 2 başlamadı.

| Faz / milestone        | Amaç ve kapsam                                                                                                 | Bağımlılık                                         | Çıkış kapısı                                                                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yönetim temeli / WB-PM | Mevcut belgeleri koruma, Git, AGENTS/ROADMAP/TASKS/STATUS, karar kaydı, PR kuralları                           | Mevcut planlama paketi                             | Belgeler tutarlı ve bağlantılar geçerli; orijinal içerikler korunmuş; uygulama yapılmamış; kullanıcı incelemesine hazır                                                                                                 |
| Faz 1 / M0             | WB-001–004: strict TS workspace, minimal React/Worker health, schema v1, saf validator, CI, ADR/OpenAPI temeli | Uygulama onayı; görev bazlı açık kararlar          | TASKS'taki tüm alt görevler ve WB-001–004 kabul koşulları kanıtlı; typecheck/lint/format/test/build/secret scan; negatif CI doğrulaması; çalışan health; Faz 2 için rapor ve onay                                       |
| Faz 2                  | WB-005–008: ERP canvas, input editor, yerel kayıt, güvenli import/export, validation UX, undo/redo             | M0 ve faz onayı; D-03/D-08/D-14                    | Dört node ve tipli alanlar düzenlenir; refresh veriyi korur; bozuk import mevcut çalışmayı bozmaz; hata node'a bağlanır; undo/redo testli (FR-01–03/05, AC-01/05/11)                                                    |
| Faz 3 / M1             | WB-009–011: saf simulator, manuel approval, trace, üç örnek                                                    | Faz 2; D-04/D-14                                   | Aynı input/karar aynı trace; Approval'da durma; doğru handle/outcome; external IO yok; 50-node performans hedefi referans makineyle ölçülmüş; örnek E2E (FR-04/13, AC-02–04)                                            |
| Faz 4 / M2             | WB-012–015: Firebase auth, Worker verification, private D1 CRUD/revisions, isteğe bağlı taşıma/revision viewer | M1; D-05/D-06/D-09/D-10/D-12                       | Token negatif testleri; owner izolasyonu; eşzamanlı PUT'ta tek kazanan + 409; immutable revisions; şifre Worker'a gitmez; seçilen taşıma politikası yereli korur (FR-09/10, AC-08/12)                                   |
| Faz 5 / M3             | WB-016–021: tek DO bütçe/kota ledger, Turnstile, OpenAI adapter, create/edit preview/diff/apply/undo           | M2; D-01/D-05/D-07/D-11/D-12/D-13                  | Rezervasyon ve paralellik testi; limit/ledger arızasında sıfır provider çağrısı; onaysız değişiklik yok; stale/hash/ID koruma; 20 prompt değerlendirmesi ve ≥%85 hedefi için gerçek sonuç (FR-06–08/12, AC-06/07/09–11) |
| Faz 6 / M4             | WB-022–023: TR/EN, klavye erişimi, dar ekran, operasyon, staging/prod, E2E, rollback                           | Tüm önceki P0 işler; D-09/D-12/D-14; release onayı | Ana senaryolar iki dilde; E2E zinciri; ayrı D1/secret ortamları; Free CPU/kota ölçümü; güvenlik kontrolü; staging smoke; kontrollü deploy/rollback (FR-11, AC-13 ve tüm P0 AC)                                          |

## Kapsamı koruma

- Faz 1'de yalnızca health amaçlı minimal UI/API vardır; canvas, simulator, auth, D1 migration/CRUD, DO ve OpenAI bağlantısı yoktur.
- TR/EN message keys ve erişilebilir bileşen alışkanlıkları ilk ilgili UI görevlerinden itibaren kullanılır; WB-022 bunları bütün ürün üzerinde doğrular. Faz 1 validator lokalize metin yerine kod üretir.
- FR-13 şablonları PRD'de P1, WB-011 ise backlog'da P0'dır. Faz 3 planında görünür kalır; release zorunluluğu D-14 çözülmeden değiştirilmez.
- FR-14 restore ve simülasyon history P1'dir; WB-015'in revision viewer'ı restore uygulaması sayılmaz. Ayrı kapsam/iş kararı D-14'e bağlıdır.
- M1'in herkese açık preview, M3'ün MVP adayı olması yayın izni değildir; herkese açık release gerekli güvenlik ve ürün kapılarından geçer.
- WB-024–027 (gerçek görev/RBAC, webhook/mail/timer, ortak çalışma, BPMN/DSL) MVP dışında kalır.

## Faz raporu

Her çıkış raporunda tamamlanan görevler, commit/PR bağlantıları, gerçek komut sonuçları, başarısız/çalıştırılmamış kontroller, açık kararlar, ücretsiz hosting/maliyet etkisi ve sonraki önerilen görev yer alır. Gelecekte yapılacak testler yapılmış gibi raporlanmaz.
