# Workflow Contract v1 — Canonical Graph & Simulation Specification

**Amaç:** Bu belge API, frontend, simülasyon ve AI'nın aynı `workflow` kavramını kullanmasını sağlayan dil-bağımsız sözleşmedir. Kaynak kod veya çalıştırılabilir JSON içermez.

## 1. Canonical Document (mantıksal alanlar)

| Alan | Tip / davranış | Not |
|---|---|---|
| `schemaVersion` | integer = 1 | Gelecekteki migration için |
| `workflowId` | UUID/string | Yerel ve bulut akışlarında stabil |
| `title` | string | 1–120 karakter |
| `description` | optional text | en fazla 1000 karakter |
| `locale` | `tr` / `en` | içerik dilini belirtir |
| `inputs` | array of field definitions | benzersiz `key` |
| `nodes` | array of nodes | benzersiz, stabil `id` |
| `edges` | array of edges | benzersiz, stabil `id` |
| `layout` | optional display metadata | grafik mantığını etkilemez |
| `contentHash` | canonical graph hash | AI edit base kontrolü için |

`revision` yalnızca bulut kaynakları için metadata olarak tutulur; hash içeriği revision/canvas sıralaması ve timestamp'ten bağımsız canonical business graph'ı temsil etmeli. Lokal değişiklikte hash yeniden hesaplanmalı. Hash ortak kod tarafından deterministik üretilir.

## 2. Input field definitions

Her alan: `key`, `label`, `type`, `required`, `defaultValue?`, `options?`, `validation?`.

| Tür | Kabul edilen koşul operatörleri | Değer standartları |
|---|---|---|
| `number` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` | finite JSON number; para birimi ilk aşamada kullanıcı açıklamasıdır |
| `string` | `eq`, `neq`, `contains` | case-sensitivity sabit, dokümanda belirtilir; öneri: varsayılan case-sensitive |
| `boolean` | `eq`, `neq` | true/false |
| `date` | `eq`, `neq`, `before`, `after` | Takvim tarihi `YYYY-MM-DD`, timezone dönüşümü yapılmaz |
| `enum` | `eq`, `neq`, `in` | izinli option kümesinden değer |

`eval`, SQL, JS veya custom expression kabul edilmez. İleride expression DSL gerekiyorsa ayrı sürüm/ADR gerekir.

## 3. Node / edge sözleşmesi

Her node: `id`, `type`, `label`, `position{x,y}`, `config`. Node ID kullanıcı görünür etiketten üretilmez. Koordinat değişikliği mantıksal çalışma sonucunu değiştiremez.

| Tür | Giriş | Çıkış/handle | Config |
|---|---|---|---|
| `start` | Yok | `next`: tam 1 | opsiyonel açıklama |
| `approval` | 1 veya daha fazla | `approved` ve `rejected`: her biri tam 1 | `roleLabel` string; simüle edilmiş etiket |
| `condition` | 1 veya daha fazla | `true` ve `false`: her biri tam 1 | fieldKey + operator + typed literal value |
| `end` | 1 veya daha fazla | Yok | outcome: `completed` veya `rejected` |

Her edge: `id`, `sourceNodeId`, `sourceHandle`, `targetNodeId`. Aynı source+handle için en fazla bir edge. Edge hedefi herhangi bir girişi olan node olabilir; Start hedeflenemez.

**Grafik invariant'ları:** Tam bir Start, en az bir End, tüm node'lar Start'tan erişilebilir; tüm çıkışlar bağlı; tüm yollar End'e ulaşır; cycle/self-loop yok; aynı handle'dan duplicate edge yok; node count ≤50, edge count ≤100, maksimum input field sayısı öneri 30.

Onay ret çıkışı her zaman bir `end(rejected)` olmak zorunda değildir: tekrar onay mekanizması için döngü yasak olduğundan, farklı bir reddedildi sonu veya farklı doğrusal yol olabilir. Sonuç, ulaşılan `end.outcome` ile belirlenir.

## 4. Validator sonuç sözleşmesi

- Başarı: `valid=true`, `issues=[]`.
- Hata: `valid=false`, `issues[]` içindeki her öğe `{code, severity, nodeId?, edgeId?, fieldKey?, translationParams?}` anlamındadır.
- Kodlar: `START_COUNT_INVALID`, `END_MISSING`, `EDGE_DANGLING`, `HANDLE_MISSING`, `DUPLICATE_HANDLE`, `UNREACHABLE_NODE`, `CYCLE_DETECTED`, `PATH_NOT_TERMINATING`, `INPUT_FIELD_MISSING`, `OPERATOR_TYPE_MISMATCH`, `GRAPH_LIMIT_EXCEEDED`, `SCHEMA_VERSION_UNSUPPORTED`.
- İçerik ve hata mesajı UI diline göre çevrilir; validator kullanıcıya hazır Türkçe/İngilizce metin döndürmek zorunda değildir.

## 5. Simülasyon sonlu durum makinesi

`idle → validating → running → waiting_for_approval → running → completed | rejected | failed`.

Her `run`: `runId`, `workflowContentHash`, `inputValues`, `status`, `currentNodeId`, `trace[]`, `outcome?`.

Adım kaydı: `stepIndex`, `nodeId`, `nodeType`, `action`, `selectedHandle?`, `decision?`, `outputState?`; zaman damgası opsiyonel, deterministik karşılaştırmalardan hariç tutulur.

- Start otomatik `next`.
- Condition input schema'ya göre boolean değerlendirir ve `true/false` handle'dan gider.
- Approval manuel kullanıcı etkileşimi bekler; karar gelince `approved/rejected` seçilir.
- End `outcome` döndürür.
- Simulator **network fetch, e-posta gönderimi, API çağrısı, AI çağrısı veya kalıcı DB yazımı gerçekleştirmez**.
- Tarayıcı dışı saf unit testleri bulunmalı; tarayıcı render mantığına bağımlı olmamalı.

## 6. AI edit patch sözleşmesi

Input: `baseContentHash` + `baseRevision?` + mevcut `workflow` tanımı + prompt.  
Output: `proposalId`, `baseContentHash`, `operations[]`, `explanation`, `warnings[]`, `candidateGraph` (sunucunun işlemleri uygulayıp doğruladığı sonuç), `diffSummary`.

İzinli işlemler: `addNode`, `updateNode`, `deleteNode`, `addEdge`, `updateEdge`, `deleteEdge`, `upsertInputField`, `removeInputField`, `updateMetadata`.

- Mevcut ID'yi yeniden adlandırma yoktur; `delete` açıkça istenmemişse silinmez.
- AI yeni ID'leri sağlayabilir ama sunucu format/çakışma kontrolü yapar ve gerekirse güvenli ID üretir.
- `updateNode` ve `updateEdge` kimliği korur. Bağlantı referansları işlemler uygulandıktan sonra doğrulanır.
- `candidateGraph` canonical validator'dan geçmezse öneri reddedilir, otomatik kaydetme olmaz.
- Önizleme anındaki `baseContentHash` ile kullanıcı `Uygula` dediği andaki local graph hash uyuşmazsa `STALE_PROPOSAL`.
- Kayıtlı workflow'da ayrıca `expectedRevision` şarttır; D1 yeni revizyonu yalnızca eşleşme halinde yaratır.

## 7. Import/export

- JSON boyutu için ilk uygulama hedefi ≤256 KB / workflow; 50 node üstü kesin reddedilir.
- Desteklenmeyen schemaVersion, eksik input tanımı, bozuk graph mevcut local veri üzerine yazılmaz.
- Import dosyası ve üretilen AI içeriği **güvenilmeyen veri** kabul edilir; kullanıcı HTML/JS gibi çalıştırılmaz.
- Export canonical business graph içerir; kullanıcı email'i, auth token'ı, prompt geçmişi veya API anahtarı içermez.
