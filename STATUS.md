# Proje durumu

**Son güncelleme:** 22 Ekim 2026 (Europe/Istanbul).

## Gerçek ilerleme

| Alan | Durum | Kanıt / kalan iş |
|---|---|---|
| İlk inceleme | Tamamlandı | C:\proje-v1 altında sekiz Markdown dosyası; başlangıçta .git, kod veya paket altyapısı yoktu |
| Yerel Git | Tamamlandı | `main` ve `origin/main` başlangıçta `775b001`; çalışma dalı `feat/WB-001A-workspace` |
| WB-PM yönetim temeli | Main'de | Kullanıcı dokümantasyon commit'ini GitHub main'e gönderip devam talimatı verdi |
| Kaynak planlar | Korundu | Sekiz dosya docs altına taşındı; eski README = PLANNING_README; PRD v1.1 içerik değişikliği yok |
| GitHub | Doğrulandı | [OguzSoykan/Workflow-Builder](https://github.com/OguzSoykan/Workflow-Builder), public, default main; GitHub oturumu OguzSoykan, origin doğru; fetch başarılı |
| WB-001A | In Progress | Dört npm workspace, strict TS, sabit Node/npm, tek lockfile, ADR-012; temiz checkout kontrolü sırada |
| Diğer Faz 1 kartları | Backlog | WB-001B/C ve WB-002/003/004 alt işleri başlamadı |
| Faz 2–6 | Başlamadı | ROADMAP ve korunan backlog'da planlandı |
| Uygulama / CI / deploy | Henüz yok | Yalnızca dört boş module entry point ve araç zinciri; health UI/API, test runner, CI, cloud kaynağı veya ücretli API çağrısı yok |

## Doğrulama kaydı

WB-001A için dört workspace typecheck ve 12 pozitif/negatif compiler probe geçti. Public paketler çözülüyor; deep import ve core/contract ambient DOM/Node tipleri reddediliyor. Node 24.22.1/npm 11.19.1, SHA256 ile doğrulanmış resmi portable dağıtımdan kullanıldı; global Node 20.20.2/npm 10.8.2 kurulumu değiştirilmedi. Güncel kanıtlar [WB-001A kaydında](docs/verification/WB-001A.md).

Linter/formatter/runtime build/unit/integration/E2E ve hosted CI henüz yok; WB-001A için TASKS'taki **N/A** istisnası uygulanır. WB-001 üst işi veya Faz 1 tamamlandı sayılmaz. GitHub API kontrolünde main `protected=false`; required checks henüz kurulmadı. `.github/PULL_REQUEST_TEMPLATE.md` enforcement değildir.

## Sıradaki iş ve onay sınırı

Kullanıcının 22 Ekim 2026 “devam et” talimatı **WB-001A** için uygulama onayı olarak alındı. Bu kartın kontrolleri ve PR incelemesinden sonra önerilen görev **WB-001B — React/Worker health iskeleti**. Bu oturum WB-001A ile sınırlıdır; yeni açık talimat olmadan başka kart/faz başlatılmaz. Verilmiş onay tekrar istenmez.

Kullanıcının oluşturduğu gerçek depo `Workflow-Builder/public`, önceki `proje-v1/private` varsayımının yerini aldı. Yeni repo oluşturulmadı ve görünürlük değiştirilmedi. GitHub erişimi artık blokör değildir. Kaynak belgelerdeki eski başlangıç prompt'u ayrıca çalıştırılmaz; güncel görev kapsamı esas alınır.

## Öncelikli riskler

- D-01/02/04/15: Şema/hash/input ayrıntıları WB-002 öncesi netleşmeli.
- D-03: Eksik taslak saklama ile tam graph validation gereksinimi ayrıştırılmalı.
- D-05/06: Email verification, üye kotaları, Turnstile kapsamı ve yerel→bulut taşıma politikaları henüz onaylı değil.
- D-07/12/13: Eşik eşitliği, bütün ortamlarda toplam bütçe, model/Free uyumluluğu ve canlı eval maliyeti doğrulanmalı.
- D-09/10/11/14: Silme/revocation, D1 atomik kayıt, API/patch isimleri ve P1 release kapsamı açık.

Detay ve bağımlı görevler [DECISIONS](docs/DECISIONS.md) içinde. Bu riskleri kaydetmek ürün kararlarını değiştirmez.

## Teslim kaydı

- `6700239`: Orijinal v1.1 planlama paketinin baseline commit'i.
- `775b001`: Dokümantasyon temeli, kullanıcı tarafından GitHub main'e taşındı. Bu commit'teki tarihsel kontroller aşağıdadır.
- Kaynak koruma: Sekiz dosyanın Git blob hash'i `6700239` başlangıcıyla birebir eşleşti; PRD dahil kaynak içerikleri değişmedi.
- Bağlantılar: 49 yerel Markdown bağlantısı kontrol edildi, kırık bağlantı yok.
- Görev/karar yapısı: 12 Faz 1 kartı ve 15 D-kararı doğrulandı; bilinmeyen karar referansı bulunmadı.
- Secret ön kontrolü: Yaygın GitHub/OpenAI token ve private-key imza taramasında eşleşme yok. Bu ön kontrol gelecekteki CI secret scanner yerine geçmez.
- Dosya envanteri: Yalnızca Markdown, Git ignore/attributes ve yerel Git geçmişi; uygulama özelliği veya bağımlılık eklenmedi.
- Dokümantasyon diff incelemesi: `git diff --cached --check` geçti; Markdown'ın orijinal iki boşluklu satır sonları `.gitattributes` ile geçerli kabul edilir. Kaynak belgeleri sırf biçim için değiştirilmedi.
- WB-001A dalı: `feat/WB-001A-workspace`; [ADR-012](docs/adr/ADR-012-workspace-toolchain.md), [doğrulama](docs/verification/WB-001A.md). PR/push kanıtı tamamlandığında eklenecek; insan review bekliyor.
