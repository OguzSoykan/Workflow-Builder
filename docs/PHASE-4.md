# Faz 4 — Kimlik ve bulut kayıt

**Durum:** Kullanıcı onayıyla başladı (28 Ekim 2026). İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-4.md).
Kaynak: PRD FR-09/10, AC-08/12, API Contract §1–4/§8, Data Model §2–4/§7, Architecture §3/§5, DECISIONS Faz 4 kararları.
Sıra bağımlılığa göre: önce Worker doğrulaması ve D1 API, sonra istemci arayüzü.

| Kart   | İş                                           | Durum   | Kabul                                                                                            |
| ------ | -------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| WB-013 | Worker Firebase token doğrulama + `/me`      | Review  | RS256 imza, `kid`, `aud`, `iss`, `exp`, `iat`, `auth_time`, `sub`; sahte/süresi dolmuş token 401 |
| WB-014 | D1 şema, migration, CRUD, revizyon, kilit    | Backlog | Sahiplik (A, B'ye 404), immutable revizyon, paralel PUT tek kazanan + 409, soft delete, 422      |
| WB-012 | Firebase e-posta/şifre arayüzü               | Backlog | Şifre Worker'a gitmez; doğrulama/sıfırlama Firebase'de; yapılandırma yoksa kapalı                |
| WB-015 | Yerelden buluta kayıt + revizyon görüntüleme | Backlog | Açık onay, yerel korunur, tekrar kayıt revizyon ekler, başarısız kayıtta yerel bozulmaz          |

## WB-013 uygulama sınırı

- Ayrıntılar [ADR-018](adr/ADR-018-firebase-token-verification.md). `createApp` anahtar kaynağı ve saati enjekte edilebilir; varsayılan Google JWK önbelleği.
- `/api/v1/*` önce kimlik doğrular; tanımsız v1 rotaları da yetkisiz istekte 401/503 döner (rota varlığı sızdırılmaz). OpenAPI'de `GET /me` uygulandı olarak işaretlendi, `Profile` şeması eklendi.
- Kanıt: 365 Vitest (25 yeni auth testi) + 2 scanner + 3 OpenAPI; 36 Chromium (yapılandırmasız 503 dahil).

## WB-014 uygulama sınırı

- Ayrıntılar [ADR-019](adr/ADR-019-d1-workflow-storage.md). Rotalar: liste, oluştur, getir, güncelle (iyimser kilit), soft delete, revizyon listesi ve tek revizyon; `restore` P1.
- `/me` D1 varsa profil satırını ilk çağrıda oluşturur ve dili oradan okur.
- Testler gerçek yerel D1'de (`tests/platform/d1-proxy.mjs`, bellek içi); OpenAPI şemaları gerçek yanıtlarla Ajv'de doğrulanır.

## WB-012 uygulama sınırı

- Ayrıntılar [ADR-020](adr/ADR-020-browser-auth.md): Firebase Auth REST istemcisi, `GET /api/config`, başlıkta hesap paneli (giriş, kayıt, doğrulama e-postası, “Doğruladım, yenile”, şifre sıfırlama, çıkış).
- Yapılandırma yoksa “Bulut hesabı yapılandırılmadı”. Çıkış yerel taslağı silmez.
- Kanıt: 392 Vitest (Firebase istemcisi + config testleri) + 2 scanner + 3 OpenAPI; 39 Chromium (Firebase uç noktaları Playwright ile taklit edildi; şifrenin uygulama origin'ine hiç gitmediği doğrulandı).
