# V2 çalışma günlüğü

Takip edilen plan: [TECH_ROADMAP](TECH_ROADMAP.md) (v2.1). Her görev için: tarih, dal/PR/commit, yapılanlar,
gerçek komutlar ve sonuçları, sapmalar, kalan riskler ve sonraki görev. Görev durumları roadmap'te işaretlenir.

## WB2-001

**Repo ve V1 baseline denetimi** · 1 Kasım 2026 · Durum: **DONE** · Dal: `wb2/001-baseline` · [PR #43](https://github.com/OguzSoykan/Workflow-Builder/pull/43) · Taban: `7bfeaee`

- **Plan:** Kod değişikliği yok; V1'i ölç ve `docs/v2/BASELINE.md`'ye işle. Maliyet yok; production'a yalnız salt
  okunur smoke, AI çağrısı yok.
- **Komutlar ve sonuçlar:** typecheck/lint PASS; format:check PASS (yalnız commit'lenmemiş roadmap dosyaları
  uyarı verdi); `npm test` 496 Vitest + 5 security + 3 docs PASS; coverage satır %98,52 / dal %93,16; negatif
  kapılar PASS; build (3 ortam dry-run) PASS; `secret:scan` 0 bulgu; Gitleaks “no leaks found”; E2E **55/55**;
  `npm audit` 11 moderate (yalnız dev, `--omit=dev` 0).
- **CI / smoke:** `main`'de son 7 `Quality` koşusu success (son
  [41259059818](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/41259059818)); bağımsız GitHub `Smoke`
  staging [41261959419](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/41261959419) success; yerel smoke
  staging 6/6, production (salt okunur) 6/6.
- **Envanter:** 13 uygulanan API ucu, OpenAPI'de 16 işlem (3 sapma), paket sınırları temiz, ortam/secret adları,
  AI değerlendirmesi 19/20 (≈0,0104 USD, yeniden çalıştırılmadı).
- **Bulunan açıklar (BASELINE §7):** paylaşılan Firebase projesi (P0); CI'da `test:security`/`test:docs`/
  `test:negative-gates` yok; SPA için CSP yok; rate limiting yok; OpenAPI ↔ kod sapması; GitHub deploy ortamları
  yok; coverage eşiği yok; dev bağımlılıklarında 11 moderate; STATUS eski; E2E sayısı 54 → 55.
- **Belge güncellemeleri:** `docs/v2/BASELINE.md`, `docs/v2/TECH_ROADMAP.md` (v2.1'in repo kopyası, WB2-001
  işaretlendi), bu günlük, `STATUS.md`, `PROJECT_OVERVIEW.md` (E2E 55).
- **Sapma:** Roadmap “CI logları ve local run çıktısı” istiyor; yerel log çıktıları repoya eklenmedi (geçici,
  makineye özgü), özetleri ve yeniden üretme komutları BASELINE §8'de.
- **Sonraki görev:** WB2-002 — Ortam izolasyonu (Firebase ayrımı kullanıcı onayı ve Cloud Shell adımları ister).
