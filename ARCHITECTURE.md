# Architecture v1.1 — Cloudflare Free + Firebase Authentication + OpenAI

**Mimari stil:** Modular Monolith / tek Workers deployment + statik React asset. **Kod yok.**

## 1. Context / veri akışları

- **Browser:** React SPA, React Flow editor, Zustand geçici graph, locale, IndexedDB/localStorage yerel workflow ve simulator.
- **Cloudflare Worker (Hono):** API routing, JSON contract validation, Firebase ID token verify, D1 repository, AI adapter ve abuse kontrolleri.
- **Cloudflare D1:** user profile (Firebase UID), workflow ana kayıt/snapshot revision, AI metadata, audit/budget reporting.
- **Durable Object (SQLite):** Tek global `AI_BUDGET` actor; eşzamanlı AI çağrı rezervasyonları, 4,50 USD stop, kilitli maliyet toplamı, atomik one-time trial token tüketimi ve idempotency. Ücretsiz limitlerle uyum release öncesi test edilecek.
- **Firebase Authentication (Spark):** email/password, e-posta doğrulama, parola reset ve token üretimi. Kimlik sistemi dışında veri/hosting sağlamaz.
- **OpenAI Responses API:** Prompt → structured `workflow` veya `patch` önerir. İlgili graph'tan hiçbir gerçek iş süreci çalıştırmaz.
- **Turnstile:** anonim AI çağrısı öncesi ziyaretçi doğrulaması, token sunucu Siteverify ile kontrol edilir.

## 2. Repo/modül sınırları (tasarım, klasör örneği)

| Alan | Sorumluluk | Bağımlılık kuralları |
|---|---|---|
| `apps/web` | React canvas, AI diff, simulation UI, i18n | Backend DB'yi direkt bilmez |
| `apps/worker` | Hono routes, auth middleware, repositories, AI orchestration | Core'u kullanır; core Worker'a bağımlı değil |
| `packages/workflow-contract` | Zod schema, stable IDs, shared typed graph | React / D1 / LLM bağımsız |
| `packages/workflow-core` | Graph validation, patch application, deterministic simulator | Side-effect-free; fetch/DB yok |
| `packages/ui` (opsiyonel) | Yeniden kullanılabilir shadcn bileşenleri | Sadece gerçek tekrar çıktığında ayrılır |
| `infra` | Wrangler binding, D1 migrations, deployment env config | Secrets repo içerisine yazılmaz |
| `docs` | ADR, OpenAPI, test fixtures, product planning | Sürüm kontrollü |

**YAGNI:** `packages/ui` gibi soyutlamalar tek yerde kullanılıyorsa başlangıçta ayrı paket oluşturulmak zorunda değil. Tek repoda modular boundaries yeterli.

## 3. Authentication & authorization (kesin tasarım)

**Karar:** E-posta + şifre; Firebase Auth Spark, Cloudflare Workers token doğrular. Self-hosted parola hash'i veya D1 password tablosu yoktur.

1. Client Firebase SDK ile kayıt veya login yapar, verify-email/reset-password akışlarını Firebase üzerinden yürütür.
2. API'ye `Authorization: Bearer <Firebase-ID-token>` ile istek gider.
3. Worker **imza + `alg`, `kid`, `aud`, `iss`, `exp`, `iat`, `sub`, `auth_time`** doğrular; kaynak public keys güvenli cache politikası ile alınır. JWT sadece decode edilerek güvenilir kabul edilmez.
4. Worker `email_verified` statüsünü yetki kararlarında değerlendirir (bulut save ve üye AI hakkı için gerekli önerilen politika).
5. D1 `users.firebase_uid` ile workflow sahibini eşler; frontend'in gönderdiği owner ID asla yetki kaynağı sayılmaz.
6. Token revocation, hesap kapatma ve profile deletion akışlarında kısa token ömrü ve gerekirse ek doğrulama gerekir; MVP kapsamı/güvenlik kontrol listesine eklenir.

**Trade-off:** Ücretsiz plan/kimlik e-postaları Firebase'e bağımlı; ancak Workers Free 10ms CPU limiti ve kendi şifre altyapısının risklerine göre uygun. Firebase Auth 3.000 DAU Spark limiti demo için yeterli; ücretsiz email gönderim kotaları aşılırsa reset/verification geçici olarak başarısız olabilir.

## 4. OpenAI güvenli yürütme ve maliyet

**Model:** Başlangıç `gpt-6-luna` (yayın tarihinde kullanılabilirliği ve Structured Outputs uygunluğu Codex spike testiyle teyit edilecek); bütçe dostu model/versiyon env ile sabitlenebilir. Daha yüksek maliyetli modele otomatik fallback **yok**.

**Girdi adımları:**
1. Content-Length/gövde/prompt/graph limit kontrolü; kimliği saptama (valid bearer veya anonim).
2. Anonim için imzalı ziyaretçi oturum cookie'si + Turnstile Siteverify + kaba IP temelli abuse rate limit. Cookie silme ve VPN ile farklı deneme yapılabileceği bilinir.
3. Merkezi Durable Object en fazla 1 anonim hakkı / anonim oturum; kayıtlı için varsayılan 3 istek/UTC gün (ürün sahibi onayına tabi).
4. Aynı DO `total_committed_cost + total_reserved_max_cost` hesabını kontrol eder; **4,50 USD üzeri yeni rezervasyona izin vermez**. Tahmin, seçili modelin fiyatıyla giriş üst sınırı + çıktı token üst sınırının konservatif maliyetini kapsar.
5. Rezervasyon ve tek kullanım idempotency key'ine bağlanır; downstream başarısızlığında hata tipine göre geri ödeme/rezervasyon sonlandırma, sonsuz pending için süre sonu uzlaştırma. Belirsiz provider başarısızlığında fail-closed muhasebe kullanılır.
6. OpenAI `Responses API` + Structured Outputs; parse → Zod → graph validator → patch preview. Tek istekte en fazla belirtilen token; otomatik pahalı retry yok.
7. Model token kullanımından gerçekleşen maliyet raporlanır ve reserved farkı serbest bırakılır. İstek başına metrikler kaydedilir; gerçek prompt veya credentials loglanmaz.
8. `AI_ENABLED=false` veya global limitte bütün AI yolları kapalı olur; kullanıcılar manuel edit/simülasyon kullanmaya devam eder.

**Bütçe gerçekliği:** 5 USD uygulama tahsisidir, OpenAI hesabı genelinde ödeme/özel model değişikliklerinin sıfır riskle sınırlandığı garantisi değildir. OpenAI proje/organizasyon düzeyinde uygun hard spend limit seçeneği hesapta varsa etkinleştir, bildirime dayalı soft bütçeyi hard cap sanma. Bütçe limiti ayrı projeye/API key'e uygulanmalı.

## 5. Persistence & consistency

- **Anonim:** Lokal graph ve history. Üye olana kadar D1 workflow kaydı yoktur.
- **Üye:** D1 immutable revision snapshots; `workflows.current_revision_number` + `(workflow_id, revision_number)` unique.
- Client edit üzerinde local `contentHash`; AI patch'in `baseHash`ı onay öncesi eşleşmek zorunda.
- Cloud update `expectedRevision` ile koşullu; güncel değilse `409 REVISION_CONFLICT`.
- Atomik kaydetme işleminin D1 transaction/batch imkânıyla nasıl sağlanacağı WB-020 inceleme görevidir; unique key + conditional update + rollback/tekrar senaryoları test edilmeden release yok.
- Soft delete tasarlanır; ilişkili revision'lar saklama politikasına göre temizlenir.
- Lokal → cloud kopyalama kullanıcıdan açık onay ister; başarılı D1 kaydı sonrası yerel kopyayı zorla silmez.

## 6. Güvenlik ve gizlilik

- Sadece birinci parti same-origin API; auth bearer token; request Origin/CORS kontrolü; CSP ve XSS önlemleri.
- Turnstile `Siteverify` **server-side**, hostname/action kontrolü ve tek kullanımlık 5 dakika token.
- Firebase UID backend imza doğrulamasından çıkarılır; email alanı auth token'ında varsa e-posta doğrulanmış mı kontrol edilir.
- Graph JSON ve input değerleri güvenilmeyen veri; object prototype poisoning, uzun string, çok sayıda node ve regex istismarı test edilir.
- Her D1 workflow sorgusunda `owner_uid` filtresi, 404 kaynak gizleme; IDOR negatif testleri.
- Client local saklama sır içermez; kullanıcı kişisel veri girebileceği için ürün gerçek müşteri veya şirket verisi yüklememesi konusunda uyarır.
- OpenAI secret Worker secret; ayrı dev/staging/prod projeleri veya anahtarları. Firebase public web config secret değildir; service account private key frontend'de yer almaz.
- Loglarda açık email, workflow detayları, prompt, bearer token, Turnstile response veya şifre bulunmaz. Metrikler minimize edilir.

## 7. Test / deployment / operasyon

- **Local:** Vite + Wrangler dev, mock Firebase JWT veya emulator, mock OpenAI; sahte kullanıcı/veri.
- **CI:** lockfile install, typecheck, lint, format check, unit, Worker+D1 integration, build, secret scan. Her PR'da.
- **Staging:** Ayrı Worker route ve ayrı D1 + ayrı Firebase projesi veya test kullanıcı konfigürasyonu; gerçek prod secret kullanılmaz; smoketest.
- **Production:** Başarılı CI sonrası manuel onay veya kontrollü main deploy; rollback prosedürü, D1 migration uygulanmadan yedek/export değerlendirmesi.
- **Observability:** requestId, endpoint, status, latency, Worker CPU usage, D1 quota, AI model/cost token toplamı. Ham içerik yok.
- **Performance:** Heavy graph evaluation client; Cloudflare Free Workers 10ms CPU limitine göre Worker'daki patch validation/request parse için küçük max graph; ölçümle izlenir.

## 8. Mimari karar kayıtları (ADR)

| ID | Karar | Alternatif / neden |
|---|---|---|
| ADR-001 | Modular monolith; single Cloudflare Worker | Microservices gereksiz |
| ADR-002 | React SPA, TypeScript, React Flow | Browser-first etkileşim |
| ADR-003 | Pure TS validator/simulator | Deterministik, Cloudflare CPU'dan kaçınır |
| ADR-004 | Graph snapshot revisions in D1 | Node başına normalizasyon MVP için karmaşık |
| ADR-005 | Tipli dar condition DSL | Arbitrary script çalıştırma güvenli değil |
| ADR-006 | Firebase Auth Spark for email/password | Workers Free CPU ve password/email lifecycle |
| ADR-007 | AI propose/preview/approve; AI never saves | Güvenlik ve kullanıcı kontrolü |
| ADR-008 | Edit with patch + stable IDs + stale check | Değişiklik etkisi izlenebilir |
| ADR-009 | Durable Object global cost ledger | Edge-local rate limiter tek başına global hard stop değildir |
| ADR-010 | 4.50 USD application-level stop inside 5 USD total | Rezervasyon payı ve bilinmeyen provider ücretlerine güvenlik marjı |
| ADR-011 | No production secrets in repo, separate environments | En az ayrıcalık |

## 9. Kaynaklar / doğrulama

- Workers Free limits: https://developers.cloudflare.com/workers/platform/limits/
- Durable Objects limits: https://developers.cloudflare.com/durable-objects/platform/limits/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- Firebase Auth limits: https://firebase.google.com/docs/auth/limits
- Firebase JWT verification: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Turnstile Siteverify: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI price model: https://developers.openai.com/api/docs/models/gpt-6-luna
