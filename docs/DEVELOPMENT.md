# Git, commit, PR ve kod inceleme kuralları

## Kaynak kontrolü ve dallar

- Ana dal `main`; görevler kısa ömürlü ayrı dalda. Bir dal/PR tek küçük kart veya tek tutarlı dokümantasyon teslimi içindir.
- Adlar: `feat/WB-001A-workspace`, `fix/WB-003A-cycle-check`, `docs/WB-PM-project-foundation`, `chore/WB-004A-ci`.
- Yeni görevden önce çalışma ağacını ve diff'i kontrol et; mevcut kullanıcı değişikliklerini silme. Güncel main'den dal aç. Paylaşılan dalı yeniden yazma, force push veya destructive reset uygulama.
- `main` için PR + required checks + review hedeflenir. GitHub planı/yetkisi engelliyorsa bunu STATUS'ta kaydet; koruma varmış gibi davranma. Otomatik merge/deploy varsayılan değildir.
- Yerel Git deposu, GitHub remote ve GitHub oturumu ayrı şeylerdir. Remote kullanıcı talimatıyla eklenir; doğru owner/visibility doğrulanır. Kullanıcının bu oturumdaki `OguzSoykan` talimatı remote oluşturma ve push yetkisidir.

## Commit sözleşmesi

- Conventional Commit biçimi: `docs(planning): split WB-001 into reviewable tasks`, `feat(contract): validate schema version (WB-002A)`, `fix(core): reject self loops (WB-003A)`.
- İzinli tipler: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`. Başlık tek işi anlatır; kart ID'si başlık veya gövdede bulunur. Gövde gerektiğinde neden, kapsam ve doğrulama içerir.
- Commit küçük ve tutarlı olsun. İlgisiz format/dependency güncellemelerini karıştırma. Secrets, kişisel veri, build/coverage, node_modules commitlenmez; lockfile ilgili değişiklikle commitlenir.
- `git add -- <ilgili yollar>` ve staged diff incelemesi kullan; tüm kullanıcı dosyalarını sorgusuz stage etme. Git user.name/email mevcutsa yeniden isteme; commit kimliği GitHub hesap yetkisi değildir.
- Bu repo başlangıcındaki baseline ve dokümantasyon commit'leri kullanıcı tarafından `OguzSoykan/Workflow-Builder` main'e gönderildi. Yeni işler güncel main'den görev dalına ayrılır; inceleme öncesi ana dala sessiz merge edilmez.

## PR akışı

1. Kartı Ready yap: onay, bağımlılık, karar ve kabul koşullarını doğrula. Tek aktif uygulama görevi.
2. Görev dalında uygula; ilgili test/kapıları çalıştır; sonuçları kaydet. Erken paylaşım gerekiyorsa Draft PR açılabilir.
3. [PR şablonunu](../.github/PULL_REQUEST_TEMPLATE.md) doldur: sorun/sonuç, WB/FR/AC/D bağlantıları, kapsam, kanıt, risk ve geri alma. Gerçek terminal/CI çıktıları kullan; çalışmayan testi `NOT RUN` yaz.
4. Diff ve secret incelemesi yap. Uygulama PR'ında en az bir insan incelemesi hedeflenir; tek geliştirici durumunda ürün sahibi review yapar. Agent öz incelemesi ayrı açıkça belirtilir.
5. Required CI yeşil, görüşler çözülmüş ve reviewer onayı mevcutsa PR merge'e hazırdır. Merge yetkisi/oturum onayı dahilinde squash merge tercih edilir; nihai commit kart ID'sini taşır. Yetki yoksa Review'da bırak.
6. Merge sonrası TASKS/STATUS'u güncelle. Merge, deploy veya sonraki faza başlama izni anlamına gelmez.

GitHub bağlantısı yoksa yerel diff + commit ile somut inceleme paketi hazırlanır; gerçek PR/hosted CI eksikliği belirtilir. Dokümantasyon paketini hazırlamak için uygulama testleri veya staging gerekmez. Yerel doğrulama hosted check başarısı diye sunulmaz.

## İnceleme odakları

| Alan            | İnceleyenin değerlendireceği kanıt                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Ürün/kapsam     | PRD v1.1 korunuyor; onaysız karar/faz geçişi yok; ilgili FR/AC karşılanıyor                                   |
| Modülerlik      | Public arayüzler, saf core, tekrarın önlenmesi; gereksiz bağımlılık/soyutlama yok                             |
| Doğruluk        | Başarı/hata/sınır senaryoları; deterministic hash/issue; girdi mutasyonu ve yarış koşulları                   |
| Güvenlik        | Güvenilmeyen graph/prompt, owner isolation, token doğrulaması, log/secret gizliliği; ilgili fazda             |
| Maliyet/hosting | Free hedefi, bounded input/CPU; ilgili fazda atomik bütçe/rezervasyon ve fail-closed; canlı API testleri açık |
| Operasyon       | Gerçek komut sonuçları, environment ayrımı, geri alma ve migration etkisi                                     |
| Dokümantasyon   | TASKS/STATUS ve contract/ADR uyumu; TBD öneriler kesin karar diye gösterilmiyor                               |

## Kalite ve geri alma

[TASKS kalite kapıları](../TASKS.md) görev bazında uygulanır. CI hazır olana kadar yapılan yerel kontroller kaydedilir; WB-004A kapanınca code PR'larında hosted CI kanıtı gerekir. Prod deploy için PRD AC-13 ve Faz 6 kapıları ayrıca geçerlidir.

Kod/doküman hatasında geçmişi silmek yerine ilgili değişikliği geri alan yeni commit/PR tercih edilir. Sonraki D1 migration görevleri staging, export/backup değerlendirmesi ve geri dönüş planı içerir; Faz 1'de migration yazılmaz. Baseline commit orijinal planlama paketini her zaman erişilebilir tutar.
