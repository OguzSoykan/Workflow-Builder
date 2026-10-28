# ADR-023 — Prompt'tan workflow oluşturma

**Durum:** Kabul edildi (28 Ekim 2026). **Kart:** WB-019. Kaynak: PRD FR-06/AC-06/09/10, API Contract §5, ADR-021/022, D-11.

## Karar

- `POST /api/v1/ai/workflows/generate` (`prompt` 1–2000 karakter, `locale`). Sıra: auth → AI açık + doğrulanmış
  e-posta → gövde/prompt doğrulaması → sağlayıcı yapılandırması → ledger rezervasyonu (kota + bütçe) → tek
  sağlayıcı çağrısı → uzlaştırma → sunucu doğrulaması. Doğrulama hatalarında rezervasyon yapılmaz.
- `Idempotency-Key` zorunlu (8–128 `[A-Za-z0-9_-]`), kullanıcı başına kapsamlı (`uid:key`). Yanıt ledger'da saklanır;
  aynı key tekrarında model yeniden çağrılmaz, saklı yanıt döner. Yanıt yokken (işlemde/başarısız) `409`.
- Model, sade strict bir taslak şemasını doldurur (`ref` + tür + null'lanabilir alanlar). Sunucu node ID'lerini
  (`n1…`), bağlantı ID'lerini, katmanlı yerleşimi ve yeni `workflowId`'yi üretir; aynı çıkışa ikinci kenarı ve
  bilinmeyen referansları atar, sonra contract şeması ve validator çalışır. Şemaya uymayan çıktı `502
AI_PROVIDER_INVALID_RESPONSE`; semantik eksik öneri `validation.issues` ve `AI_PROPOSAL_INCOMPLETE` uyarısıyla döner (D-03).
- Talimat metni kuralları sabitler ve kullanıcı metnini yalnız süreç açıklaması sayar (prompt injection'a karşı;
  çıktı zaten şema + validator ile sınırlanır). Prompt ve çıktı loglanmaz.
- Sunucu hiçbir öneriyi kaydetmez veya uygulamaz. Web paneli öneriyi önizler; “Taslağa uygula” mevcut taslağın yerine
  geçirir (geri alınabilir), “Reddet” hiçbir şey yazmaz (AC-06). İstemci de öneriyi contract ile yeniden doğrular.

## Kanıt

Worker: 18 test (mock ve taklit edilmiş OpenAI: tek çağrı + gerçek kullanım faturası 700 µ$, replay'de ikinci çağrı yok,
429'da kota/bütçe iadesi, 5xx'te bilinmeyen maliyet, geçersiz/ret yanıtları, bütçe tavanında çağrı yok, ledger/sağlayıcı
yok, 7 giriş reddi rezervasyonsuz; taslak dönüşümü). Web: 8 istemci testi, 3 E2E (reddetmek değiştirmez, uygula + geri al, hata mesajı).

## Sonuçlar

Canlı model kalitesi ölçülmedi (WB-021). Kayıtlı yanıtlar ledger'da tutulur (en fazla ~256 KiB/istek); temizleme politikası
ileride gerekir.
