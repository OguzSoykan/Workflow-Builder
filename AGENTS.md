# Agent çalışma sözleşmesi

## Mevcut yetki sınırı

Kullanıcının 22 Ekim 2026 “PR onayını yap, Faz 1 için kalan görevleri de tamamla” talimatı **WB-001–004 ve tüm Faz 1 alt kartları** için uygulama, doğrulama, PR ve birleştirme yetkisidir. Her kart için yeniden onay isteme. PR #1 bu talimatla birleştirildi. Tek GitHub hesabı kendi PR'ına resmi Approve review veremez; kullanıcı oturum onayı ve agent öz incelemesi açıkça kaydedilir, bağımsız insan review uydurulmaz. Cloud kaynakları, ücretli API çağrısı ve deploy kapsam dışıdır. Ürün gereksinimi değişikliği ayrıca onay gerektirir.

27 Ekim 2026 “faz2 ye başla ve yaptığın her adımı bir yerde kayıt altına al”
talimatı WB-005–008 kapsamında Faz 2 uygulama/doğrulama başlangıç onayıdır.
Aktif plan [Faz 2](docs/PHASE-2.md), zorunlu adım kaydı
[çalışma günlüğü](docs/worklogs/PHASE-2.md) içindedir. Her anlamlı işlemden sonra
komut/sonuç/karar ve başarısız denemeyi günlüğe ekle. Önceki Git push tercihi sürer;
Faz 2 uygulama PR'ları review ve required CI üzerinden ilerler. Faz 3–6 kapsam dışıdır.

## Kaynakların önceliği

1. Kullanıcının açık kararları ve onaylı değişiklikleri.
2. [PRD v1.1](docs/PRD.md): kesinleşmiş ürün kararları, FR/AC ve kapsam sınırı.
3. [Architecture](docs/ARCHITECTURE.md), [Workflow Contract](docs/WORKFLOW_CONTRACT.md), [Data Model](docs/DATA_MODEL.md), [API Contract](docs/API_CONTRACT.md): teknik sözleşmeler. Çelişkiyi sessizce çözme; [karar kaydına](docs/DECISIONS.md) ekle ve yalnızca bağımlı işi beklet.
4. [ROADMAP](ROADMAP.md), [TASKS](TASKS.md), [DEVELOPMENT](docs/DEVELOPMENT.md): güncel çalışma planı ve süreç; [STATUS](STATUS.md): ilerleme kanıtı.
5. [Backlog](docs/BACKLOG.md), [orijinal Faz 1 iş emri](docs/CODEX_PHASE_1.md), [paket README](docs/PLANNING_README.md): korunan kaynak planlar. WB kimlikleri ve teknik kabul koşulları geçerlidir; alt görev sırası TASKS'tadır.

`CODEX_PHASE_1.md` içindeki “tek gerçek kaynak”, “boş repo ile başla” ve gömülü başlangıç prompt'u mevcut depoyu silme veya şimdi uygulamaya başlama talimatı değildir. Bu dokümanlardaki öneriler kullanıcı onayı verilmiş ürün kararları sayılmaz. Yeni yönetim belgeleri ürün gereksinimlerini değiştiremez.

## Çalışma döngüsü

- Önce bu dosyayı, STATUS, ilgili görev kartını ve kaynak sözleşmeleri oku; çalışma ağacı/Git durumunu kontrol et. Kullanıcı değişikliklerini koru.
- Tek küçük görev seç; bağımlılıkları, karar blokörlerini ve onay kapsamını kontrol et. Kısa planı ve belirsizlikleri bildir.
- [Git kurallarına](docs/DEVELOPMENT.md) göre görev dalında çalış. SOLID, DRY, YAGNI; mevcut ihtiyaca uygun en küçük modüler çözüm.
- Görevin pozitif, negatif ve sınır senaryolarını uygun seviyede gerçekten doğrula. Test/CI/deploy çalışmadıysa bunu açıkça yaz; başarı varsayma.
- Diff'i incele, TASKS ve STATUS'u gerçek kanıtlarla güncelle. İlgili sözleşme değişikliğine onay olmadan karar verme.
- Sonuçta dosyaları, kabul kriterlerini, komut/sonuçları, kalan riskleri ve sonraki görevi belirt. Kapsam/faz dışı işe geçme.

## Mimari ve maliyet kuralları

- `workflow-contract`: ortak şema ve tipler; React, D1, LLM bağımlılığı yok.
- `workflow-core`: saf validator/patch/simulator; UI, network, DB ve sağlayıcı SDK bağımlılığı yok. Saf fonksiyonların saat/rastgelelik gibi girdileri gerektiğinde dışarıdan verilir.
- `apps/web` ve `apps/worker` yalnızca paketlerin public arayüzlerini kullanır; birbirlerinin iç uygulamasını import etmez. Worker sınırında tekrar doğrulama yapılır.
- Tek Worker deployment + statik asset hedefini koru. Microservice, ayrı UI paketi veya yeni altyapıyı varsayılan ekleme.
- Faz 1 yalnızca temel iskelet, health, şema, validator ve kalite/dokümantasyon altyapısıdır. Canvas, simulator, auth, D1, Durable Object ve AI uygulaması sonraki fazlardadır.
- 5 USD toplam bütçe/4,50 USD stop, atomik rezervasyon, fail-closed ve idempotency gereksinimlerini koru. Testlerde mock kullan; canlı model çağrısı varsayılan değildir.
- Gerçek secret/üretim verisi isteme, commitleme veya loglama. Sadece yer tutucu env örnekleri. Ham prompt, token, şifre ve kişisel workflow içeriği loglanmaz.
- Platform limitleri, fiyatlar ve model uygunluğu ileride ilgili görevde resmi kaynaklarla doğrulanır; planlama belgesindeki bilgi doğrulanmış canlı ortam kanıtı sayılmaz.

## Bitirme kuralı

Kullanıcı talimatı (27 Ekim 2026): Limit yaklaşınca yeni işe başlama; güvenli durma
payı bırak. Son işlem olarak `docs/worklogs/PHASE-2.md` içine dal/commit, tamamlanan
işler, test sonuçları, kalan sorunlar ve bir sonraki somut komutu kaydet. Hesap
kotasının kalan miktarı görünmüyorsa kesin bir kalan token sayısı varsayma.

Görev, ilgili kabul koşulları ve kalite kapıları kanıtlandığında tamamlanabilir. Uygulanmayan kapı için gerekçeli `N/A`, çalıştırılamayan kapı için `NOT RUN` yaz. Uygulama görevi gerekli bir test eksikken Done olmaz. Dokümantasyon işi için olmayan uygulama testlerini veya cloud deployment'ı ön koşul üretme. Review/merge kuralları [DEVELOPMENT](docs/DEVELOPMENT.md) içinde tanımlıdır.
