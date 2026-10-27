# Faz 3 çalışma günlüğü

## P3-001 — Faz 3 başlangıcı (2026-10-28)

- PR #17 (Zod 4.6.7 + mobil düzeltmeler) kullanıcı tarafından birleştirildi: main `2aba92d`. Kullanıcı “tamam sonraki aşamaya geç” dedi; Faz 3 onayı AGENTS'a kaydedildi. Agent merge izni Faz 2 ile sınırlı kaldı (PR #17 merge denemesi izin sistemi tarafından reddedilmişti).
- D-14 soruları soruldu. Kullanıcı eşiğin dinamik olması gerektiğini belirtti: simülatör koşulu akıştan okur; yalnız örnek/AC-03 varsayılanı `tutar > 10000`. Eksik girişte “başlamadan iste”, WB-011 Faz 3'te P0. DECISIONS'a kaydedildi.
- `feat/WB-009-simulator` güncel main'den açıldı. Plan: `workflow-core` içinde saf `startSimulation`/`decideApproval`; dışarıdan `runId`, saat yok; girdi normalizasyonu (default, zorunlu/koşulda kullanılan alan, tür ve sınır kontrolü); Contract §5 run/step alanları; değişmiş akışta karar reddi; parametrik ve determinizm testleri; 50 node benchmark.

## P3-002 — WB-009 saf simülatör (2026-10-28)

- `packages/workflow-core/src/simulator.ts`: `startSimulation`, `decideApproval`, `normalizeInputs`, `evaluateCondition`; public export. İlk sürümde adım nesnesini yerinde değiştiren yardımcı vardı; anlaşılırlık için handle + adım ayrıntısı döndüren `automatic` geçişine çevrildi. Sıralı operatörlerde birleşik tip `TS2365` verdi; aynı türdeki sayı/ISO tarihi karşılaştıran `compareValues` eklendi.
- 31 yeni unit test: AC-03 (5000 → Yanlış → tamamlandı, 15000 → onay bekler), onay/ret dalları, determinizm (aynı girdi+karar = aynı JSON), konum değişince kararın sürmesi, iş mantığı değişince `WORKFLOW_CHANGED`, biten run'da `NOT_WAITING`, geçersiz akış, D-14 girdi kuralları, 22 operatör vakası.
- `npm run benchmark:simulator` eklendi: M1 Pro/Node 24.22.1, 50 node + 48 karar median 57,3 ms, p95 59,8 ms, max 65,4 ms.
- Kapılar: typecheck/lint PASS; format ilk koşuda `docs/PHASE-3.md` biçimi nedeniyle FAIL, prettier sonrası PASS. 323 Vitest + 2 + 3, coverage satır %99,55 (simulator %100 satır), negatif kapılar, build, secret:scan, Gitleaks, 29/29 E2E PASS; audit 0. Karar ADR-017.
- Faz 3 PR'larını kullanıcı birleştirir. Sonraki: WB-010 simülasyon UX.
