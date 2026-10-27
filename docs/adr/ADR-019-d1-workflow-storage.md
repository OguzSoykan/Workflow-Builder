# ADR-019 — D1 workflow saklama, revizyon ve iyimser kilit

**Durum:** Kabul edildi (28 Ekim 2026). **Kart:** WB-014. Kaynak: Data Model §2–4/§7, API Contract §4/§8, D-03/D-05/D-09/D-10/D-12.

## Karar

- Şema `infra/migrations/0001_workflows.sql`: `users`, `workflows`, `workflow_revisions`. Data Model'den
  bilinçli sapma: workflow anahtarı `(owner_uid, id)` ve `id` istemcinin `workflowId`'sidir. Böylece
  aynı yerel taslak tekrar kaydedilince yeni kayıt açılmaz (D-06) ve başka kullanıcının aynı ID'si
  çakışmaz/sızmaz. Revizyon anahtarı `(owner_uid, workflow_id, revision_number)` — immutable.
- Oluşturma: `workflows` + revizyon 1 tek D1 `batch` (transaction). Aynı sahip/ID varsa `409 WORKFLOW_EXISTS`.
- Güncelleme (D-10): tek `batch` içinde `INSERT … SELECT … WHERE EXISTS (current = expected)` ve
  koşullu `UPDATE`. Eklenen satır yoksa veya UNIQUE çakışırsa `409 REVISION_CONFLICT` +
  `currentRevision`. Üç paralel yazımda tek kazanan testle kanıtlandı.
- Her sorgu `owner_uid` ile filtrelenir; başka sahibin kaydı her rotada `404 WORKFLOW_NOT_FOUND`.
  Yazma için e-posta doğrulaması (`403 EMAIL_NOT_VERIFIED`, D-05); okumalar yalnız kendi verisini döner.
- Kayıt öncesi tam şema + semantik doğrulama (D-03): `422 GRAPH_VALIDATION_FAILED` + issue kodları;
  `schemaVersion ≠ 1` → `400`. Gövde `application/json` (`415`), ~260 KiB üstü `413`, bilinmeyen alan
  (`owner_uid` dahil) `400`. İstemci kaynağı yalnız `manual`/`import`.
- Silme soft delete (D-09): listeden çıkar, revizyonlar saklanır; ID ayrılmış kalır (yeniden oluşturma 409).
- Liste ve revizyon listesi en fazla 25, `updated_at DESC, id DESC` / `revision DESC` imleçli sayfalama.
- `DB` binding'i yoksa `503 STORAGE_NOT_CONFIGURED`. Wrangler config'te yalnız yerel yer tutucu ID
  vardır (D-12); `npm run db:migrate:local` yerel veritabanını hazırlar.

## Kanıt

`apps/worker/test/workflows.test.ts`: wrangler `getPlatformProxy` ile bellek içi gerçek D1 (workerd/SQLite)
üzerinde 21 test — oluşturma/çakışma, hata kodları, sahiplik 404'leri, immutable revizyonlar, eski
yazım 409, paralel yazımda tek kazanan, sayfalama, soft delete, profil satırı ve OpenAPI şema uyumu.

## Sonuçlar

Soft-delete edilmiş ID yeniden kullanılamaz; geri alma/kalıcı temizleme (P1) yoktur. `restore` rotası
uygulanmadı. Gerçek Cloudflare D1 üzerinde ölçüm/CPU doğrulaması Faz 6 staging'dedir.
