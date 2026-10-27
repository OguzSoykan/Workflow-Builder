# ADR-020 — Tarayıcıda Firebase Auth REST istemcisi

**Durum:** Kabul edildi (28 Ekim 2026). **Kart:** WB-012. Kaynak: Architecture §3, API Contract §3, D-05/D-12.

## Karar

- Architecture “Firebase istemci SDK'sı” der; uygulama aynı Firebase Authentication hizmetinin public
  REST uç noktalarını (`identitytoolkit` accounts:signUp/signInWithPassword/sendOobCode, `securetoken`
  token yenileme) `fetch` ile kullanır. Gerekçe: yeni bağımlılık ve büyük bundle yok, istemci davranışı
  açık ve küçük, E2E'de Firebase uç noktaları birebir yakalanabilir. Kayıt/giriş/doğrulama/sıfırlama
  sahipliği Firebase'de kalır; şifre yalnız Firebase'e gider, Worker'da login/register rotası yoktur.
- Public web config (proje ID, web API anahtarı; secret değildir) build'e gömülmez: Worker
  `GET /api/config` ile env'den (`FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`) verir. Biri eksikse
  `firebase: null` ve arayüz “Bulut hesabı yapılandırılmadı” gösterir. `FIREBASE_AUTH_EMULATOR_URL`
  yalnız `http://127.0.0.1|localhost:<port>` ise iletilir.
- Oturum (`uid`, e-posta, ID/refresh token, bitiş) `localStorage`'da `workflow-builder:auth:v1`
  anahtarında tutulur; ID token bitişe 5 dakikadan az kala yenilenir; yenileme başarısızsa çıkış yapılır.
  Çıkış yerel taslağı silmez (Data Model §7). E-posta doğrulaması “Doğruladım, yenile” ile token
  yenilenip `/me`'den okunur; sunucu tarafı her zaman Worker doğrulamasıdır (ADR-018).
- Firebase hata kodları Türkçe mesaja eşlenir; giriş hatalarında hesap varlığı sızdırılmaz.

## Riskler

Refresh token `localStorage`'dadır (SDK'nın IndexedDB saklamasıyla benzer XSS riski); CSP ve React
düz metin render'ı bu riski azaltır. Gerçek Firebase projesiyle uçtan uca deneme yapılmadı (D-12);
proje bağlanınca staging smoke gerekir. SDK'nın sağladığı çok sekme oturum eşzamanlaması yoktur.
