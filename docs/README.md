# Dokümantasyon indeksi

Mevcut sekiz planlama dosyası bu dizine içerikleri değiştirilmeden taşındı. Eski README, `PLANNING_README.md` adıyla korunur. PRD v1.1 kesinleşmiş kararların kaynağıdır; öneri ve açık kararlar kesinleşmiş sayılmaz.

| Sıra | Belge                                        | Rol                                         |
| ---- | -------------------------------------------- | ------------------------------------------- |
| 1    | [PRD.md](PRD.md)                             | Ürün, FR/AC, kesin ve ertelenen kararlar    |
| 2    | [ARCHITECTURE.md](ARCHITECTURE.md)           | Modül sınırları ve ADR-001–011              |
| 3    | [WORKFLOW_CONTRACT.md](WORKFLOW_CONTRACT.md) | Graph, input, validation, simulation, patch |
| 4    | [DATA_MODEL.md](DATA_MODEL.md)               | D1 revisions ve DO bütçe otoritesi          |
| 5    | [API_CONTRACT.md](API_CONTRACT.md)           | HTTP/auth/AI sözleşmeleri                   |
| 6    | [BACKLOG.md](BACKLOG.md)                     | Korunan WB-001–027 üst görevleri            |
| 7    | [CODEX_PHASE_1.md](CODEX_PHASE_1.md)         | Orijinal Faz 1 teknik kabul koşulları       |
| 8    | [PLANNING_README.md](PLANNING_README.md)     | Orijinal paket özeti ve dış referanslar     |

Güncel faz planı [ROADMAP](../ROADMAP.md), uygulanabilir alt görevler [TASKS](../TASKS.md), durum [STATUS](../STATUS.md), agent sınırları [AGENTS](../AGENTS.md) dosyalarındadır. Git/PR süreci [DEVELOPMENT](DEVELOPMENT.md), çözümlenmemiş kararlar [DECISIONS](DECISIONS.md) içinde tutulur.

Kaynak belgelerin gelecekte yapılacak kodlamayı tarif etmesi uygulama onayı değildir. Orijinal `CODEX_PHASE_1` kaynak önceliği ve repo başlangıcı ifadelerinin güncel yorumu AGENTS'ta tanımlıdır. Teknik kabul koşulları azaltılmamıştır.

ADR-001–011 mevcut Architecture tablosunda kalır; kopya karar kaynağı oluşturulmaz. [ADR-012](adr/ADR-012-workspace-toolchain.md) WB-001A workspace/araç zinciri kararını, [WB-001A doğrulaması](verification/WB-001A.md) gerçek kontrol sonuçlarını kaydeder. Yeni ADR'ler 013'ten devam eder; gerekçe, alternatif, sonuç, durum ve onay bilgisi içerir. Ürün değişikliğinde ayrıca ürün sahibi onayı gerekir. Boş OpenAPI/fixture dizinleri oluşturulmaz.
