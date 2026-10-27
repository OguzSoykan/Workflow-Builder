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

## P3-003 — WB-009 merge ve WB-010 başlangıcı (2026-10-28)

- [PR #18](https://github.com/OguzSoykan/Workflow-Builder/pull/18) [quality 40584063197](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40584063197) PASS; kullanıcı “mergeleyip devam” talimatıyla agent squash merge etti: main `1f148c1`. WB-009 Done.
- `feat/WB-010-simulation-ux` açıldı. Plan: web'de saf görünüm yardımcıları (form → tipli girdi, Türkçe adım/girdi hata metni, izlenen düğüm/bağlantı kümesi) ve `SimulationPanel`; “yalnız simülasyon” etiketi; onay/ret düğmeleri; tuvalde mevcut/izlenen adım ve bağlantı vurgusu; akış hash'i değişince run eski sayılır ve karar düğmeleri kapanır. Run yalnız bellekte (FR-14 kapsam dışı).

## P3-004 — WB-010 uygulama ve doğrulama (2026-10-28)

- `simulation-view.ts` (form → girdi, girdi hata metni, Türkçe adım açıklaması, izlenen yol) ve `SimulationPanel`; Editor'da run durumu, içerik hash'iyle eski run tespiti, kart/bağlantı vurgusu (`sim-current`, `sim-visited`, `sim-edge`).
- İlk E2E denemesi başlamadı: 8787'de kullanıcıya ait (Node v22) `wrangler dev` çalışıyordu. Kullanıcıya soruldu; “Durdur, testleri çalıştır” cevabıyla süreç durduruldu, yeniden başlatılmadı. Sonra 2 yeni senaryo PASS: AC-03/04 (5000 → tamamlandı; 15000 → onay bekler, onay/ret, vurgu sayıları, temizle) ve eksik/sınır dışı girdi, rol değişince eski run, adım silinince doğrulama uyarısı.
- Testteki FormData tuple dizisi typecheck'te `TS2769` verdi; açık tiple düzeltildi. Kapılar: typecheck/lint/format PASS; 327 Vitest (4 yeni) + 2 + 3 PASS; coverage satır %99,57; build, secret:scan, Gitleaks PASS; E2E 31/31 PASS. 390px ekran görüntüsü incelendi; durum satırına üst boşluk eklendi.

## P3-005 — WB-010 merge, WB-011 uygulama ve Faz 3 devir notu (2026-10-28)

- [PR #19](https://github.com/OguzSoykan/Workflow-Builder/pull/19) [quality 40587436184](https://github.com/OguzSoykan/Workflow-Builder/actions/runs/40587436184) PASS; kullanıcı “mergeleyip devam” dedi, agent squash merge etti: main `e7b18f9`. `feat/WB-011-examples` açıldı.
- `examples.ts` (satın alma/izin/masraf), `ExamplesPanel` (onaylı, geri alınabilir yükleme, yeni workflowId). 13 unit test: üç örnek geçerli, 9 simülasyon senaryosu, eksik girdi.
- İlk E2E'de izin ve masraf testleri zaman aşımına uğradı: `label` içine sarılı `select`'in erişilebilir adı seçenek metinlerini içeriyordu, “İzin türü …” adıyla bulunamadı. Simülasyon girdilerinde `select` etikete `htmlFor` ile bağlandı; 6/6 PASS.
- Kapılar: typecheck/lint/format, 340 Vitest + 2 + 3, coverage satır %99,58, negatif kapılar, build, secret:scan, Gitleaks PASS; E2E 35/35; yeni spec'ler `--repeat-each=5` 30/30.
- Sonraki: WB-011 PR'ı kullanıcı birleştirince Faz 3 tamamlanır. Faz 4 (WB-012–015) kullanıcı onayı ve D-05/D-06/D-09/D-10/D-12 kararları ister; ücretsiz Firebase/Cloudflare hesap kurulumu gerektirebilir.
