# Codex Phase 1 — Uygulama İş Emri (Kod değil; Codex'e verilecek görev şartnamesi)

**Bu doküman, ilk geliştirme fazının tek gerçek kaynağıdır.** Planlama ekibi henüz kod yazmamıştır. Codex, sıfırdan boş repo ile başlayacaktır. Önce ilgili tüm belgeleri okuyup Phase 1 scope ile sınırlanır.

## 0. Codex çalışma sözleşmesi

- Roller: Kullanıcı = Product Owner / karar verici; ChatGPT = analyst/architect; Codex = implementer/tester.
- Her işte sırası: oku → kısa implementation plan + belirsizlik bildir → tek görev → test → diff review → doküman güncelle → sonuç raporla.
- User onayı olmadan mimari değiştirme, pahalı servis açma, başka fazın kodunu yazma, production deploy yapma.
- Sır, gerçek OpenAI key, Firebase service key, gerçek veri, prod D1 bilgisi talep etme veya hardcode etme. Test için fake/mock kullan.
- `main` korumalı; her görev ayrı `feat/WB-00X-kisa-adi` branch; uygun küçük commitler.
- Bir tek görev bağımsız doğrulanamıyorsa BLOCKED olarak raporla; “test edildi” uydurma.
- DRY, KISS, SOLID, YAGNI; erken microservice abstractions yok.
- Faz 1 tamamlanmadan Faz 2'ye geçme; plan/final raporu kullanıcıya göster.

## 1. Kullanılması gereken dokümanlar

`README.md`, `PRD.md`, `ARCHITECTURE.md`, `WORKFLOW_CONTRACT.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `BACKLOG.md`.

**Teknik hedef:** React + TypeScript + Vite, Cloudflare Workers + Hono, strict TS, Vitest + Playwright için altyapı, Wrangler config, shared workflow contract ve pure TS validator. Auth/AI/D1 henüz entegre edilmez; yalnızca yer tutucu config/soyutlama ihtiyacı varsa açık gerekçeyle.

## 2. WB-001 — Temiz repo & development foundation

**Amaç:** Tek repository içinde web, Worker ve core için okunabilir, çalışan ve test edilebilir iskelet.

**Görev tanımı:** Package/workspace stratejisi belirle (pnpm workspace veya npm workspaces; ek karmaşıklık yaratma); React/Vite+Hono/Worker entegrasyonuyla minimal health UI ve `/api/health` endpoint; strict TS, ESLint, Prettier, Wrangler local, örnek env, README local run.

**Kabul:**
- `typecheck`, `lint`, `format:check`, `test`, `build` yerel/CI başarıyla çalışır.
- Tek deployment yaklaşımı korunur; production secret yok.
- `/api/health` herhangi bir D1/OpenAI bağlantısı istemeden 200 döner; frontend aynı origin'e erişir.
- `README` kurulumu yeni geliştirici tekrarlayabilir.
- Modüller birbirinin internal implementasyonunu ithal etmez; core Cloudflare bağımsız.
- Frontend ve Worker tam build doğrulanmazsa görev kapanmaz.

**Teslim raporu:** Dosya ağacı, komut/çıktı özeti, alınan kararlar, test sonucu, bilinen eksikler.

## 3. WB-002 — Workflow Contract v1

**Amaç:** UI/API/AI/simulator için ortak tipli JSON graph sözleşmesi.

**Görev:** `WORKFLOW_CONTRACT.md` temel alınarak Zod schema/types; dört node türü, valid input field/operator/edge ve schemaVersion=1. Canonical `contentHash` mantığına uygun deterministik serializer veya ayrılmış contract tanımı. İş kuralları validator'a ayrılır.

**Kabul:**
- İyi örnek create/serialize/parse round-trip eşdeğerdir.
- `schemaVersion != 1`, hatalı node enum, hatalı input type/edge/duplicated ID reddedilir.
- 50-node/100-edge/30-fields ve boyut limitleri uygulanır veya validator için ayrılıp test edilir.
- Node ID ve edge ID graph etiket/position güncellemede değişmez.
- `README/ADR` contract versioning stratejisini açıklar.

**Teslim:** Sadece schema/types + fixtures + tests; React Flow UI kodlaması yok.

## 4. WB-003 — Pure graph validator

**Amaç:** AI çıktılarının, içe aktarılan JSON'un, simülasyon ve DB snapshot'larının tek doğrulayıcısı.

**Görev:** side-effect-free validator; mesaj string'i yerine machine-readable issue code; `startCount`, `reachable`, `allPathsTerminate`, `cycle`, `handleCardinality`, `danglingReferences`, `conditionType`, `maxLimits`.

**Kabul:**
- Doğru satın alma flow'u geçer.
- Test fixture: iki Start, sıfır End, kırık edge, yanlış handle, cycle, disconnected node, missing input, wrong operator, unmatched branch, max nodes geçme → her biri beklenen issue code ile başarısız.
- Validator yürütme sırası değişse bile sonuç deterministik ve tekrarlanabilirdir.
- Saf TS fonksiyonları dış servis/network çağırmaz; genel test kapsamı raporu vardır.

**Teslim:** Validator, test seti, hata kodu tablosu. Simulator/UI oluşturma yok.

## 5. WB-004 — CI, docs and quality gate

**Amaç:** Kod birleştirilmeden önce kalite sınırının otomatik kontrolü.

**Görev:** GitHub Actions ile lockfile install, typecheck, lint, formatting, unit, build; environment placeholders, secret scanner; temel OpenAPI 3.1 iskeleti (yalnızca planlanan rotaları dokümante eden specification) ve ADR kayıtları; staging/prod ayrımı dokümante, canlı prod deployment henüz yok.

**Kabul:**
- Kötü typecheck/test senaryosunda PR fail olur.
- Kaynak kod veya build artefact içerisinde API secret bulunmaz.
- Env dokümantasyonu local/staging/prod farklılıklarını belirtir.
- `CODEX_PHASE_1` kabul tablosu birlikte doğrulanır, sadece geçmiş olsa DONE sayılır.

## 6. Faz 1 exit gate / kullanıcı review

Codex kullanıcıya şu formatta faz sonu raporu sunmalı:

1. Tamamlanan WB issue ID'leri, branch/commit/PR bağlantıları (varsa).
2. Ortaya çıkan gerçek dosya/modül ağacı ve gerçek çalıştırma komutları.
3. Typecheck/lint/build/test çalıştırıldı mı, sonuçları ve negatif test özeti.
4. Mimari varsayımlardaki farklılıklar ve gerekçesi; güncellenen ADR'ler.
5. Bilinen riskler/blokörler, Cloudflare Free üzerinde henüz denenmemiş özellikler.
6. Faz 2 için önerilen sıradaki görev, fakat **Codex onay olmadan Faz 2'yi başlatmaz**.

## 7. Codex için başlangıç görev metni (metin, çalıştırılabilir kod değil)

> Bu repoda `docs/` altındaki PRD v1.1, Architecture, Workflow Contract, Data Model, API Contract ve Backlog belgelerini oku. Kodlamaya başlamadan önce sadece Faz 1 için kısa planını ve olası tutarsızlıkları bildir. `WB-001` ile başla: temiz repo, strict TypeScript, React + Vite, Cloudflare Worker + Hono, CI için uygun test/build iskeleti. İşi bir branch'te, küçük commitlerle tamamla. İlgili testleri gerçekten çalıştır, sonuçlarını raporla. `WB-002`, `WB-003`, `WB-004` için kullanıcı onayı olmadan kod yazma. Kod kalitesi ve YAGNI ilkelerine uy. Auth, D1, OpenAI entegrasyonu, AI özellikleri, simülatör, gerçek onay sistemleri ve prod deployment bu işin kapsamı dışındadır. Bütçe/servis ücretine yol açacak kaynak oluşturma işlemi yapma. Belgeyle çelişki görürsen uygulamak yerine sor.
