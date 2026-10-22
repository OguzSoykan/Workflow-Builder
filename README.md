# AI Workflow Builder

Türkçe/İngilizce, görsel veya doğal dil ile workflow tasarlama ve manuel onay/ret ile simülasyon ürünü. Ürün gereksinimlerinin kaynağı [PRD v1.1](docs/PRD.md).

**22 Ekim 2026 durumu:** Yerel Git deposu ve geliştirme yönetimi dokümantasyonu hazır. Uygulama kodu, paket kurulumu, test altyapısı veya deployment henüz yok. İlk uygulama görevi kullanıcı onayı bekliyor.

## Okuma sırası

1. [AGENTS.md](AGENTS.md): çalışma sınırları ve kaynak önceliği.
2. [docs/README.md](docs/README.md): mevcut planlama belgeleri ve okuma sırası.
3. [ROADMAP.md](ROADMAP.md): fazlar ve çıkış kapıları.
4. [TASKS.md](TASKS.md): Faz 1'in küçük görevleri, kabul kriterleri ve bağımlılıkları.
5. [STATUS.md](STATUS.md): gerçek ilerleme, doğrulama ve sıradaki iş.
6. [Açık kararlar](docs/DECISIONS.md) ve [Git/inceleme kuralları](docs/DEVELOPMENT.md).

## Mevcut yapı

```text
proje-v1/
├── .git/                         # Yerel geçmiş; remote yok
├── .gitattributes
├── .gitignore
├── .github/PULL_REQUEST_TEMPLATE.md
├── AGENTS.md
├── README.md
├── ROADMAP.md
├── TASKS.md
├── STATUS.md
└── docs/
    ├── README.md
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── WORKFLOW_CONTRACT.md
    ├── DATA_MODEL.md
    ├── API_CONTRACT.md
    ├── BACKLOG.md
    ├── CODEX_PHASE_1.md
    ├── PLANNING_README.md       # Orijinal paket giriş belgesi
    ├── DEVELOPMENT.md
    └── DECISIONS.md
```

`apps/web`, `apps/worker`, `packages/workflow-contract`, `packages/workflow-core` ve `infra` yalnızca planlanan modüllerdir; bu teslimde oluşturulmadı. `packages/ui` ancak gerçek tekrar ortaya çıkarsa değerlendirilir.

## Sabit sınırlar

- Dört node: Start, Approval, Condition, End; gerçek iş süreçlerini çalıştırma yok.
- Anonim yerel kayıt ve JSON import/export; üyeye owner-private Cloudflare D1 kayıt.
- Firebase Auth Spark e-posta/şifre; Worker veya D1 üzerinde parola saklama yok.
- AI create/edit yalnızca önizleme, diff ve açık onayla uygulanır; stable ID ve stale hash/revision denetimi gerekir.
- Cloudflare Free hedefi, tek Worker + statik React asset; gereksiz servis yok.
- OpenAI bütçesi tek seferlik toplam **5 USD**; rezervasyonlar dahil uygulama kapatma eşiği **4,50 USD**. Otomatik aylık yenileme veya pahalı model fallback yok.

## Başlangıç

Henüz çalıştırılabilir uygulama veya kurulum komutu yok. İlk önerilen uygulama görevi **WB-001A — Workspace ve modül sınırları**. Uygulama, [STATUS.md](STATUS.md) içindeki onay sınırı kaldırıldıktan sonra başlar. Kullanıcının GitHub hedefi `OguzSoykan/proje-v1`; görünürlük belirtilmediği için private planlandı. GitHub hesap bağlantısı bekleniyor; remote, PR veya branch protection henüz oluşturulmuş değildir.
