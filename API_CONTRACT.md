# API Contract v1.1 — REST / Error / Auth Specification

**Kural:** Bu bir uygulama kodu veya OpenAPI YAML dosyası değildir. Codex aşamalarında birebir karşılığı OpenAPI 3.1 dosyası üretilecek. Versiyon prefix'i `/api/v1`.

## 1. Ortak protokol

- Tüm istek/yanıtlar UTF-8 JSON; except export'ın browser tarafında dosya üretimi.
- Üye rotalarında `Authorization: Bearer <Firebase ID token>`; Worker imza ve claim doğrulaması yapar.
- Anonim çalışma tamamen browser'da; anonime D1 workflow CRUD açılmaz.
- AI guest isteğinde tek kullanımlık Siteverify Turnstile token; anonim HttpOnly/Secure/SameSite cookie ile pseudonymous session.
- Güvenlik kontrolleri: max body, strict schema, `Content-Type`, request origin, ownership, sane timeouts.
- `X-Request-ID` yanıt header; `/api/v1/ai/...` için istemci `Idempotency-Key` tavsiye edilir ve zorunlu tutulabilir.

## 2. Standard response/error envelope

**Başarı:** `data`, `meta?` (`requestId`, `revision`, `usageRemaining` gibi alanlar).  
**Hata:** `error.code`, `error.messageKey`, `error.details?`, `requestId`; kullanıcı arayüzü messageKey'i TR/EN çevirir. Modelin ham cevabı/hata stack'i dönmez.

| HTTP | Anlam / örnek stable code |
|---|---|
| 400 | `INVALID_JSON`, `INVALID_REQUEST`, `SCHEMA_VERSION_UNSUPPORTED` |
| 401 | `UNAUTHENTICATED`, `TOKEN_EXPIRED` |
| 403 | `EMAIL_NOT_VERIFIED`, `AI_DISABLED` |
| 404 | `WORKFLOW_NOT_FOUND` (başkasına ait ID için de 404) |
| 409 | `REVISION_CONFLICT`, `STALE_PROPOSAL`, `IDEMPOTENCY_CONFLICT` |
| 413 | `GRAPH_TOO_LARGE`, `PROMPT_TOO_LONG` |
| 422 | `GRAPH_VALIDATION_FAILED`, `INVALID_PATCH`, `UNSUPPORTED_CONDITION` |
| 429 | `AI_GUEST_TRIAL_USED`, `AI_DAILY_QUOTA_REACHED`, `AI_BUDGET_EXHAUSTED`, `RATE_LIMITED` |
| 502 | `AI_PROVIDER_INVALID_RESPONSE` |
| 503 | `AI_PROVIDER_UNAVAILABLE`, `AI_LEDGER_UNAVAILABLE` |

## 3. Kullanıcı / auth sınırı

Firebase istemci SDK'sı şifre ile kayıt, giriş, logout, e-posta doğrulama ve şifre sıfırlama akışlarının sahibidir. Worker'da **`POST /auth/register` veya `POST /auth/login` yoktur**; böylece şifre hiçbir zaman API'ye verilmez.

| Metot | Endpoint | Kimlik | İstek ana alanları | Yanıt | Kabul |
|---|---|---|---|---|---|
| GET | `/api/v1/me` | Firebase verified bearer | Yok | `uid`, `preferredLocale`, `emailVerified`, `cloudSyncAllowed` | Expired/invalid 401, güncel email doğrulaması gösterilir |
| PATCH | `/api/v1/me` | Verified bearer | `preferredLocale`, `displayName` | güncel profil | Sadece kendi profil; strict validation |
| DELETE | `/api/v1/me` | Verified bearer | Hesap silme onayı | `202` / silme planı | P1; önce silme politikası, provider deletion tutarlılığı tasarlanır |

## 4. Workflow routes (yalnızca üye)

| Metot | Endpoint | Request fields | Success response | Davranış |
|---|---|---|---|---|
| GET | `/api/v1/workflows` | `cursor?`, `limit?` (≤25) | `items[]` (id,title,revision,updatedAt), `nextCursor?` | Owner-only, soft deleted hariç |
| POST | `/api/v1/workflows` | `workflow` canonical schemaVersion1, `source` | `workflowId`, `revision=1`, `contentHash` (201) | E-posta doğrulanmış; server validator; D1 atomik create |
| GET | `/api/v1/workflows/{id}` | none | `workflow`, `revision`, `contentHash`, metadata | Owner-only |
| PUT | `/api/v1/workflows/{id}` | `workflow`, `expectedRevision`, `baseContentHash`, `source` | `revision`, `contentHash`, `updatedAt` | 409 revizyon çakışmasında mevcut version bilgisi dönebilir, içeriği ancak owner'a |
| DELETE | `/api/v1/workflows/{id}` | none | 204 | Soft-delete; owner-only |
| GET | `/api/v1/workflows/{id}/revisions` | `cursor?`, `limit?` | version metadata list | Owner-only |
| GET | `/api/v1/workflows/{id}/revisions/{n}` | none | immutable snapshot | Owner-only |
| POST | `/api/v1/workflows/{id}/restore` | `sourceRevision`, `expectedRevision` | yeni revision info | P1, overwrite yapmadan yeni revision |

**Anlık davranış:** Kaydetme işlemi öncesi server validator canonical graph'ı doğrular. Client `owner_uid` gönderebilir ama sunucu bu alanı **yok sayar / reddeder**; sahip token `sub`'ından türetilir.

## 5. AI endpoints (browser workflow, cloud workflow fark etmez)

| Metot | Endpoint | Request alanları | Response alanları | Güvenlik |
|---|---|---|---|---|
| POST | `/api/v1/ai/workflows/generate` | `prompt`, `locale`, `desiredInputs?`, `turnstileToken?` | `proposalId`, `candidateWorkflow`, `validation`, `warnings`, `usage` | Guest 1, member quota, global cost, Siteverify |
| POST | `/api/v1/ai/workflows/edit` | `prompt`, `workflow`, `baseContentHash`, `baseRevision?`, `locale`, `turnstileToken?` | `proposalId`, `baseContentHash`, `operations[]`, `candidateWorkflow`, `diffSummary`, `warnings`, `usage` | Same constraints; graph never saved server-side here |
| GET | `/api/v1/ai/limits` | none | `aiEnabled`, `guestTrialAvailable?`, `memberRemaining?`, `budgetState` coarse flag | Asla master secret veya tam maliyet ledger'ı açmaz |

`generate/edit` sonucunun dönmesi canvas'ı veya bulut revision'ı otomatik değiştirmez. Uygulama kullanıcı onayını alır; client patch'i `baseHash` ile uygular. Üyeye buluta kaydetme sonraki `PUT /workflows/{id}` işlemidir. Böylece `AI edit` endpoint'i kritik state değiştiren yetkili bir endpoint değildir.

**Patch semantics:** Operasyonlar canonical ordering ile uygulanır; bir alan/node silindiyse dangling edge/input referansı bulunamaz. Kodlanmış diff özeti sunucu kaynaklı graph karşılaştırmasından üretilmeli, modelin kelimesiyle güvenilir kabul edilmemeli.

**Anonim identity:** Guest cookie otomatik olarak yeterli güvenilirlikte kimlik değildir; `ai/limits`'te 'tek kişi kesin' vaadi verilmez. Cookie silme ile tekrar hakkı elde etmek mümkün olsa bile global bütçe korunur.

**Rate/accounting:** AI sağlayıcısına çağrı başlamadan merkezi USD rezervasyon alınmalı. Atomik budget + per-session/per-user quota checks fail-closed. Provider hatası sonrası belirsiz maliyet varsa rezervasyon dürüstçe korunur; otomatik sonsuz retry yok.

## 6. Validation & simulation endpoints

**Tercih:** Local browser `workflow-core` validator/simulator'ü doğrudan çalıştırır. Public `/api/v1/workflows/validate` ve `/api/v1/simulations/run` endpoint'lerini ilk sürümde oluşturmuyoruz (YAGNI, hosting/abuse tasarrufu). D1 kaydında ve AI sunucu çıkışında `workflow-core` validator tekrar kullanılır.

## 7. Paginasyon, sürüm ve localization

- Workflow listesi cursor-based; stable updatedAt + id ordering.
- `schemaVersion` ile belge migrasyonu; API `/v1` independent.
- Hata mesajı alanında `messageKey`; public API semantic locale-independent.
- UI tarih gösterimi locale-aware; canonical date input value `YYYY-MM-DD`.
- `error.details` kullanıcıye hassas veriyi yansıtmamalı; AI'nin ham generation text'i asla hata cevabında yok.

## 8. Auth / güvenlik testleri

- Sahte, süresi dolmuş, yanlış `aud/iss`, hatalı `kid` Firebase token'ı reddedilir.
- Kullanıcı A, B'nin ID'sine GET/PUT/DELETE ile erişemez; 404 semantiği.
- Hesap doğrulaması tamamlanmadan cloud-save/üye AI hakkı açılmaz (varsayılan).
- Save sırasında valide olmayan graph `422`, revision mismatch `409`.
- AI guest Siteverify başarısızsa provider çağrısı yok.
- Budget DOI (Durable Object) hatasında provider çağrısı yok; UI manuel çalışma yoluna devam eder.
- İki paralel AI çağrısı tek anonim session hakkını iki kez kullanamaz.
- İki paralel workflow PUT işlemi aynı expectedRevision'da iki yeni geçerli current revision yaratamaz.

## 9. İlk API uygulama sırası

1. `GET /me` ve guard (auth fazında).
2. Workflow CRUD + optimistic lock.
3. AI budget ledger + generate.
4. AI edit + diff.
5. `GET /ai/limits`.

**API kodlaması Faz 1 görevi değildir;** bu belgede yalnızca sözleşme dondurulur.
