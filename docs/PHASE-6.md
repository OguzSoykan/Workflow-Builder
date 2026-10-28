# Faz 6 — Yayın hazırlığı

**Durum:** Yerel olarak yapılabilen tüm Faz 6 işleri tamamlandı (28 Ekim 2026). Gerçek staging/production kurulumu ve deploy ürün sahibinin hesap/onay adımlarını bekliyor. İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-6.md).
Kaynak: PRD FR-11, AC-13, BACKLOG WB-022/023.

| Kart    | İş                                                    | Durum   | Kabul                                                                         |
| ------- | ----------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| WB-022A | TR/EN arayüz (i18n altyapısı ve tüm ekranlar)         | Review  | Ana akış iki dilde; eksik çeviri testi; dil seçimi kalıcı, `<html lang>`      |
| WB-022B | Klavye/erişilebilirlik smoke ve dar ekran cilası      | Backlog | Ana senaryolar klavyeyle; otomatik a11y kontrolleri; 390px görsel inceleme    |
| WB-023  | Staging/prod, izleme, yayın kontrol listesi, rollback | Backlog | Ayrı ortam/secret; CI kapıları; staging smoke — hesap ve deploy onayı gerekir |

## WB-022A uygulama sınırı

- Ayrıntılar [ADR-025](adr/ADR-025-i18n.md). 28 dosyada ~450 satır metin `t()`'ye taşındı (AST tabanlı dönüştürücü + elle düzeltme); parçalı cümleler parametreli tam cümlelere çevrildi. Başlıkta dil seçici; örnek akışlar seçili dilde oluşur.
- Kanıt: katalog tamlık/kalıntı testleri, 494 Vitest + 2 + 3, 49 Chromium (İngilizce akış + tarayıcı diline göre başlangıç dahil), masaüstü ve 390px İngilizce ekran görüntüsü incelendi.

## WB-022B uygulama sınırı

- `@axe-core/playwright` 4.14.0 (yalnız devDependency, sabit sürüm; audit 0) ile WCAG 2.1 A/AA taraması: boş editör, örnek + seçili koşul, bekleyen simülasyon, İngilizce, giriş formu, oturum açık + AI paneli. İlk tarama yalnız renk kontrastı ihlalleri buldu (gri tonlar 3,47–4,4:1, koşul amber 3,49:1); renkler `#4f6275` ve `#86601f` yapıldı (tüm arka planlarda ≥4,9:1) → 0 ihlal.
- Klavye smoke: örnek yükleme, tutar girişi, simülasyonu başlatma, onay ve geri al yalnız Tab/Enter/kısayolla; odak halkası görünür.
- Dar ekran: 390px TR/EN görüntüleri ve mevcut dar görünüm E2E'leri; yatay taşma yok. Mobilde mini harita PR #9 kararıyla korunur.

## WB-023 uygulama sınırı

- `infra/wrangler.jsonc`: staging/production için ayrı Worker, D1, DO, değişken ve observability (Wrangler devralmaz; ilk dry-run staging'in bağlantısız olduğunu gösterdi). `npm run build` üç yapılandırmayı dry-run ile derler; `environments.test.ts` ayrıklığı ve config'te secret olmadığını denetler.
- `.github/workflows/deploy.yml`: yalnız elle, yalnız `main`, GitHub environment (production onaylı), sırayla yer tutucu koruması → kapılar → D1 migration → deploy → smoke; action'lar SHA'ya sabit. `scripts/check-deploy-config.mjs`, `scripts/smoke.mjs`; `scripts/release.test.mjs` bunları ve workflow sırasını test eder.
- [OPERATIONS](OPERATIONS.md): ortam tablosu, tek seferlik kurulum, yayın kontrol listesi, izleme, geri alma. ENVIRONMENTS güncellendi.
- NOT RUN (hesap/onay gerekir): gerçek kaynak oluşturma, secret yükleme, staging/production deploy, smoke, ücretsiz katman CPU/kota ölçümü.
