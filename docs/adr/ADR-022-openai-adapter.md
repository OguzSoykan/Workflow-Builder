# ADR-022 — OpenAI adaptörü ve maliyet sınırı

**Durum:** Kabul edildi (28 Ekim 2026). **Kart:** WB-018. Kaynak: Architecture §4, D-07/D-12/D-13.

## Karar

- Responses API (`POST /v1/responses`), Structured Outputs `text.format = {type: json_schema, strict: true}`,
  `store: false`, `max_output_tokens = 8000`, 60 sn zaman aşımı. Yeni bağımlılık yok (`fetch`).
- Yalnız fiyatı kodda doğrulanmış modeller: `gpt-6-luna` (0,10 / 0,50 USD per 1M girdi/çıktı token,
  [kaynak](https://developers.openai.com/api/docs/pricing), 28 Ekim 2026). Fiyatsız model istenirse sağlayıcı
  oluşturulmaz ve AI kapalı kalır; daha pahalı modele otomatik geçiş ve otomatik retry yoktur.
- Rezervasyon tavanı: girdi token üst sınırı = UTF-8 bayt + 64 (BPE token en az 1 bayt), çıktı 8000 token;
  maliyet mikro-USD yukarı yuvarlanır. Tek istek tavanı tipik küçük akışta ~1 cent mertebesindedir.
- Sonuç → ledger uzlaştırması: ağ/zaman aşımı ve 5xx `unknown` (tam rezervasyon harcanır); 4xx
  (doğrulama, yetki, hız sınırı) `not_billed`; 200 yanıtta `usage` ile `billed`, `usage` yoksa `unknown`.
  Ret (`refusal`), `incomplete` ve bozuk JSON çıktı faturalanmış sayılır ama kullanıcıya hata döner.
- Seçim env ile: `AI_PROVIDER=mock` (ağsız, ücretsiz, deterministik) veya `openai` + `OPENAI_API_KEY`
  secret'ı (+ isteğe bağlı `AI_MODEL`). Key yalnız `.dev.vars`/`wrangler secret`'ta; repo, log ve sohbete yazılmaz.

## Kanıt

`apps/worker/test/provider.test.ts`: istek biçimi, faturalandırma, 9 hata/uzlaştırma eşlemesi, maliyet
sınırı, fiyatsız model reddi, mock, env seçimi. Canlı OpenAI çağrısı yapılmadı (WB-021'de kullanıcı key'iyle).

## Sonuçlar

API reference sayfası erişilemediği için yanıt alanları (`output[].content[].type`, `usage`) kılavuz ve
bilinen şemaya göre kuruldu; canlı eval'de doğrulanacak. Fiyat değişirse tablo güncellenmelidir.
