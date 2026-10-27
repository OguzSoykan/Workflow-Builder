# ADR-017 — Saf deterministik simülatör

**Durum:** Kabul edildi (28 Ekim 2026). **Kart:** WB-009. Kaynak: Workflow Contract §5, AC-02–04, D-14.

## Karar

- `workflow-core` içinde `startSimulation(workflow, inputValues, runId)` ve
  `decideApproval(workflow, run, decision)`. Saat, rastgelelik, ağ ve depolama yok;
  `runId` çağırandan gelir, trace zaman damgası içermez. Run nesnesi değişmez, her karar yeni
  run döndürür.
- §5 durumları: `validating` başarısızsa run oluşturulmaz (`WORKFLOW_INVALID` veya
  `INPUT_INVALID`, sözleşmedeki `failed` karşılığı). Start ve Condition otomatik ilerler,
  Approval `waiting_for_approval` ile durur, End `completed`/`rejected` sonucunu verir.
- Girdiler (D-14): varsayılan uygulanır; zorunlu veya koşulda kullanılan alan değersizse
  `INPUT_REQUIRED`. Tür (`isFieldValue`), alan sınırları ve bilinmeyen anahtar denetlenir.
- Koşullar: metin büyük/küçük harfe duyarlı, tarih ISO sırası, sayı sayısal sıra; tür
  uyuşmazlığı false. Eşik akıştaki koşul ayarından okunur, motorda sabit değer yoktur.
- Karar verilirken akışın içerik hash'i run'daki ile karşılaştırılır; iş mantığı değişmişse
  `WORKFLOW_CHANGED`. Konum değişikliği hash'e girmediği için çalışmayı bozmaz (ADR-014).

## Kanıt

31 unit test (AC-03 5000/15000, onay/ret, determinizm, 50 node zinciri, girdi ve operatör
matrisi, korumalar). `npm run benchmark:simulator`: M1 Pro/Node 24.22.1, 50 node + 48 karar
tam koşu median 57 ms, p95 60 ms.
