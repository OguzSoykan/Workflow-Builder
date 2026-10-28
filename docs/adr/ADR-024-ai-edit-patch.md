# ADR-024 — AI düzenleme: kanonik patch, semantik diff, stable ID

**Durum:** Kabul edildi (28 Ekim 2026). **Kart:** WB-020. Kaynak: Workflow Contract §6, API Contract §5, AC-07, D-01/D-11.

## Karar (D-11 kanonik biçim)

- Wire isimleri: istek `prompt`, `locale`, `workflow`, `baseContentHash`; yanıt `proposalId`, `baseContentHash`,
  `operations[]`, `candidateWorkflow`, `diffSummary`, `validation`, `warnings`. Idempotency-Key, kota, bütçe ve ledger
  akışı generate ile aynı ortak boru hattındadır (`handleProposal`).
- `baseContentHash` gönderilen belgenin hash'iyle eşleşmezse `409 STALE_PROPOSAL` (rezervasyon yok). İstemci de
  uygulamadan hemen önce gösterdiği taslağın hash'ini yeniden hesaplar; değiştiyse öneriyi uygulamaz.
- İşlemler (`workflow-core` `applyPatch`): `deleteEdge`, `deleteNode` (bağlı kenarlar dahil), `removeInputField`,
  `upsertInputField`, `addNode`, `updateNode`, `addEdge`, `updateMetadata` — bu sırayla, gelen sıradan bağımsız;
  hepsi-ya-hiç. Bilinmeyen hedef, çakışan ID, sarkan kenar, hâlâ koşulda kullanılan silinmiş alan veya şema hatası
  patch'i reddeder.
- Model yalnız ID'li mevcut öğelere ve kendi `ref`'lerine başvurur; sunucu yeni düğümlere `ai-N`, kenarlara `e-ai-N`
  verir ve konum atar. Değişmeyen düğüm/kenar/alanlar dokunulmadan kalır (AC-07, yapı gereği).
- `diffWorkflows` ID bazlı anlamsal diff üretir (konum değişikliği raporlanmaz; anahtar sırasından bağımsız). Modelin
  açıklaması güvenilir diff kaynağı sayılmaz.

## Kanıt

Core: 13 patch/diff testi (sıra, atomiklik, 9 ret sebebi, alan işlemleri, konumun diff dışı olması). Worker: 11 test
(mock ve taklit OpenAI; eski hash rezervasyonsuz red; finans onayı ekleme, ID koruma, geçerli sonuç; bilinmeyen düğüm →
geçersiz yanıt ve faturalanmış). Web: istemci testleri ve 2 E2E (diff gösterimi + uygula + geri al; taslak değişince red).

## Sonuçlar

Model girdisi belgeyi içerdiği için düzenleme istekleri oluşturmaya göre daha pahalıdır; tavan bayt tabanlı hesaplanır.
