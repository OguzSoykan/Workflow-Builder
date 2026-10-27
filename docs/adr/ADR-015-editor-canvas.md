# ADR-015 — Faz 2 tuval sınırı ve React Flow tip uyumluluğu

Durum: WB-005A teknik uygulama kararı. Ürün kapsamı değişmez.

## Model ve UI

React Flow 12.12.0 yalnız web paketinde kullanılır. Workflow contract canonical
modelin kaynağıdır; React Flow node/edge/selection alanları UI projeksiyonudur.
Saf web düzenleme fonksiyonları şema ve limitleri korur. D-03/D-08 saklama politikası
belirlenmeden yalnız bellek içi taslak düzenlenir; kaydetme iddiası yoktur.

Node türleri mevcut public NODE_HANDLES ile çizilir. Bağlantı formu klavye
alternatifidir. Tek Start, geçerli source handle, tek çıkış bağlantısı ve döngüsüzlük
edit sınırında kontrol edilir; tam graph validation UX WB-008'e aittir.
Condition varsayılanı `fieldKey: alan` henüz yapılandırılmamış bir taslaktır;
UI bunu açıkça bildirir. Gerçek alan/operatör seçimi WB-006'da uygulanır.

## Geçici tip düzeltmesi

`@xyflow/react@12.12.0` → `@xyflow/system@0.0.83` yayımlanmış declarations,
`exactOptionalPropertyTypes: true` altında InternalNodeBase generic sınırını
bozuyor. Aynı hata upstream [#6038](https://github.com/xyflow/xyflow/issues/6038)
içinde raporlandı. Uygulama dışındaki 19 TS2344 hatası yerelde yeniden üretildi.

Typecheck'i gevşetmek yerine root postinstall, `scripts/patch-xyflow-types.mjs`
ile yalnız NodeBase'in 21 opsiyonel alanına açık `| undefined` tipini ekler.
ESM/UMD declarations birlikte kontrol edilir; sürüm ve orijinal/yamalı SHA-256
uyuşmazsa kurulum başarısız olur. Çalışma zamanı JavaScript'i değişmez. Betik
idempotenttir; node_modules commitlenmez; temiz npm ci aynı düzeltmeyi uygular.

Kaldırılma koşulu: upstream sürüm aynı strict ayarlarla temiz typecheck geçtiğinde
paket pinini güncelle, postinstall/script'i kaldır ve temiz npm ci/CI ile doğrula.
Bu geçici bakım yükü Zod güvenlik bulgusundan ayrıdır; o bulguyu gidermiş sayılmaz.
