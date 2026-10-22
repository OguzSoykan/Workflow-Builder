# AI Workflow Builder — Planning Pack v1.1

**Tarih:** 22 Ekim 2026  
**Durum:** Ürün ve mimari spesifikasyonu; **kaynak kod içermez**.  
**Esas hedef:** Cloudflare Free katmanında çalışacak, gerçek bir teknik portföy değeri taşıyan, AI destekli iş akışı tasarım ve **simülasyon** platformu. OpenAI API için toplam harcama hedefi en fazla 5 USD.

## Okuma / Codex'e aktarma sırası

1. `PRD.md` — ürün amacı, kullanıcı akışları, gereksinimler, MVP sınırı, kabul kriterleri.
2. `ARCHITECTURE.md` — modüller, sistem bağlamı, güvenlik, ücretsiz servis stratejisi, ADR.
3. `WORKFLOW_CONTRACT.md` — grafik veri modeli, iş kuralları, validasyon ve simülasyon durumları.
4. `DATA_MODEL.md` — D1 tabloları, alanlar, ilişkiler, işlem tutarlılığı ve saklama ilkeleri.
5. `API_CONTRACT.md` — auth sınırı, endpoint'ler, gövde/yanıt alanları, hata kodları.
6. `BACKLOG.md` — kullanıcı değerine ve bağımlılığa göre sıralanmış işler; Definition of Done.
7. `CODEX_PHASE_1.md` — yalnızca ilk fazı başlatacak, uygulanabilir görev tanımları ve çalışma protokolü.

## Sabitlenen kararlar

- Teknik/teknik olmayan kullanıcılar, ERP tarzı kurumsal arayüz ve TR/EN.
- Serbest iş akışı tasarımı; MVP node türleri `start`, `approval`, `condition`, `end`.
- Simülasyon duraklamalı/manual onay/ret; MVP'de gerçek onay/entegrasyon yok.
- Girişsiz yerel saklama; kullanıcı hesabında Cloudflare D1 bulut kayıt; özel workflow, JSON export.
- E-posta/şifre kimliği Firebase Authentication Spark ile yönetilir (Cloudflare üzerinde parola saklanmaz).
- AI create + edit; edit modunda kalıcı node ID ve base hash/revision; diff gösterimi ve açık kullanıcı onayı.
- Anonim AI için tek deneme hedefi; bunun kişi başına teknik olarak kesin garanti edilemeyeceği belgelidir.
- 5 USD toplam AI bütçesi, uygulama tarafında 4,50 USD durdurma eşiği ve ayrı OpenAI harcama kontrolü.
- Sıfırdan temiz repo; önceki prototipler doğrudan kaynak temel sayılmayacak.

## Henüz uygulanmadı

Bu dosyalar **planlama teslimidir**. Repo, kod, veritabanı, test ve deployment oluşturuldu veya çalışıyor anlamına gelmez. `CODEX_PHASE_1.md` ilk geliştirme aşamasını tarif eder; kullanıcı Codex'e geçtiğinde yürütülecek.

## Referanslar (22 Ekim 2026)

- Cloudflare Workers: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare Durable Objects Free: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Firebase Authentication: https://firebase.google.com/docs/auth/limits
- Firebase token validation: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Turnstile server verification: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- OpenAI project spending controls: https://help.openai.com/en/articles/9186755-managing-your-work-in-the-api-platform-with-projects
