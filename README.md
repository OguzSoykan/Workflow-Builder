# AI Workflow Builder

Türkçe/İngilizce, görsel veya doğal dil ile workflow tasarlama ve manuel onay/ret ile simülasyon ürünü. Ürün gereksinimlerinin kaynağı [PRD v1.1](docs/PRD.md).

**22 Ekim 2026 durumu:** Yönetim belgeleri GitHub `main` dalında. WB-001A için dört paketli npm workspace ve strict TypeScript temeli hazır; doğrulama ve inceleme kaydı [STATUS](STATUS.md) içinde. Henüz çalıştırılabilir UI/API, test runner veya deployment yok.

**GitHub:** [OguzSoykan/Workflow-Builder](https://github.com/OguzSoykan/Workflow-Builder) — public; `origin` bu depoya bağlı. `main` dal koruması son kontrolde kapalı.

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
├── .git/                         # origin: OguzSoykan/Workflow-Builder
├── .gitattributes
├── .gitignore
├── .npmrc
├── .nvmrc
├── .github/PULL_REQUEST_TEMPLATE.md
├── package.json
├── package-lock.json             # Tek kök lockfile
├── tsconfig.base.json
├── apps/
│   ├── web/                      # package.json, tsconfig.json, src/index.ts
│   └── worker/                   # package.json, tsconfig.json, src/index.ts
├── packages/
│   ├── workflow-contract/        # Şema için boş public entry point
│   └── workflow-core/            # Saf core için boş public entry point
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
    ├── DECISIONS.md
    ├── adr/ADR-012-workspace-toolchain.md
    └── verification/WB-001A.md
```

Dört workspace oluşturuldu; `src/index.ts` dosyaları yalnızca boş modül girişleridir. `infra` ve `packages/ui` oluşturulmadı; gereksinim ortaya çıkınca ilgili görevde değerlendirilir.

## Sabit sınırlar

- Dört node: Start, Approval, Condition, End; gerçek iş süreçlerini çalıştırma yok.
- Anonim yerel kayıt ve JSON import/export; üyeye owner-private Cloudflare D1 kayıt.
- Firebase Auth Spark e-posta/şifre; Worker veya D1 üzerinde parola saklama yok.
- AI create/edit yalnızca önizleme, diff ve açık onayla uygulanır; stable ID ve stale hash/revision denetimi gerekir.
- Cloudflare Free hedefi, tek Worker + statik React asset; gereksiz servis yok.
- OpenAI bütçesi tek seferlik toplam **5 USD**; rezervasyonlar dahil uygulama kapatma eşiği **4,50 USD**. Otomatik aylık yenileme veya pahalı model fallback yok.

## Başlangıç

Node **24.22.1**, npm **11.19.1** ve TypeScript **6.0.3** sabittir. [Node resmi dağıtımını](https://nodejs.org/en/blog/release/v24.22.1/) veya mevcut sürüm yöneticinizi kullanın. `.nvmrc` sürüm bilgisidir; Node'u otomatik kurmaz. `node --version` ve `npm --version` değerlerini kontrol edin; farklı sürümde `npm ci` bilinçli olarak reddedilir.

```sh
git clone https://github.com/OguzSoykan/Workflow-Builder.git
cd Workflow-Builder
git switch feat/WB-001A-workspace
npm ci
npm run typecheck
npm ls --workspaces --depth=0
```

Dal incelemede olduğu sürece `git switch` gerekir; merge sonrası `main` kullanılabilir. Tek paket kontrolü: `npm run typecheck --workspace=@workflow-builder/workflow-core`. Kurulum kökten yapılır; alt paketlerde ayrı lockfile oluşturulmaz. `node_modules` Git'e eklenmez.

Bu bilgisayardaki global Node 20 kurulumu değiştirilmeden test edildi. Kullanılan portable araçları mevcut PowerShell oturumunda seçmek için:

```powershell
$workflowNode = Join-Path $env:LOCALAPPDATA 'WorkflowBuilder\tools\node-v24.22.1-win-x64'
$env:PATH = "$workflowNode;$env:PATH"
node --version
npm --version
npm ci
npm run typecheck
```

Bu yerel klasör repository'nin parçası değildir; başka bilgisayarda önce resmi Node kurulumu gerekir. `dev`, `build`, `lint`, `format:check` ve `test` komutları henüz yok; health/lint WB-001B, test runner WB-001C, CI WB-004A kapsamında eklenir.

Paket seçimleri ve sınırlar [ADR-012](docs/adr/ADR-012-workspace-toolchain.md), gerçek doğrulamalar [WB-001A kaydı](docs/verification/WB-001A.md) içinde. Sonraki önerilen kart **WB-001B — React/Worker health iskeleti**.
