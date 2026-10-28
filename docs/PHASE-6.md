# Faz 6 — Yayın hazırlığı

**Durum:** Kullanıcı onayıyla başladı (28 Ekim 2026). İşlem kaydı: [çalışma günlüğü](worklogs/PHASE-6.md).
Kaynak: PRD FR-11, AC-13, BACKLOG WB-022/023.

| Kart    | İş                                                    | Durum   | Kabul                                                                         |
| ------- | ----------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| WB-022A | TR/EN arayüz (i18n altyapısı ve tüm ekranlar)         | Review  | Ana akış iki dilde; eksik çeviri testi; dil seçimi kalıcı, `<html lang>`      |
| WB-022B | Klavye/erişilebilirlik smoke ve dar ekran cilası      | Backlog | Ana senaryolar klavyeyle; otomatik a11y kontrolleri; 390px görsel inceleme    |
| WB-023  | Staging/prod, izleme, yayın kontrol listesi, rollback | Backlog | Ayrı ortam/secret; CI kapıları; staging smoke — hesap ve deploy onayı gerekir |

## WB-022A uygulama sınırı

- Ayrıntılar [ADR-025](adr/ADR-025-i18n.md). 28 dosyada ~450 satır metin `t()`'ye taşındı (AST tabanlı dönüştürücü + elle düzeltme); parçalı cümleler parametreli tam cümlelere çevrildi. Başlıkta dil seçici; örnek akışlar seçili dilde oluşur.
- Kanıt: katalog tamlık/kalıntı testleri, 494 Vitest + 2 + 3, 49 Chromium (İngilizce akış + tarayıcı diline göre başlangıç dahil), masaüstü ve 390px İngilizce ekran görüntüsü incelendi.
