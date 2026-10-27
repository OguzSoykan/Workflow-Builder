# Faz 4 çalışma günlüğü

## P4-001 — Faz 4 başlangıcı (2026-10-28)

- PR #20 (WB-011) kullanıcı tarafından birleştirildi: main `c30bc4a`; Faz 3 kartları tamamlandı. Kullanıcı “faz 4 yap” dedi; onay AGENTS'a kaydedildi.
- Kararlar soruldu ve onaylandı: Firebase projesi şimdilik yok (env ile bağlanacak, sahte token/yerel D1 testleri), bulut kayıt için e-posta doğrulaması zorunlu, WB-015 basit hali bu fazda, silme soft delete. DECISIONS'a D-05/D-06/D-09/D-10/D-12 olarak yazıldı.
- Sıra: WB-013 → WB-014 → WB-012 → WB-015 (istemci arayüzü API'ye bağlı). `feat/WB-013-token-verification` açıldı. Plan: Web Crypto ile bağımlılıksız RS256 doğrulama, Google JWK uç noktasından `Cache-Control` süresince önbellekli anahtar, enjekte edilebilir anahtar kaynağı ve saat, `GET /api/v1/me`, standart hata zarfı; token asla loglanmaz.

## P4-002 — WB-013 token doğrulama ve /me (2026-10-28)

- `apps/worker/src/auth/firebase-token.ts`: bağımlılıksız RS256 doğrulama, claim kontrolleri, Google JWK önbelleği (max-age, dakikada bir yenileme sınırı, fail-closed). `index.ts` `createApp` ile yeniden yapılandırıldı; `/api/v1/*` auth middleware, `GET /api/v1/me`, `503 AUTH_NOT_CONFIGURED`.
- Health testindeki `/api/v1/workflows` 404 beklentisi FAIL verdi: v1 rotaları artık önce auth'tan geçiyor (beklenen değişiklik); örnek `/api/v2/missing` yapıldı. OpenAPI: `GET /me` implemented + `Profile` şeması; docs testi uygulanmış operasyonları açık listeyle doğrular.
- Kapılar: typecheck/lint PASS; format ilk koşuda `docs/PHASE-4.md` FAIL → prettier → PASS; 365 Vitest (25 yeni) + 2 + 3 PASS; coverage satır %99,37 (firebase-token %96,4); negatif kapılar, build, secret:scan, Gitleaks PASS; E2E 36/36 (gerçek workerd'de yapılandırmasız 503). Karar ADR-018.
