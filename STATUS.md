# Proje durumu

**Son güncelleme:** 22 Ekim 2026 (Europe/Istanbul).

## Gerçek ilerleme

| Alan | Durum | Kanıt / kalan iş |
|---|---|---|
| İlk inceleme | Tamamlandı | C:\proje-v1 altında sekiz Markdown dosyası; başlangıçta .git, kod veya paket altyapısı yoktu |
| Yerel Git | Tamamlandı | `main` başlangıç commit'i `6700239`; çalışma dalı `docs/WB-PM-project-foundation` |
| WB-PM yönetim temeli | Review | AGENTS/ROADMAP/TASKS/STATUS, docs indeksi, kararlar, Git süreci ve PR şablonu hazır; kullanıcı incelemesi bekliyor |
| Kaynak planlar | Korundu | Sekiz dosya docs altına taşındı; eski README = PLANNING_README; PRD v1.1 içerik değişikliği yok |
| GitHub | Bağlantı bekliyor | Kullanıcı hedefi `OguzSoykan/proje-v1`; private varsayıldı. CLI/credential oturumu bulunamadı; GitHub bağlantısı istendi. Remote depo/push/PR henüz oluşturulmadı |
| Faz 1 WB-001–004 | Başlamadı | 12 alt kart Backlog; kullanıcı uygulama onayı yok |
| Faz 2–6 | Başlamadı | ROADMAP ve korunan backlog'da planlandı |
| Uygulama / CI / deploy | Yok | Kod, package.json, lockfile, test runner, workflow, cloud kaynağı veya ücretli API çağrısı oluşturulmadı |

## Doğrulama kaydı

Bu teslim dokümantasyondur. Uygulama typecheck/lint/unit/integration/E2E/build ve hosted CI testleri **NOT RUN — henüz uygulama/altyapı yok**; başarılı oldukları iddia edilmez. Dokümantasyon doğrulaması kaynak içerik karşılaştırması, yerel Markdown bağlantıları, görev/karar eşlemesi, Git diff ve dosya envanterinden oluşur; nihai sonuç aşağıdaki teslim kaydına eklenir.

GitHub branch protection, reviewer kuralı, remote ve PR henüz etkin değildir. `.github/PULL_REQUEST_TEMPLATE.md` bir workflow veya enforcement değildir.

## Sıradaki iş ve onay sınırı

Önerilen ilk uygulama kartı **WB-001A — Workspace, sürümler ve modül sınırları**. Node/package manager seçimi, tek lockfile, strict TS ve public package sınırları hazırlanır; ürün özelliği geliştirilmez. Önce kullanıcı uygulama kapsamını onaylamalıdır. Sonraki kartlar yalnızca açıkça verilen görev/faz onayı kapsamındaysa yürütülür; tekrar onay gereksiz yere istenmez.

GitHub hesabını bağlamak yalnızca depo oluşturma/push/PR işinin bağımlılığıdır; uygulama onayı değildir. Dokümantasyon yerelde tamamlanabilir. Görev açıklamalarındaki eski başlangıç prompt'u yürütülmez.

## Öncelikli riskler

- D-01/02/04/15: Şema/hash/input ayrıntıları WB-002 öncesi netleşmeli.
- D-03: Eksik taslak saklama ile tam graph validation gereksinimi ayrıştırılmalı.
- D-05/06: Email verification, üye kotaları, Turnstile kapsamı ve yerel→bulut taşıma politikaları henüz onaylı değil.
- D-07/12/13: Eşik eşitliği, bütün ortamlarda toplam bütçe, model/Free uyumluluğu ve canlı eval maliyeti doğrulanmalı.
- D-09/10/11/14: Silme/revocation, D1 atomik kayıt, API/patch isimleri ve P1 release kapsamı açık.

Detay ve bağımlı görevler [DECISIONS](docs/DECISIONS.md) içinde. Bu riskleri kaydetmek ürün kararlarını değiştirmez.

## Teslim kaydı

- `6700239`: Orijinal v1.1 planlama paketinin baseline commit'i.
- Dokümantasyon dalı: `docs/WB-PM-project-foundation`; içerik bu dalda incelemeye sunulur. Güncel commit için `git log -1`, baseline farkı için `git diff main...HEAD` kullanılır.
- Kaynak koruma: Sekiz dosyanın Git blob hash'i `6700239` başlangıcıyla birebir eşleşti; PRD dahil kaynak içerikleri değişmedi.
- Bağlantılar: 49 yerel Markdown bağlantısı kontrol edildi, kırık bağlantı yok.
- Görev/karar yapısı: 12 Faz 1 kartı ve 15 D-kararı doğrulandı; bilinmeyen karar referansı bulunmadı.
- Secret ön kontrolü: Yaygın GitHub/OpenAI token ve private-key imza taramasında eşleşme yok. Bu ön kontrol gelecekteki CI secret scanner yerine geçmez.
- Dosya envanteri: Yalnızca Markdown, Git ignore/attributes ve yerel Git geçmişi; uygulama özelliği veya bağımlılık eklenmedi.
- Diff incelemesi: `git diff --cached --check` geçer; Markdown'ın orijinal iki boşluklu satır sonları `.gitattributes` ile geçerli kabul edilir. Kaynak belgeleri sırf biçim için değiştirilmedi. İnsan review ve GitHub PR hâlâ bekleniyor.
