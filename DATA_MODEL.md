# Data Model v1.1 — Cloudflare D1 & Atomic AI Budget

**Sadece spesifikasyon.** Gerçek SQL migration dosyası Codex görevlerinde hazırlanacak.

## 1. ERD — ilişki tablosu

- `users (1) → (N) workflows (1) → (N) workflow_revisions`.
- `users (1) → (N) ai_request_metrics` (anonymous kullanımda user NULL olabilir).
- `workflows (1) → (N) simulation_runs` sonraki sürüm; ilk MVP'de simülasyonlar local saklanır.
- Bütçe için otorite **tek SQLite-backed Durable Object**; D1 `ai_request_metrics` sadece raporlama/audit amaçlıdır. `ai_budget_ledger` D1'de ikinci bağımsız doğruluk kaynağı olmayacaktır.

## 2. `users`

| Alan | Rol / kısıt |
|---|---|
| `firebase_uid` | TEXT, PK, Firebase verified token `sub` |
| `display_name` | TEXT, nullable, max 100 |
| `preferred_locale` | TEXT `tr/en`, default `tr` |
| `created_at` | UTC timestamp, not null |
| `updated_at` | UTC timestamp, not null |
| `deleted_at` | UTC timestamp nullable; veri silme akışı tasarlanacak |

**Önemli:** `password_hash`, `password_salt`, `email_verification_token` ve `refresh_token` D1'de **bulunmaz**. E-posta saklamak zorunlu değil; UI için Firebase session kaynağı kullanılır. Kullanıcının doğrulandığına Firebase'den gelen geçerli token ile karar verilir.

## 3. `workflows`

| Alan | Rol / kısıt |
|---|---|
| `id` | UUID/ULID TEXT PK |
| `owner_uid` | TEXT FK → users.firebase_uid NOT NULL, index |
| `title` | TEXT max 120 |
| `description` | TEXT max 1000, nullable |
| `current_revision_number` | INT NOT NULL positive |
| `created_at`, `updated_at` | UTC |
| `deleted_at` | UTC nullable, owner listing filtre |

İlk MVP'de `visibility=private` yalnızca davranış olarak sabittir; ileride paylaşım ihtiyacı olmadıkça `visibility` kolonunu eklemeyebiliriz (YAGNI). `owner_uid + updated_at` üzerinde listeleme indeksi.

## 4. `workflow_revisions`

| Alan | Rol / kısıt |
|---|---|
| `id` | TEXT PK |
| `workflow_id` | TEXT FK → workflows.id, index |
| `revision_number` | INTEGER; `(workflow_id, revision_number)` UNIQUE |
| `schema_version` | INTEGER =1 |
| `content_hash` | TEXT; canonical graph hash |
| `graph_json` | TEXT, tam doğrulanmış snapshot, bounded |
| `source` | ENUM semantiği: `manual`, `ai_create`, `ai_edit`, `import`, `restore` |
| `created_by_uid` | TEXT FK users.firebase_uid |
| `created_at` | UTC |

Revision'lar immutable. Restore, eski sürümün üzerine yazmaz; yeni numarayla snapshot oluşturur. Current revision valid olmalı; koşullu update ile 409 dönülmeli.

## 5. `ai_request_metrics` (minimize edilmiş raporlama)

| Alan | Rol / kısıt |
|---|---|
| `request_id` | TEXT PK, idempotency/correlation için |
| `subject_kind` | `guest` / `user` |
| `subject_digest` | pepper/HMAC bazlı, ham IP/email değil; saklama stratejisi dokumente |
| `user_uid` | nullable FK |
| `mode` | `create` / `edit` |
| `model` | TEXT |
| `status` | `reserved`, `succeeded`, `failed`, `reconciled` |
| `input_tokens`, `output_tokens` | integer nullable |
| `reserved_usd_micros`, `actual_usd_micros` | integer; kayan nokta USD yerine mikro-USD integer |
| `duration_ms` | integer nullable |
| `created_at` | UTC |

Kişi başı günlük quota akışında yoğun yazma sorunu çıkmasın diye esas sayaçlar Durable Object içindeki atomic ledger'da tutulabilir; D1 metrikleri batch/asenkron minimal tutulur. AI metrik saklama süresi önerisi 30 gün, onayla değiştirebiliriz.

## 6. Durable Object — `AI_BUDGET` otoritesi

**Tek object identity:** `global` (tüm AI API çağrıları aynı actor'a gider). SQLite-backed DO Free katmanında desteklenir.

Otoritatif mantıksal kayıtlar:

- `budget_settings`: `allocation_total_microusd=5,000,000`, `stop_at_microusd=4,500,000`, `model_allowed`, `enabled`.
- `budget_reservations`: `request_id`, `subject_key`, `reserved_microusd`, `actual_microusd?`, `state`, `created_at`, `expires_at`.
- `guest_trial_claims`: `anonymous_session_hash`, `consumed_at`, `request_id` (aynı session ikinci kez talep edemez).
- `user_daily_quotas`: `utc_day`, `user_uid`, `requests_consumed`, composite unique.

**Atomic invariants:** `committed + outstanding_reserved + requested_max <= stop_at`; guest claim ve rezervasyon birlikte işlenir; aynı requestId ile tekrar gelirse aynı rezervasyon döner, ikinci OpenAI çağrısı başlatılmaz. Timeout durumunda bilinmeyen gerçek maliyet rezervi otomatik sıfırlanmaz; muhasebe uzlaştırılır veya güvenli TTL-politikası/üst sınır sürdürülür. Startup/DO unavailable durumda AI kapalıdır; manuel editor çalışır.

**Kota hedefleri:** Anonymous 1 / signed session, authenticated 3 / UTC day varsayılan; global USD tavanı kimlik türünden bağımsız. Çoklu cihaz/IP veya cookie silme tek-kişi kısıtını aşabilir; garanti olarak sunulmaz.

## 7. Veri tutarlılığı ve silme

- Workflow create tek atomic işlemde `workflows` ve revizyon 1 oluşturur.
- Update `expectedRevision` ve ownership doğrulaması sonrası yeni immutable revision + `current_revision` artışı birleştirilir; transaction fail her ikisini geri alır.
- Aynı beklenen revizyonla paralel iki update gelirse biri kazanır, diğeri 409 alır.
- ID'ler tahmin edilemez olsa bile owner kontrolü gerekir (ID yeterli yetki değildir).
- Silme: ilk aşamada soft delete; un-delete/retention/kalıcı silme veri politikası GDPR/KVKK kapsamı netleşince yapılır.
- Yerel JSON tarayıcıdaki kullanıcı sorumluluğundadır; logout local taslağı otomatik silmez; kullanıcıya açık bilgilendirme.

## 8. Migration stratejisi

- Tek yönlü, sürümlü migration; staging önce; backup/export ve geri dönüş kontrol listesi.
- Graph `schemaVersion=1`; gelecekte schema migration fonksiyonları girişte/okumada version aware.
- Şema ve migration testleri SQLite/D1 uyumlu test ortamında geçmeden prod'a uygulanmaz.

## 9. Varsayılan sayısal ürün limitleri (ilk benchmarkta güncellenebilir)

| Kısıt | Hedef değer |
|---|---|
| Workflow max node | 50 |
| Workflow max edge | 100 |
| Workflow max input fields | 30 |
| Workflow JSON max request | 256 KiB |
| Workflow title | 1–120 karakter |
| AI prompt max | 2.000 karakter |
| Anonim AI | 1 deneme / anonim oturum |
| Auth AI | 3 model çağrısı / doğrulanmış kullanıcı / UTC gün, öneri |
| AI toplam stop | 4,50 USD rezervasyonlar dahil; 5 USD hedef tahsis |
