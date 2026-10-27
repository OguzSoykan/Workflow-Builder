# ADR-018 — Worker'da Firebase ID token doğrulaması

**Durum:** Kabul edildi (28 Ekim 2026). **Kart:** WB-013. Kaynak: Architecture §3, API Contract §3/§8, D-05/D-12.

## Karar

- Yeni bağımlılık yok: imza Web Crypto `RSASSA-PKCS1-v1_5/SHA-256` ile doğrulanır. Yalnız
  `alg=RS256` ve bilinen `kid` kabul edilir; `none`/HMAC reddedilir. Token en fazla 4096 karakter.
- Claim kontrolü: `aud = FIREBASE_PROJECT_ID`, `iss = https://securetoken.google.com/<proje>`,
  `sub` 1–128 karakter, `exp > now`, `iat ≤ now`, `auth_time ≤ now`; zamanlar pozitif tam sayı.
  Süresi dolmuş token `TOKEN_EXPIRED`, diğer tüm hatalar `UNAUTHENTICATED` (sebep istemciye verilmez).
- Anahtarlar Google JWK uç noktasından alınır, `Cache-Control max-age` (en fazla 6 saat) kadar
  izolat belleğinde tutulur; bilinmeyen `kid` en fazla dakikada bir yenileme tetikler. Ağ hatasında
  doğrulama başarısız olur (fail-closed).
- `FIREBASE_PROJECT_ID` tanımlı değilse tüm `/api/v1/*` rotaları `503 AUTH_NOT_CONFIGURED` döner.
  Sahip her zaman doğrulanmış `sub`'dır; istemcinin gönderdiği kimlik alanları yetki kaynağı değildir.
- `GET /api/v1/me`: `uid`, `emailVerified`, `preferredLocale` (profil saklanana kadar `tr`),
  `cloudSyncAllowed = emailVerified` (D-05). Token ve claim'ler loglanmaz.

## Kanıt

Testte üretilen RSA anahtarlarıyla imzalı token'lar: geçerli, süresi dolmuş, yanlış aud/iss,
boş/uzun/sayısal sub, gelecekteki iat/auth_time, eksik/bilinmeyen kid, HS256/none, sahte imza,
değiştirilmiş payload ve bozuk biçimler. Anahtar önbelleği, yenileme sınırı ve ağ hatası testleri;
gerçek workerd'de yapılandırmasız 503 E2E.

## Sonuçlar

Gerçek Firebase projesiyle uçtan uca giriş bu fazda kanıtlanmadı (D-12); proje bağlanınca
staging smoke testi gerekir. Revocation kontrolü (Admin API) yoktur; kısa token ömrüne dayanılır.
