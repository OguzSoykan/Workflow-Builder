# AI kalite değerlendirmesi (WB-021, D-13)

20 sentetik Türkçe prompt (`apps/worker/eval/cases.ts`) ile prompt'tan oluşturma boru hattı ölçülür. Bir vaka,
öneri validator'dan geçerse ve beklenen düğüm/alan türlerini içerirse başarılıdır. Hedef: en az %85 (17/20);
bu bir ölçüm hedefidir, kesin başarı vaadi değildir.

## Çalıştırma öncesi kayıt (28 Ekim 2026)

| Kalem                  | Değer                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Model                  | `gpt-6-luna` ([fiyat](https://developers.openai.com/api/docs/pricing): 0,10 / 0,50 USD per 1M girdi/çıktı token) |
| Çıktı token üst sınırı | 8000 / istek, tek çağrı, retry yok                                                                               |
| En kötü durum maliyeti | 85.366 µUSD ≈ 0,085 USD (20 istek, bayt tabanlı girdi sınırı)                                                    |
| Harcama sınırı         | `--max-usd 0.50` (en kötü durum sınırı aşarsa hiç çağrı yapılmaz)                                                |
| Bütçe payı             | 5 USD tek seferlik tahsisten ayrılır; gerçek harcama rapora ve çalışma günlüğüne yazılır                         |
| Key                    | Ayrı OpenAI projesi; yalnız git dışı `infra/.dev.vars` (`OPENAI_API_KEY`), sohbet/log/commit'e yazılmaz          |

## Komutlar

- Ücretsiz deneme: `npm run ai:eval -- --mock --out <geçici-klasör>` (ağ yok; sabit mock akış rubrikle 5/20 alır).
- Canlı: `npm run ai:eval -- --max-usd 0.50` → `docs/evals/ai-eval-live-<tarih>.json` (prompt'lar sentetiktir; key yazılmaz).

## Sonuç — canlı çalıştırma (28 Ekim 2026)

| Ölçüm          | Değer                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Başarı         | **19/20 (%95)** — hedef %85 karşılandı                                                                                                                              |
| Geçerli öneri  | 19/20                                                                                                                                                               |
| Gerçek harcama | 10.374 µUSD ≈ **0,0104 USD** (en kötü durum 0,085, sınır 0,50)                                                                                                      |
| Başarısız vaka | `expense-invoice`: `AI_PROVIDER_INVALID_RESPONSE`, 4.056 µUSD — maliyet çıktı tavanına (8000 token) denk; yanıt tamamlanmadı (`incomplete`) ve faturalanmış sayıldı |

Rapor: [ai-eval-live-2026-10-28.json](ai-eval-live-2026-10-28.json) (key içermez). Canlı yanıt biçimi (`output[].content[].output_text`,
`usage`) ADR-022'deki varsayımla eşleşti. Key kullanıcı tarafından sohbete yapıştırıldı; çalıştırmadan sonra `infra/.dev.vars`
silindi, git geçmişinde/raporda yoktur; kullanıcıya key'i iptal edip yenilemesi önerildi.
