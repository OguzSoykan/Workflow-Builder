# Workflow Builder — V2 Technical Evolution Roadmap

> **Sürüm:** 2.1 / Frontend-integrated technical roadmap (plan taslağı)  
> **Tarih:** 1 Kasım 2026  
> **Durum:** UYGULANIYOR — görev durumları bu dosyada işaretlenir; ayrıntılı kayıt [WORKLOG](WORKLOG.md).  
> **Amaç:** Ticari BPM yerine **AI Engineering, dağıtık sistemler, ileri seviye frontend engineering, görsel etkileşim tasarımı, backend, DevOps ve test mühendisliğini** kanıtlayan bir portföy ürünü geliştirmek.  
> **Referans taban:** `PROJECT_OVERVIEW.md` (V1, main @ `e9c6f6b` sonrası); mevcut `PRD.md`, `ARCHITECTURE.md`, `WORKFLOW_CONTRACT.md`, `API_CONTRACT.md`, `DATA_MODEL.md`, ADR'ler ve kod **değişiklikten önce yeniden okunacak**.  
> **Yönetim modeli:** ChatGPT = PM/architect/reviewer; Codex = implementer; GitHub + Markdown = source of truth; her görev için ayrı plan → uygulama → test → review → doküman → kullanıcı onayı.

---

## 0. Yönetici özeti ve mimari strateji

Bu yol haritası, çalışan V1'i yeniden yazmadan **7 backend/AI teknik kapasitesi** ve **4 frontend mühendisliği iş paketi** ekler: (1) MCP, (2) agent orchestration, (3) durable execution, (4) event-driven connectors, (5) observability/IaC, (6) RAG + advanced testing, (7) real-time collaboration. Önce **Faz 00: güvenli başlangıç**, en sonda **Faz 08: portföy teslimi** vardır. Faz 07 ileri opsiyondur; teknik değeri diğer fazların tamamlanmasına bağlı değildir. **UI-01/UI-02, Faz 00 sonrası MCP ile paralel veya öncelikli yürütülür; UI-03, gerçek AI/execution/RAG API hazır oldukça parça parça uygulanır; UI-04, frontend kalite kapılarını tamamlar.**

**V1'den korunacak sözleşmeler:**

- React 19 + React Flow; Hono/Cloudflare Worker; D1; Durable Object bütçe defteri; Firebase Auth; TypeScript monorepo; `workflow-contract` ve `workflow-core` paketleri.
- 4 node (`start`, `approval`, `condition`, `end`), `schemaVersion: 1` ve V1 JSON formatı geriye dönük uyumlu kalır. Yeni yürütme ve iş birliği veri modelleri ayrı sözleşmelerle geliştirilir; v1 davranışı sessizce değiştirilmez.
- V1 simülasyonu **tarayıcıda, deterministik, yan etkisiz** kalır. V2 yürütmesi ayrı, açıkça etiketlenmiş **sandbox/demo execution** modudur; gerçek satın alma/onay/ERP işlevi değildir.
- Mevcut AI sınırlamaları korunur: yalnız doğrulanmış kullanıcı, günlük üye başına 1 öneri (mevcut kural), toplam 5 USD tahsis / 4,50 USD hard-stop, fail-closed, `Idempotency-Key`, önizleme + insan onayı, AI çıktı doğrulaması. Agent/RAG isteklerinin aynı bütçe defterini nasıl paylaşacağı **önce tasarlanır**; yeni masraf kalemleri için ayrı alt sınır tanımlanır.
- Sahiplik izolasyonu, `expectedRevision`, kanonik JSON/hash, veri ve sırları loglamama, erişilebilirlik ve var olan CI kalite kapıları bozulmaz.

**Mimari tercih:** Modular monolith korunur. MCP arayüzü ve agent adaptörü mevcut core işlevlerini tüketir. Yalnız teknik gereklilik kanıtlanırsa yeni Worker/servis açılır. Cloudflare Workflows bir _durable orchestrator_ olarak kullanılır; keyfi kullanıcı grafiğini kendiliğinden yorumladığı varsayılmaz.

**Cost-first yaklaşım:** Yeni kaynak/servis oluşturulmadan güncel kota, ücretlendirme, local mocking, hesap izolasyonu ve kill switch dokümante edilir. Workflows, Queues, Vectorize, R2, dış gözlemlenebilirlik ve agent inference için “tamamen ücretsizdir” varsayımı yapılmaz. Production deploy manuel onaylı; tüm yeni yetenekler başlangıçta staging-only ve feature-flag OFF.

### Mimari hedef (özet)

```text
React / React Flow SPA
  ├─ V2 Design System + Storybook + adaptive dockable workspace
  ├─ V2 ELK-powered canvas layout + command palette + visual diffs
  ├─ V1 local validation + simulator ───────────────┐
  ├─ V2 AI Agent UX / Trace Viewer + RAG attribution                  │
  ├─ V2 Sandbox Run Viewer + diagnostic timeline                          │
  ├─ V2 Collaboration (optional)
  └─ Playwright visual regression + MSW + Storybook + perf budgets                    │
             │                                      ▼
Cloudflare Worker (Hono) ─── shared workflow-contract / workflow-core
  ├─ Firebase auth + owner scope + D1 versioning
  ├─ MCP Streamable HTTP boundary → typed read/proposal tools
  ├─ AI Agent adapter → guarded tool use + budget Durable Object
  ├─ Sandbox Run API → Cloudflare Workflows + D1 run/event journal
  ├─ Queue producer → Cloudflare Queues → mock connector consumer / DLQ
  ├─ R2 document ingestion → embeddings → Vectorize retrieval (optional)
  └─ OpenTelemetry / operational signals → dashboards
                   └─ IaC via Terraform for selected infrastructure
Optional collaboration: Worker → per-document Durable Object ↔ Yjs clients
```

### Faz özeti / önerilen sıralama

| Faz       | Teknik odak                          | Öğrenme ve ispat                               | Bağımlılık                         | Zorunluluk         |
| --------- | ------------------------------------ | ---------------------------------------------- | ---------------------------------- | ------------------ |
| **00**    | Baseline, risk, izolasyon            | Engineering governance                         | V1                                 | Zorunlu            |
| **UI-01** | Design system + responsive workspace | Frontend architecture, UI foundations          | 00                                 | Çekirdek, erken    |
| **UI-02** | Canvas engineering + visual editor   | Graph UX, algorithms, interaction design       | UI-01                              | Çekirdek, erken    |
| **01**    | MCP Server                           | Protocol design, authorization, API boundaries | 00                                 | Çekirdek           |
| **02**    | Agents SDK                           | Agent loop, tool guardrails, evals, budget     | 01                                 | Çekirdek           |
| **03**    | Cloudflare Workflows                 | Durable execution, state machine, HITL         | 00; 02 ile entegre edilebilir      | Çekirdek           |
| **04**    | Queues + Connectors                  | Event-driven delivery, idempotency, DLQ        | 03                                 | Çekirdek           |
| **05**    | OpenTelemetry + Terraform            | SRE, tracing, IaC, reliability                 | 00; 01–04'ü enstrümante eder       | Çekirdek           |
| **06**    | R2 + Vectorize + advanced tests      | RAG, grounding, property/mutation testing      | 02                                 | Tercihli           |
| **07**    | Yjs + Durable Objects                | CRDT, distributed collaboration                | 00 + stabil V1 kaydı               | İleri / opsiyonel  |
| **UI-03** | AI/execution frontend                | Async UX, visual diff, trace viewers           | UI-01; ilgili backend fazı         | Entegrasyona bağlı |
| **UI-04** | Frontend QA + performance            | Testability, Web Vitals, visual regression     | UI-01/UI-02; UI-03 için ek kontrol | Çekirdek           |
| **08**    | Engineering showcase                 | Reproducible architecture + UI demo            | Seçilen fazlar ve UI-04            | Kapanış            |

**Not:** Faz 05'teki temel correlation-ID/telemetry standardı Faz 00'da belirlenir; tam tracing entegrasyonu Faz 05'e bırakılır. Faz 03, Faz 02'den teknik olarak ayrılabilir; sıralama öğrenme ve demo hikâyesi içindir.

---

## Canlı frontend ve kaynak kod incelemesi — V2.1 baz notu

**İnceleme tarihi:** 1 Kasım 2026. **Erişim sınırı:** `https://workflow.oguzsoykan.com/` web üzerinden açıldı ancak JavaScript SPA render çıktısı / canlı ekran görüntüsü bu oturumda elde edilemedi. Aşağıdaki mevcut durum tespitleri, aynı gün GitHub `main` dalındaki kaynak dosyalara ve kullanıcı tarafından sağlanan `PROJECT_OVERVIEW.md` belgesine dayanır; **görsel kusur veya etkileşim hatası yaşandığı iddiası değildir**. İlk iş olarak gerçek Playwright ekran görüntüsü ve tarayıcı testi yapılacak.

| Kaynaktan görülen yapı                                                                                                                     | Portföy için geliştirme fırsatı                                                          | Öncelikli görev         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------- |
| `Editor.tsx`: 3 kolonlu palette / canvas / inspector, çok sayıda toolbar eylemi, seçim + simülasyon + AI entegrasyonu (yaklaşık 554 satır) | Docking/resizable UI, hiyerarşi, command palette, feature sınırları                      | UI104–107, UI401        |
| `styles.css`: 300px / 1fr / 340px grid; 1180px altında daralma; 900px altında dikey yerleşim; tek büyük stil dosyası (yaklaşık 1273 satır) | Mobilde canvas-first drawer, container-query, komponent tokenları ve CSS modülerleştirme | UI102, UI105–106, UI401 |
| `WorkflowCard.tsx`: node tipi metni, rol/koşul özeti ve ~11px handle; simülasyon/hata işaretleri                                           | Dokunma hedefleri, affordance, semantik durum görünürlüğü                                | UI201–202               |
| `Editor.tsx`: yeni adımlar sabit 2 kolonlu koordinat formülü ile ekleniyor; fitView var                                                    | ELK.js auto-layout, zoom to selection, alignment, undo ile deterministik batch           | UI203–204               |
| `ValidationPanel.tsx`: canvas üzerinde her zaman doğrulama kartı; issue tıklaması state seçiyor                                            | Collapse/filter, pan-to-node, problem navigator                                          | UI205–206               |
| `AiPanel.tsx`: öneri bir liste / metin diff şeklinde gösteriliyor, güvenli onay mekanizması var                                            | Salt-okunur graphical diff / before-after preview, agent activity viewer                 | UI301–303               |
| `SimulationPanel.tsx`: form + metinsel trace + onay/ret                                                                                    | Scrubbable timeline, branch highlighting, senaryo karşılaştırma                          | UI207, UI304, UI308     |
| `CloudPanel.tsx`: cloud save ve revisions temeli                                                                                           | Akış listesi, diff/restore ve sahiplikli yönetim UI'ı                                    | UI307                   |
| `Tabs.tsx`: WAI-ARIA, arrow key navigation, mounted hidden panels                                                                          | Var olan klavye/a11y yaklaşımını koruyup yeni drawer/portal/focus akışlarına genişlet    | UI108, UI408            |

**Doğrudan kaynaklar:**

- https://github.com/OguzSoykan/Workflow-Builder
- https://raw.githubusercontent.com/OguzSoykan/Workflow-Builder/main/apps/web/src/editor/Editor.tsx
- https://raw.githubusercontent.com/OguzSoykan/Workflow-Builder/main/apps/web/src/styles.css
- https://raw.githubusercontent.com/OguzSoykan/Workflow-Builder/main/apps/web/src/editor/WorkflowCard.tsx
- https://raw.githubusercontent.com/OguzSoykan/Workflow-Builder/main/apps/web/src/editor/ValidationPanel.tsx
- https://raw.githubusercontent.com/OguzSoykan/Workflow-Builder/main/apps/web/src/account/AiPanel.tsx
- https://raw.githubusercontent.com/OguzSoykan/Workflow-Builder/main/apps/web/src/editor/SimulationPanel.tsx
- https://raw.githubusercontent.com/OguzSoykan/Workflow-Builder/main/apps/web/src/ui/Tabs.tsx

**Ürün yaklaşımı:** Kullanıcı kazanımı / analytics değil, **frontend yetkinliği kanıtı** hedeflenir: erişilebilir editor interaction, graph algorithms, async state, performance engineering, design system, component isolation ve reproducible visual QA. Her task before/after, demo ve ölçüm üretmeli; mevcut V1 ARIA ve dark mode testi bozulmamalıdır.

---

## 1. Çalışma kuralları — her göreve uygulanır

### Definition of Ready (DoR)

Bir görev ancak şu maddeler sağlanınca `READY` olabilir:

1. Problem, teknik hedef ve gösterilecek yetkinlik net.
2. Gerekli repo dosyaları incelendi; mimari etkisi ve bağımlılıklar biliniyor.
3. **Tek PR ile test edilebilir** kapsam ve dışarıda bırakılanlar belirli.
4. Kabul kriterleri ve negatif/hata senaryoları yazılı.
5. Tahmini maliyet, veri güvenliği, feature-flag ve rollback yaklaşımı belirlendi.
6. Uygulanacak ADR gerekiyorsa önce taslak ADR hazır ve kullanıcıca onaylandı.

### Definition of Done (DoD)

Bir görev ancak şu maddeler sağlanınca `DONE` olabilir:

- [ ] Kabul kriterlerinin tamamı doğrulandı; yeni kod için uygun unit/integration/contract/E2E testleri eklendi.
- [ ] `typecheck`, `lint`, `format:check`, ilgili testler, `build`, secret scan ve repo CI kalite işi geçti (mevcut script isimleri koddan doğrulanacak).
- [ ] Güvenlik: owner isolation, auth, input limits, idempotency/replay, sır ve kişisel veri sızıntısı test edildi (ilgiliyse).
- [ ] Negatif/failure path ve rollback çalıştırıldı; prod etkisi veya yeni ücret gerekiyorsa kullanıcı onayı alındı.
- [ ] `ARCHITECTURE.md` / `API_CONTRACT.md` / `DATA_MODEL.md` / ADR / `STATUS.md` ve bu roadmap güncellendi.
- [ ] Küçük commit + PR + diff review tamamlandı; staging smoke veya eşdeğer demo kanıtı raporlandı.
- [ ] **UI değişikliğinde:** ilgili ışık/karanlık ve TR/EN durumları, 390/768/1280/1440 viewport kontrolleri, klavye/focus ve reduced-motion, görsel regresyon snapshot ve önce/sonra ekran görüntüleri raporlandı. (UI-04 tamamlanmadan kontrollü manuel kanıt kabul edilir.)
- [ ] Sonuç raporu: görev ID, değişen dosyalar, gerçek komutlar, test çıktıları, PR/commit, riskler ve sonraki görev.

**Çalışma protokolü:** Codex her seferinde yalnızca **bir** `WB2-...` görevi uygular. Önce repo ve ilgili dokümanları oku → `/plan` düzeyinde kısa plan ve riskleri yaz → kapsamı aşmadan kodla → testleri çalıştır → diff'i `/review` ile incele → dokümanları güncelle → raporla. Onaysız mimari değişikliği, production deploy, ücretli kaynak aktivasyonu veya sonraki faza geçiş **yasak**. Test edilemeyen iş `BLOCKED` kalır; “tamamlandı” denmez.

**İlerleme durumları:** `TODO` / `READY` / `IN_PROGRESS` / `BLOCKED` / `REVIEW` / `DONE` / `DEFERRED`. Aşağıdaki işaret kutuları başlangıçta boş bırakılmıştır.

**Efor gösterimi:** S = küçük, M = orta, L = büyük; süre taahhüdü değildir. Büyük görev uygulamada gerekirse `a/b` alt PR'lara bölünür. **Kısaltılmış bağımlılık yazımı:** `001`, `003–005`, `103–106` gibi ifadeler aynı `WB2-` önekine sahip görev ID'lerini belirtir. `UI101` vb. `WB2-UI101` anlamına gelir; diğer tam ID'ler açıkça yazılır; faz numaraları `Faz 02` biçiminde yazılır.

---

## FAZ 00 — Baseline, mimari sınırlar ve güvenli geliştirme

**Amaç:** V1'i sabitle, deneysel yeteneklerin mevcut production'u veya 5 USD AI bütçesini bozmasını önle.  
**Demo:** V1 kalite özeti + çalışan staging + değişiklikten önce/sonra karşılaştırılabilir ölçümler.  
**Çıkış kapısı:** Baseline kanıtı, güvenlik/maliyet kontrolleri, sandbox izolasyonu ve bütün V1 regresyonları yeşil.

### Görevler

- [x] **WB2-001 — Repo ve V1 baseline denetimi** · P0 · S · Bağımlılık: yok · **DONE** — [BASELINE](BASELINE.md), [WORKLOG](WORKLOG.md#wb2-001)  
      **İş:** Mevcut paket sınırlarını, branch/CI kurallarını, env/secret'ları, 496 unit + 54 E2E + 19/20 AI eval raporlarını **güncel kodda doğrula**; değişen rakamları belgeye işle.  
      **Kabul:** `docs/v2/BASELINE.md` içinde gerçek komutlar, commit, test sonuçları, bilinen açıklar ve V1 API/sözleşme envanteri var.  
      **Test/kanıt:** CI logları ve local run çıktısı; bağımsız staging smoke.

- [ ] **WB2-002 — Ortam izolasyonu ve prod değişiklik güvenliği** · P0 · M · Bağımlılık: 001  
      **İş:** Staging/production'ın paylaştığı Firebase projesini ayırmayı planla ve onaydan sonra uygula; D1/DO/secrets/AI credential ayrımını kontrol et; prod'a dokunmadan mock/staging akışını koru.  
      **Kabul:** Ortamlar arası hesap/kayıt sızıntısı yok; staging test kullanıcısı prod verisine erişemiyor; migration/rollback adımları yazılı.  
      **Test/kanıt:** Cross-environment negatif testleri, smoke ve config fark raporu.

- [ ] **WB2-003 — V2 mimari RFC ve ADR paketini oluşturma** · P0 · M · Bağımlılık: 001  
      **İş:** MCP/agent/execution/queue/telemetry/collaboration veri ve güven sınırlarını çiz; `workflow-contract@v1` geriye uyumluluk kuralını yaz; modüler monolith vs ayrı Worker kararını ADR ile ver.  
      **Kabul:** 1 mimari diyagram, bağımlılık yönleri, hata sınırları ve minimum üç ADR (agent runtime, execution, event outbox) onaylanmış.  
      **Test/kanıt:** Contract ve dependency graph kontrolü; mimari review kaydı.

- [ ] **WB2-004 — Feature flag, kill switch ve maliyet guardrail** · P0 · M · Bağımlılık: 001, 003  
      **İş:** `MCP_ENABLED`, `AGENT_ENABLED`, `SANDBOX_EXECUTION_ENABLED`, `QUEUE_ENABLED`, `RAG_ENABLED`, `COLLAB_ENABLED` gibi kontrollere uygun konfigürasyon tasarla; AI istekleri için ortak rezervasyon/bütçe kararı; ücretli hizmet aktivasyon izni.  
      **Kabul:** Varsayılan prod konfigürasyonunda tüm V2 yetenekleri OFF; flag kapatıldığında yeni iş başlamıyor; existing run davranışı ayrı açıkça tanımlanmış.  
      **Test/kanıt:** Misconfigured env/fail-closed, concurrency ve budget-denied testleri.

- [ ] **WB2-005 — V2 fixture/test altyapısı** · P0 · M · Bağımlılık: 003  
      **İş:** Ortak geçerli/geçersiz akış fixture seti, fake clock, fake provider/queue, auth fixtures, deterministic test IDs ve kontrollü network stubbing oluştur.  
      **Kabul:** Yeni fazların gerçek API veya gerçek AI tokenı harcamadan CI'da test edilebileceği belgelenmiş; fixture'lar v1 sınırlarıyla uyumlu.  
      **Test/kanıt:** Fixture sözleşme testleri; uçtan uca mock smoke.

- [ ] **WB2-006 — Minimum güvenlik ve izlenebilirlik hazırlığı** · P0 · M · Bağımlılık: 001, 004  
      **İş:** CSP/statik güvenlik başlıkları, yeni endpoint'ler için temel rate limiting yaklaşımı ve trace/request ID formatını tanımla; gizlilikte prompt, token, workflow içeriği loglanmama kuralını koru.  
      **Kabul:** Baseline güvenlik açıkları listesi P0/P1 sınıflandı; V2 servislerine aktarılan correlation ID sözleşmesi mevcut; P0 açık için çözüm/erteleme kararı var.  
      **Test/kanıt:** Header ve 429 testleri, log redaction testi, secret scan.

**Faz 00 review:** `docs/v2/PHASE_00_REPORT.md` — baseline, mimari ADR, maliyet-güvenlik kararları, test/CI kanıtları, riskler. **Kullanıcı onayı olmadan Faz 01 başlatılmaz.**

---

## FAZ UI-01 — Design System, Workspace Shell ve Responsive Engineering

**Amaç:** Mevcut üç kolonlu editörü profesyonel bir IDE/workbench hissi veren, responsive ve erişilebilir çalışma alanına dönüştürmek. **Mimarî:** React 19 korunur; CSS tokenları ve mevcut `Tabs` yeniden kullanılır; yeni UI kütüphanesi eklemeden önce ADR'de ölçülü seçim yapılır. **Teknolojiler:** Storybook, TypeScript, CSS design tokens/container queries, isteğe bağlı `react-resizable-panels` ve `cmdk`.
**Sıra:** Faz 00 sonrası **ilk frontend fazı**. MCP beklenmez. **Gate:** 4 viewport + 2 tema + 2 dil, klavye erişimi, V1 E2E ve before/after proof.

- [ ] **WB2-UI101 — Gerçek browser audit ve screenshot baseline** · P0 · S · Bağımlılık: 001  
      **İş:** Playwright ile production'a yalnız read-only ziyarette (anonim), staging'de interaktif smoke yap; 390×844, 768×1024, 1280×800, 1440×900 viewport, TR/EN, light/dark, boş ve örnek workflow durumlarını capture et; navigation, scroll, overlay, focus, touch target ve overflow risklerini puanla. Gerçek ekranda bulunmayan sorunlar `CANNOT_REPRODUCE` olarak işaretlenir.  
      **Kabul:** `docs/v2/FRONTEND_AUDIT.md`, annotated before screenshots, konsol/hata raporu ve doğrulanmış issue listesi; prod üzerinde mutasyon/AI çağrısı yok.  
      **Test/kanıt:** Screenshot klasörü + reproducible Playwright komutları + actual/staging fark notu.

- [ ] **WB2-UI102 — Design tokens ve visual language 2.0** · P0 · M · Bağımlılık: UI101  
      **İş:** Mevcut dark/light CSS değişkenlerini semantik token ve bileşen katmanına ayır; tipografi (12–20+), spacing, z-index, radius, elevation, input/button states, node/status renkleri ve high-contrast rehberini tanımla. Mevcut markayı isteğe bağlı koru, sırf modern görünüm için full rewrite yapma.  
      **Kabul:** Token dokümanı, light/dark parity, en az 10 atomik UI state; V1 renk ve a11y regresyonu yok.  
      **Test/kanıt:** Axe/contrast audit + screenshot matrix.

- [ ] **WB2-UI103 — Storybook ve component workbench** · P0 · M · Bağımlılık: UI102  
      **İş:** Storybook'u mevcut Vite/React yapılandırmasına entegre et; Button/Field/Tabs/Toast/Modal/WorkflowCard/Validation/EmptyState/Panel için mock fixture'lı izole hikâyeler hazırla; production bundle'a Storybook dahil edilmesin.  
      **Kabul:** En az 15 anlamlı story state; hata, loading, disabled, selected, dark/light ve Türkçe/İngilizce örnekleri.  
      **Test/kanıt:** `storybook:build`, story smoke ve npm CI script (komutlar repoda belirlenecek).

- [ ] **WB2-UI104 — Topbar, komut hiyerarşisi ve workflow status bar** · P1 · M · Bağımlılık: UI101, UI102  
      **İş:** Mevcut undo/redo, theme, language, account, health ve kayıt durumunu bilgi mimarisine göre grupla; ana eylemleri öne çıkar, ikinci düzey eylemleri taşınabilir menüye al; durumları netleştir (yerel taslak / bulut / valid / simüle edilebilir). Yanlış kayıt güveni veren metin kullanılmasın.  
      **Kabul:** 390px'te menü taşmıyor; autosave + conflict + error senaryoları doğru; keyboard menu roving focus; `aria-live` spam yok.  
      **Test/kanıt:** E2E toolbar flows, screenshot diff, status matrix.

- [ ] **WB2-UI105 — Resizable/collapsible workspace + focus mode** · P0 · L · Bağımlılık: UI102, UI103  
      **İş:** Sol palet ve sağ inspector'ı resize/hide et; canvas kalan alana responsively uyum sağlasın. Focus mode ve panel ölçüsünün per-device localStorage persist'i; min/max genişlik ve reset; resize sırasında ReactFlow `fitView` pozisyonunu kontrol et.  
      **Kabul:** 1280/1440'ta sürükleme ile boyut, tek klik gizleme/açma; canvas/node positions, selection ve undo history korunur.  
      **Test/kanıt:** Pointer + keyboard resize E2E, reload persistence, screenshot snapshots.

- [ ] **WB2-UI106 — Canvas-first mobile/tablet workbench** · P0 · L · Bağımlılık: UI104, UI105  
      **İş:** 900px altındaki mevcut stacking yerine canvas'ı odakta tutan responsive shell; açılır palette/inspector bottom sheet veya drawer, erişilebilir close/focus restore, gesture ve safe-area desteği. 768 tablet ile 390 mobile farklı layout; keyfi touch gesture ile edge silme olmamalı.  
      **Kabul:** Yatay sayfa taşması yok; tuval kullanılabilir; drawer focus trap/escape; en az 44px hedef için gerekli istisnalar belgeli; masaüstü davranışı aynı.  
      **Test/kanıt:** Mobile Playwright emulation, screen-reader manual check, touch/pointer test.

- [ ] **WB2-UI107 — Command palette ve keyboard shortcuts catalog** · P1 · M · Bağımlılık: UI104, UI105  
      **İş:** Cmd/Ctrl+K command palette: node ekle, örnek aç, fit view, simülasyon paneline geç, undo/redo, tema değiştir; eylemler gerçek reducer üzerinden yürür. Halihazırdaki Ctrl/Cmd+Z ve form native undo çakışmaları engellenir.  
      **Kabul:** Komutlar çalışır, disabled action açıklanır, önerilen keyboard shortcut'lar tek merkezi registry'den yönetilir, TR/EN tutarlı.  
      **Test/kanıt:** Keyboard E2E, no input-capture regression, axe focus test.

- [ ] **WB2-UI108 — Demo/presentation mode ve ilk etkileşim rehberi** · P1 · M · Bağımlılık: UI103, UI105, UI107  
      **İş:** Portföy için tek tıkla seeded örnek açma, kısa guided walkthrough, yan panelleri gizleyip simülasyon yolunu görsel gösteren presentation mode; gerçek veri/production state'i otomatik ezme.  
      **Kabul:** Demo sıfır harici API ve sıfır AI maliyetiyle çalışır; taslak değiştirme öncesi açık onay + geri al; rehber tüm klavye kullanıcılarına erişir.  
      **Test/kanıt:** 3 dakikalık scripted demo + E2E + screenshots.

**UI-01 gate:** `docs/v2/PHASE_UI_01_REPORT.md`: gerçek ekran bulguları, design-system/state örnekleri, responsive görüntüler, Storybook erişimi, V1 regresyonu, before/after ve **kullanıcı onayı**.

---

## FAZ UI-02 — Advanced Graph Editing ve Canvas Interaction Engineering

**Amaç:** Workflow Builder'ın görsel editörünü portföyde ayrı bir frontend mühendisliği gösterisine dönüştürmek. **Teknolojiler:** `@xyflow/react` (koru), ELK.js (seçimli), saf layout adapter'ı, accessible gestures, TypeScript reducer history. **Bağımlılık:** UI-01; MCP/agent beklemez.

- [ ] **WB2-UI201 — WorkflowCard görsel standardı ve state matrix** · P0 · M · Bağımlılık: UI102, UI103  
      **İş:** Start/Approval/Condition/End kartlarını tutarlı type icon, açıklayıcı hierarchy, status ve selected/invalid/active/visited state ile yeniden tasarla. Değişken uzunlukta TR/EN metinler, yüksek zoom ve 0.2x zoom test edilsin.  
      **Kabul:** Node semantiği şekil+metin ile anlaşılır; yalnız renk kodlaması yok; node config, JSON, port mantığı değişmez.  
      **Test/kanıt:** Storybook screenshot 4 node × 5 durum × 2 tema; contrast/axe kontrolü.

- [ ] **WB2-UI202 — Edge/handle affordance ve invalid connection feedback** · P0 · M · Bağımlılık: UI201  
      **İş:** `WorkflowCard` handle/label konumu, hover/focus area, source/target role, connection drag preview ve invalid connection nedeni; mouse ve touch davranışını tasarla. React Flow bağlantı denetimi otorite olmaya devam eder, UI keyfi edge oluşturmaz.  
      **Kabul:** Uygun bağlantı görselce anlaşılır, invalid drop kullanıcıya nedeni açıklar; sadece mobil CSS ile handle büyütülmez, hitbox tekniği testli.  
      **Test/kanıt:** Valid/invalid mouse+touch connect E2E, keyboard accessible fallback, duplicate edge negatif test.

- [ ] **WB2-UI203 — ELK.js auto-layout ve layout determinism** · P0 · L · Bağımlılık: UI201, UI105  
      **İş:** Yeni `auto layout` komutu; graph'tan saf node/edge ölçüleri ile ELK adapter, L→R / T→B düzenleme, collision/branch spacing, existing user positions korunması için undo; CPU ağır ise Web Worker spike. Node order deterministic ve v1 contentHash positional exclusion korunur.  
      **Kabul:** 1/10/50 node fixture'larında overlap yok, sonuç tekrar çalıştırmada stabil, reducer'da tek undo checkpoint, hash değişmiyor; ağır yük UI'yı kilitlemiyor.  
      **Test/kanıt:** Golden node positions, repeatability benchmark, 50-node layout screenshot.

- [ ] **WB2-UI204 — Power editing: multi-select, align, duplicate, keyboard move** · P1 · L · Bağımlılık: UI203  
      **İş:** Box selection, copy/paste/duplicate (yeni ID ve güvenli edge kopyalama), hizala/dağıt, grid snap ve klavyeyle küçük hareket; maximum 50 node ve 100 edge sınırlarını reducer/contract üzerinde koru.  
      **Kabul:** Tüm çoklu eylemler atomik history entry ve undo/redo ile çalışır; seçim korunur; v1 import/export değişmez.  
      **Test/kanıt:** Property-based ID uniqueness, edge integrity, keyboard E2E ve 50-node sınır testleri.

- [ ] **WB2-UI205 — Contextual inspector ve canvas navigation** · P1 · M · Bağımlılık: UI105, UI201  
      **İş:** Seçili node / edge / workflow seviyelerine göre progressive inspector; listeden seçilen node için pan-to-focus; zoom-to-selection; mevcut form draft'ının kaybolacağı durumlarda açık karar; hierarchy breadcrumb.  
      **Kabul:** Workflow taslağının veya input'unun sessiz kaybı yok; panel gizliyken seçim düzgün korunur; focus ve scroll restore işler.  
      **Test/kanıt:** Selection pan E2E, unsaved form confirm, keyboard focus smoke.

- [ ] **WB2-UI206 — Validation problem navigator** · P0 · M · Bağımlılık: UI205  
      **İş:** Canvas üzerindeki mevcut doğrulama panelini collapse/expand ve filtreli issue hub'a çevir; severity/kategori filtresi, node focus+highlight ve auto pan, gereksiz canvas örtüşmesini azalt; core validator semantiğini değiştirme.  
      **Kabul:** 0 / 1 / çoklu issue testleri, doğru node/edge focus, mobilden erişim, en az biri sorun çözülünce state güncellenmesi; error hiding yok.  
      **Test/kanıt:** E2E invalid → focus → fix → valid; axe/live-region test.

- [ ] **WB2-UI207 — Simulation playback visualization (local only)** · P1 · M · Bağımlılık: UI201, UI205  
      **İş:** Var olan deterministic `SimulationRun.trace` üzerinden step scrubber, current/visited highlight, path playback hızı, pause/reset ve approval at pause. Gerçek e-posta/işlem gönderildiği izlenimi vermeden local simulation olarak etiketle.  
      **Kabul:** UI replay simülatör sonucunu değiştirmez; stale-hash uyarısı ve Ctrl+Z etkileşimi korunur; reduced-motion desteği var.  
      **Test/kanıt:** Golden trace vs playback step, approval/rejected path E2E, a11y.

- [ ] **WB2-UI208 — Canvas export ve before/after showcase snapshots** · P1 · M · Bağımlılık: UI203, UI207  
      **İş:** Seçilen akış için temiz PNG/SVG export veya güvenli printable snapshot (UI-only; JSON export'un yerini almaz), background tema ve DPI seçenekleri; import/export için kullanıcı kimliği/secret gösterimi yok. README için artefact baseline örnekleri.  
      **Kabul:** Büyük grafikte clipping olmadan export; görsel çıktı workflow contract'ı değiştirmez; import edilen riskli SVG çalıştırılmaz.  
      **Test/kanıt:** Golden screenshot + large canvas export smoke + CSP/security check.

**UI-02 gate:** `docs/v2/PHASE_UI_02_REPORT.md`: graph düzenleme before/after, ölçülen yerleşim kalitesi, keyboard/touch senaryoları, property test sonuçları, V1 regresyonu ve **kullanıcı onayı**.

---

## FAZ 01 — MCP Server ve AI Tool Integration

**Amaç:** Workflow Builder'ın mevcut doğrulama/simülasyon/kayıt yeteneklerini MCP üzerinden standart, yetkili ve güvenli şekilde dış AI istemcilerine açmak.  
**Öğrenme kanıtı:** MCP transport, JSON schema/Zod, auth, owner scope, approval, protocol/contract testing.  
**Demo:** Bağlı bir MCP istemcisi mevcut workflow'u alır, doğrular, örnek girdilerle simüle eder; değiştirme isteği önce proposal olarak döner.  
**Çıkış kapısı:** Read-only ve onay gerektiren write/proposal yüzeyleri uçtan uca çalışır; unauthorized/replay/cross-user negatif testleri geçer.

- [ ] **WB2-101 — MCP SDK/transport uyumluluk spike'ı** · P0 · S · Bağımlılık: 003–005  
      **İş:** Güncel stabil TypeScript MCP SDK, Streamable HTTP, Workers/Hono runtime uyumu ve stateless/stateful davranışı araştır; SDK versiyonunu sabitle; Node-only zorunluluk varsa ayrı adaptör ADR öner.  
      **Kabul:** Staging'de `initialize`, `tools/list`, `tools/call` smoke veya gerekçeli alternatif mimari; deprecated transport zorunlu değil.  
      **Test/kanıt:** Protokol uyumluluk testi ve dependency/runtime notu.

- [ ] **WB2-102 — MCP tool katalogu ve input/output şemaları** · P0 · M · Bağımlılık: 101  
      **İş:** `workflow_list`, `workflow_get`, `workflow_validate`, `workflow_simulate`, `workflow_generate_proposal`, `workflow_edit_proposal` araçları için Zod giriş/çıkış, errors, açıklamalar ve izin sınıfları tasarla.  
      **Kabul:** Araç şemaları ve hataları sürümlü; bilinmeyen parametre, büyük payload ve uygunsuz node geçmiyor; tool'lar core'un public API'sini kullanıyor.  
      **Test/kanıt:** JSON schema snapshot/contract, bad-input ve sınır testleri.

- [ ] **WB2-103 — Read-only MCP araçları** · P0 · M · Bağımlılık: 102  
      **İş:** Listele/getir/doğrula/simüle et araçlarını mevcut `workflow-core` ve owner-scoped repository üzerinden implemente et; simülasyon yalnız hesaplanan sonuç döndürsün.  
      **Kabul:** Aynı girdiye V1 simulator ile semantik olarak aynı sonuç; MCP tool çağrısı kalıcı workflow değişikliği veya dış sistem etkisi oluşturmuyor.  
      **Test/kanıt:** Cross-runtime golden vectors; readonly ve determinism testleri.

- [ ] **WB2-104 — MCP authentication/authorization** · P0 · L · Bağımlılık: 101, 103  
      **İş:** Remote MCP erişim modelini ve token audience/scope doğrulamasını güncel spesifikasyona göre tasarla; Firebase login jetonunu üçüncü taraf istemciye körlemesine devretme; owner kimliğini server-side çözümle.  
      **Kabul:** Unauthenticated, yanlış audience/scope, farklı kullanıcı, süre dolmuş token ve cross-tenant erişim reddediliyor; least-privilege belgeli.  
      **Test/kanıt:** Auth integration, expiry, owner-scope ve privilege-escalation testleri.

- [ ] **WB2-105 — MCP proposal ve explicit approval akışı** · P0 · M · Bağımlılık: 102, 104  
      **İş:** Oluştur/düzenle araçları doğrudan save yapmasın; teklif ID, base hash, patch/diff ve TTL döndürsün; onaylı uygulama endpoint'i kimlik, revision ve idempotency doğrulasın.  
      **Kabul:** Eski/değişmiş belgeye uygulanamaz; ikinci replay ikinci sürüm üretmez; proposal reddedilince kalıcı veri değişmez.  
      **Test/kanıt:** Stale hash, rejected approval, duplicate application ve concurrency testleri.

- [ ] **WB2-106 — MCP güvenlik sertleştirme** · P0 · M · Bağımlılık: 104, 105  
      **İş:** Tool allowlist, payload ve rate limit, Origin/CSRF riskleri (transport'a uygun), sonuç redaction, prompt/tool injection sınırları ve structured errors uygula.  
      **Kabul:** Uygun olmayan tool veya payload ile veri yazılamıyor; gizli alan/token loglanmıyor; hata mesajı stack içermiyor.  
      **Test/kanıt:** Negatif tool-call matrisi, secret scan, protokol fuzz/smoke.

- [ ] **WB2-107 — Gerçek MCP istemcisiyle demo ve dokümantasyon** · P1 · M · Bağımlılık: 103–106  
      **İş:** En az bir gerçek MCP istemcisinde kurulum, bağlantı, doğrulama, simülasyon ve onaylı teklif akışını göster; mock sağlayıcıyla tekrar üretilebilir demo hazırla.  
      **Kabul:** `docs/v2/MCP.md` araç kataloğu, kurulum, örnek istek/yanıt, güven sınırları, GIF/video senaryosu ve troubleshooting içeriyor.  
      **Test/kanıt:** Staging E2E + istemci interoperability kaydı.

**Faz 01 gate:** MCP uçtan uca demo, tool contract testleri, sıfır izinsiz yazma, yeni ücret yok/onaylı, ADR + güvenlik değerlendirmesi. `docs/v2/PHASE_01_REPORT.md` → **kullanıcı onayı**.

---

## FAZ 02 — Agentic Workflow Designer

**Amaç:** Tek seferlik AI önerisini kontrollü bir **tool-using agent** akışına dönüştürmek; eski AI hattını fallback/benchmark olarak korumak.  
**Öğrenme kanıtı:** OpenAI Agents SDK, tool orchestration, guardrails, human approval, token budgeting, evals.  
**Demo:** Agent taslak üretir → validate eder → gerektiğinde sınırlı düzeltme yapar → simülasyon sonuçlarını sunar → kullanıcı onaylamadan hiçbir şey yazmaz.  
**Çıkış kapısı:** Agent kalitesi/latency/maliyet baseline ile karşılaştırılmış; worst-case çağrı ve bütçe sınırları kanıtlı.

- [ ] **WB2-201 — Agent runtime ve SDK uygunluk spike'ı** · P0 · S · Bağımlılık: 107  
      **İş:** `@openai/agents` runtime gereksinimlerini Cloudflare Workers uyumluluğunda test et; deploy edilemezse küçük ayrık runtime veya mevcut Responses API üzerinde tool loop ADR'si hazırla.  
      **Kabul:** CI + staging build çalışıyor veya net, onaylı alternatif var; V1 prod AI endpoints etkilenmiyor.  
      **Test/kanıt:** Runtime smoke, secret isolation ve ADR.

- [ ] **WB2-202 — Agent tool adapter ve yetki sınırı** · P0 · M · Bağımlılık: 201, 102  
      **İş:** Generate/validate/simulate/diff işlemlerini agent tool'larına bağla; MCP yolunun aynı `workflow-core` fonksiyonlarına dayandığını koru; save tool'u otomatik izinli olmasın.  
      **Kabul:** Bütün tool girdileri/çıktıları strict schema; yetkisiz erişim engelli; tool failure agent'ı güvensiz yazmaya yöneltmiyor.  
      **Test/kanıt:** Tool-contract, denial ve malformed response testleri.

- [ ] **WB2-203 — Planner + clarification + proposal pipeline** · P0 · L · Bağımlılık: 202  
      **İş:** Belirsiz gereksinim tespiti, kullanıcıdan tekil netleştirme, valid workflow önerisi ve mevcut diff/preview üzerinden onay döngüsü kur; konuşma durumunu süre/boyut sınırına bağla.  
      **Kabul:** Eksik iş kuralı uydurulmadan netleştirme istenir; gelen yanıtla öneri sürdürülür; UI reddet/geri al uyumlu.  
      **Test/kanıt:** Belirsiz, çelişkili ve kesin taleplerde E2E senaryoları.

- [ ] **WB2-204 — Validate → repair → simulate döngüsü** · P0 · M · Bağımlılık: 202, 203  
      **İş:** Agent doğrulama hatalarını structured feedback olarak alıp maksimum N deneme yapabilsin; fail-closed timeout ve döngü limiti; simülasyon çıktıları teklife iliştirilsin.  
      **Kabul:** Max-step, max-repair, time/token limit aşıldığında gerekçeli başarısızlık; asla geçersiz workflow uygulanmıyor.  
      **Test/kanıt:** Sonsuz döngü, invalid patch ve no-progress senaryoları.

- [ ] **WB2-205 — Guardrails ve human-in-the-loop kontrolü** · P0 · M · Bağımlılık: 203  
      **İş:** Input/tool/output guardrails, tool allowlist, prompt injection senaryoları; user-owned doc erişimi; her kalıcı değişiklikte explicit application confirmation.  
      **Kabul:** Zararlı tool çağrısı bloke; agent kendi onayını veremiyor; her kayıtta kullanıcı/versiyon/teklif bağı kuruluyor.  
      **Test/kanıt:** Adversarial prompts, cross-user, stale-revision ve replay testleri.

- [ ] **WB2-206 — Agent maliyet ve concurrency accounting** · P0 · M · Bağımlılık: 004, 204  
      **İş:** Multi-turn/tool-loop rezervasyonunun mevcut AiBudget DO ile entegrasyonunu tasarla; 5 USD/4,50 USD global hard-stop korunur; rate/quota, idempotency ve unknown-cost muhasebesi uygulanır.  
      **Kabul:** Alt bütçe ve istek başına max-cost aşılamıyor; eşzamanlı isteklerin rezervasyonu overbook yapmıyor; sağlayıcı arızasında fail-closed.  
      **Test/kanıt:** Parallel request, network timeout, double-charge ve unknown-cost testleri.

- [ ] **WB2-207 — Agent eval seti ve benchmark** · P0 · L · Bağımlılık: 203–206  
      **İş:** 20 mevcut senaryoyu sürümlü seed olarak koru; en az 80 ek/variant vaka ile 100-vakalık dataset; başarı, şema/doğrulama, doğru dal, maliyet, latency ve tool-call sayısını ölç.  
      **Kabul:** Agent vs mevcut single-shot baseline aynı test setinde raporlanıyor; model/prompt sürümleri kaydediliyor; gerçek AI evaluasyonu ancak bütçe ve kullanıcı onayıyla.  
      **Test/kanıt:** CI'da deterministic mock eval; onaylı manuel canlı eval çıktısı.

- [ ] **WB2-208 — Agent trace, arayüz ve fallback** · P1 · M · Bağımlılık: 206, 207  
      **İş:** Kullanıcıya plan/adım/validasyon/diff göster; gizli içeriği telemetriye aktarmadan güvenli trace metadata üret; flag kapalıyken eski AI endpoint aynı çalışsın.  
      **Kabul:** Agent kapatıldığında V1 AI geri geliyor; debug alanında token/prompt/PII yok; hata kullanıcıya anlaşılır yansıyor.  
      **Test/kanıt:** A/B smoke, redaction, failover ve erişilebilirlik E2E.

**Faz 02 gate:** 100-vaka eval raporu, guardrail/rate/bütçe testleri, onaylı yazma ve V1 fallback; `docs/v2/PHASE_02_REPORT.md` → **kullanıcı onayı**.

---

## FAZ 03 — Durable Sandbox Workflow Execution

**Amaç:** V1 yerel simülasyonunun yanında gerçek durum saklayan fakat **yalnız sandbox/mock yan etkilerine** sahip bir yürütme motoru göstermek.  
**Öğrenme kanıtı:** State machine, persisted execution, retries, human-in-the-loop, timeouts, idempotency, recovery.  
**Demo:** Bir satın alma süreci başlar, onay bekler, farklı bir oturumda onaylanır/reddedilir, Worker yeniden başlasa da yürütme devam eder; event timeline incelenir.  
**Çıkış kapısı:** Bir yürütme kayıp/çift terminal sonuç üretmeden tamamlanır; V1 simulation değişmeden kalır.

- [ ] **WB2-301 — Execution domain contract ve güvenlik ADR'si** · P0 · M · Bağımlılık: 003  
      **İş:** `ExecutionRun`, `ExecutionEvent`, `ExecutionStatus` (queued/running/waiting/completed/rejected/failed/cancelled), node visitor ve event version şemalarını tasarla. **V1 workflow JSON'u değiştirme.**  
      **Kabul:** Node çıkış semantiği, no-loop, max-step, immutable snapshot hash, actor/owner scope, external side-effect yasağı ve migration stratejisi yazılı.  
      **Test/kanıt:** State-transition table + invariant unit tests.

- [ ] **WB2-302 — Run/event journal ve veritabanı migration'ları** · P0 · M · Bağımlılık: 301  
      **İş:** D1'de owner-scoped `execution_runs`, `execution_events`, `approval_tokens` (güvenli özet/hash) gibi tablolar; run snapshot ve idempotency key, event sequence; atomiklik stratejisini kur.  
      **Kabul:** Her event belirli run'a ve sıra numarasına bağlı; başka kullanıcı read/write yapamıyor; migration geriye uyumlu.  
      **Test/kanıt:** Migration smoke, concurrency, owner-scope, unique constraint testleri.

- [ ] **WB2-303 — Cloudflare Workflows runner iskeleti** · P0 · L · Bağımlılık: 301, 302  
      **İş:** Instance lifecycle, checkpoint ve safe interpreter yaz; V1 grafiğinin kopyasını immutable run snapshot olarak yorumla; yalnız `start/condition/approval/end` destekle.  
      **Kabul:** Max 50 node, her geçiş bounded, invalid/stale workflow çalıştırılmıyor; tekrarlanan step idempotent; local mock ile deterministik.  
      **Test/kanıt:** Branch, rejected/completed, timeout, restart/retry unit + integration.

- [ ] **WB2-304 — Bekleyen onay ve dış olay ile devam** · P0 · L · Bağımlılık: 303  
      **İş:** Cloudflare Workflows external event/wait yeteneğiyle approval bekleme; server-side doğrulanmış, tek kullanımlık, zaman aşımı olan karar mekanizması; gerçek e-posta gönderimi yok.  
      **Kabul:** Yetkisiz, ikinci kez verilen, süresi dolmuş ya da yanlış run'a ait karar reddedilir; bekleyen run devam eder/terminal olur.  
      **Test/kanıt:** Replay, duplicate approval, browser close/reopen, expired token, race tests.

- [ ] **WB2-305 — Retry, cancellation ve recovery semantiği** · P0 · M · Bağımlılık: 303, 304  
      **İş:** Recoverable/nonrecoverable hata ayrımı, bounded retry/backoff, cancellation, deadline ve event journal tutarlılığı tasarla; `exactly-once` garanti iddia etme.  
      **Kabul:** Terminal state immutable; tekrar gelen olay en fazla bir mantıksal ilerleme üretir; başarısızlık nedenini kaydeder.  
      **Test/kanıt:** Fault injection, timeout, partial write, duplicate delivery, rollback scenarios.

- [ ] **WB2-306 — Run API ve erişilebilir timeline UI** · P1 · M · Bağımlılık: 302–305  
      **İş:** Create/list/get/cancel/decide endpoints ile run status, event timeline ve approval paneli ekle; tüm URL'ler owner scoped ve request-ID'li.  
      **Kabul:** UI sandbox uyarısı açık; V1 simülatörüne dokunulmamış; geçmiş run aynı snapshot/hash üzerinden görüntüleniyor.  
      **Test/kanıt:** API contract, E2E ve axe erişilebilirlik senaryoları.

- [ ] **WB2-307 — Workflow lifecycle güvenlik ve stres testleri** · P0 · M · Bağımlılık: 305, 306  
      **İş:** Eşzamanlı başlatma, çakışmalı karar, iptal-onay yarışı, hizmet yeniden başlaması ve bekleyen run sınırlarını test et; hizmet kotası uygula.  
      **Kabul:** Sahipsiz run ve çift terminal sonuç bulunmuyor; limit aşımı kontrollü hata; veri sızıntısı yok.  
      **Test/kanıt:** Deterministic concurrency suite ve kontrollü load.

- [ ] **WB2-308 — Dağıtık yürütme showcase demo** · P1 · S · Bağımlılık: 306, 307  
      **İş:** En az 3 run demo senaryosu (onay, ret, timeout), event timeline, fail/retry izleri ve mimari diyagram hazırla; V1 ile V2 yürütme farkını yaz.  
      **Kabul:** Yeni başlayan geliştirici README ile mock ortamda demo tekrar edebiliyor; ücretsiz/ücretli kaynak koşulları belgeli.  
      **Test/kanıt:** Demo runbook + kaydedilmiş staging smoke çıktısı.

**Faz 03 gate:** 3 kanıtlanabilir run, kalıcı event journal, HITL/onay güvenliği, recovery ve no-double-terminal testleri; `docs/v2/PHASE_03_REPORT.md` → **kullanıcı onayı**.

---

## FAZ 04 — Event-Driven Architecture ve Connectors

**Amaç:** Sandbox yürütmesinden üretilen olayları kuyruk üzerinden ayrı tüketicilere iletmek; güvenilir teslimat ve idempotent işleme göstermek.  
**Öğrenme kanıtı:** Event contract, outbox, at-least-once delivery, DLQ, redrive, mock integrations; opsiyonel .NET.  
**Demo:** Onaylandı olayı kaydedilir → outbox → queue → mock webhook connector → sonuç audit log; consumer geçici arızada retry, kalıcı arızada DLQ.  
**Çıkış kapısı:** Kayıp/çift işlem koşulları belgelenmiş ve test edilmiş; hiçbir gerçek ERP/ödeme/e-posta yan etkisi yok.

- [ ] **WB2-401 — Domain event contracts ve versiyonlama** · P0 · M · Bağımlılık: 301  
      **İş:** `run.started`, `approval.requested`, `approval.decided`, `run.completed`, `run.failed` gibi allowlist event türleri, eventId/runId/ownerId/schemaVersion/idempotencyKey; PII-minimal payload oluştur.  
      **Kabul:** Consumer bilinmeyen event versiyonunu kontrollü reddeder; her event validate edilir; ham workflow/prompt event payload'ında yok.  
      **Test/kanıt:** Contract snapshots, version-compatibility ve invalid payload testleri.

- [ ] **WB2-402 — Transactional outbox ve publisher** · P0 · L · Bağımlılık: 302, 401  
      **İş:** Run state transition ve outbox kaydını tutarlı işlem sınırına yerleştir; ayrı dispatcher yayımlar; tekrar teslimde aynı eventId korunur; failure/recovery stratejisini yaz.  
      **Kabul:** DB write başarılı, Queue publish başarısız olduğunda olay tekrar denenebilir; event kaybı sessiz değil; duplicate publish tolere edilir.  
      **Test/kanıt:** DB/queue yarı arıza, dispatcher crash, duplicate dispatch integration testleri.

- [ ] **WB2-403 — Cloudflare Queues producer/consumer** · P0 · M · Bağımlılık: 402  
      **İş:** Staging queue, consumer binding, concurrency/batch/retry sınırları ve queue-level kill switch kur; CI için fake queue adaptörü oluştur.  
      **Kabul:** Bir olay tüketiciye gider; başarılı ack ve başarısız retry davranışı kanıtlı; production kaynağı onaysız oluşturulmaz.  
      **Test/kanıt:** Producer/consumer contract, retry integration ve staging smoke.

- [ ] **WB2-404 — Mock Connector SDK / webhook adapter** · P1 · M · Bağımlılık: 403  
      **İş:** `Connector` arayüzü (validate/execute/result), sandbox webhook receiver veya fake ticket service; timeout, backoff ve dış domain allowlist; SSRF koruması.  
      **Kabul:** Sistem yalnız onaylı mock hedefe çağrı yapar; response/timeout structured kayıtlı; gerçek üçüncü taraf işlemi yok.  
      **Test/kanıt:** Mock endpoint, SSRF/denylist, timeout ve contract testleri.

- [ ] **WB2-405 — DLQ, quarantine ve redrive aracı** · P0 · M · Bağımlılık: 403, 404  
      **İş:** Poison message ve max retry sonrası DLQ; güvenli admin-only list/detail/redrive; redrive öncesi schema validation, dry-run ve audit log.  
      **Kabul:** Yanlış mesaja otomatik sonsuz retry yok; redrive çift yan etki oluşturmuyor; erişim sınırlı.  
      **Test/kanıt:** Retry exhaustion, poison payload, replay/redrive, unauthorized testleri.

- [ ] **WB2-406 — Opsiyonel .NET Connector Worker** · P2 · L · Bağımlılık: 401–404  
      **İş:** Mevcut stack'e değer göstermek için izole ASP.NET Core webhook/mock connector servisi kur; shared event JSON schema, idempotent consumer ve OpenTelemetry trace propagation uygula. **Mikroservis sırf sayıyı artırmak için zorunlu değil.**  
      **Kabul:** TypeScript producer ve .NET consumer arasında aynı contract fixtures geçer; servis kapalıyken ana uygulama çalışır.  
      **Test/kanıt:** Cross-language contract, mock delivery, failure/recovery; barındırma maliyeti ADR'si.

- [ ] **WB2-407 — Reliability test ve olay akışı demosu** · P0 · M · Bağımlılık: 405  
      **İş:** En az bir transient, bir permanent ve bir duplicate delivery senaryosu; queue drain, poison ve DLQ redrive için runbook hazırla.  
      **Kabul:** Mantıksal tek teslim sonucu, audit trace ve yeniden çalıştırılabilir demo; hata anında olayın nerede olduğunu açıklayan kayıt mevcut.  
      **Test/kanıt:** CI fake queue + staging smoke + failure matrix.

**Faz 04 gate:** End-to-end event, outbox consistency, DLQ/redrive, duplicate-tolerant consumer ve false-positive side-effect yok; `docs/v2/PHASE_04_REPORT.md` → **kullanıcı onayı**.

---

## FAZ 05 — Observability, Infrastructure as Code ve Reliability

**Amaç:** Projeyi sadece çalıştırabilmek değil; neden/nasıl başarısız olduğunu görmek ve altyapıyı güvenilir şekilde yeniden üretebilmek.  
**Öğrenme kanıtı:** OTel-compatible telemetry, trace propagation, SLO, incident runbook, Terraform, drift control, CI/CD.  
**Demo:** Bir sandbox request'in API → agent/runner → queue → connector yolculuğu tek correlation ID ile takip edilir; Terraform plan değişiklikleri PR'da gözden geçirilir.  
**Çıkış kapısı:** İçerik gizliliği bozulmadan trace/log/metric, alarm, reproducible staging ve kontrollü rollback.

- [ ] **WB2-501 — OTel/exporter ve veri saklama ADR'si** · P0 · M · Bağımlılık: 006, 02–04'ün ilk uçları  
      **İş:** Workers telemetry export yetenekleri ve mevcut SDK'ların compatibility durumunu doğrula; vendor-neutral tracing standardı, sampling/retention, maliyet ve hangi span attribute'larının yasak olduğunu belirle.  
      **Kabul:** Prompt, e-posta, ID token, ham workflow, connector secret trace'e yazılmıyor; exporter başarısızlığı API'yi çökertmiyor.  
      **Test/kanıt:** Redaction tests ve staging export smoke.

- [ ] **WB2-502 — End-to-end trace/correlation propagation** · P0 · L · Bağımlılık: 501  
      **İş:** `traceparent`/correlation ID standardı ve safe span attributes ile HTTP/MCP/agent/Workflows/Queue sınırlarını ilişkilendir; Queue'da async trace linkage tasarla.  
      **Kabul:** Bir run ID üzerinden web/API/run/event/connector'ı takip etmek mümkün; kopan parent-child ilişkileri belgeli.  
      **Test/kanıt:** Trace propagation contract ve example distributed trace.

- [ ] **WB2-503 — Grafana veya eşdeğer metrik dashboard'u** · P1 · M · Bağımlılık: 502  
      **İş:** API latency/error rate, agent calls/cost, validation rejects, pending run, queue retries/DLQ, consumer duration için minimum dashboard; test verisiyle örnek ekran görüntüleri.  
      **Kabul:** Hangi grafiğin hangi kaynak metrikten geldiği yazılı; yanlış tamlık/örnekleme iddiası yok.  
      **Test/kanıt:** Metrics snapshots + 3 hata senaryosunda dashboard doğrulama.

- [ ] **WB2-504 — Alarm, SLO ve incident runbook** · P1 · M · Bağımlılık: 503  
      **İş:** P0/P1 incident sınıfları, AI bütçe sınırı, DLQ büyümesi, execution stuck, elevated 5xx alarm kuralı ve emergency flags; status page gerekmiyor.  
      **Kabul:** Kontrollü test olayı alarm üretir; runbook 'tespit → etkisini sınırla → geri al → doğrula' adımlarını içerir.  
      **Test/kanıt:** Game day / alert drill; eylem ve süre kaydı.

- [ ] **WB2-505 — Terraform kaynak envanteri ve import-safe pilot** · P0 · L · Bağımlılık: 002, 003  
      **İş:** Terraform Cloudflare provider için yönetilecek kaynakları seç; mevcut prod kaynaklarını recreate etmeksizin import/plan workflow'u tasarla; state backend ve least-privilege CI token politikası belirle.  
      **Kabul:** Önce staging kaynakları yönetiliyor; `terraform plan` beklenmedik silme/değiştirme göstermiyor; sırlar repoya veya state çıktısına açık yazılmıyor.  
      **Test/kanıt:** `fmt`, `validate`, plan artifact ve drift demonstration; prod apply yalnız onaylı.

- [ ] **WB2-506 — Deploy pipeline ve rollback tatbikatı** · P0 · M · Bağımlılık: 505  
      **İş:** CI → staging plan/dry-run → manuel approval → deploy → smoke → rollback adımlarını güvenli otomasyonla bağla; D1 migration rollback sınırlamalarını belge.  
      **Kabul:** Staging deploy/rollback tatbikatı kanıtlı; migration ile code rollback'in farklı riskleri tarif edilmiş.  
      **Test/kanıt:** Dry-run, staging deploy, smoke ve rollback raporu.

- [ ] **WB2-507 — Load, latency ve fault-injection raporu** · P1 · M · Bağımlılık: 502–506  
      **İş:** Sınırlı concurrency altında MCP throughput, agent timeout, runs queue latency ve connector retry ölç; zero-cost/mock önce; güvenli load sınırları koy.  
      **Kabul:** Başlangıç/bitiş metrik karşılaştırması, darboğazlar ve capacity assumptions var; prod'a plansız yük testi yok.  
      **Test/kanıt:** Reproducible load script ve fault-injection sonuçları.

**Faz 05 gate:** Tek correlation ID ile en az bir dağıtık yolculuk, güvenli telemetry, dashboard/alert tatbikatı, staging IaC plan + rollback; `docs/v2/PHASE_05_REPORT.md` → **kullanıcı onayı**.

---

## FAZ 06 — Document-to-Workflow RAG ve Advanced Testing

**Amaç:** Belgelerden kaynaklı workflow tasarımı göstermek; AI ve graph core'u property/mutation testing ile zorlu koşullarda kanıtlamak.  
**Öğrenme kanıtı:** R2 ingestion, embeddings, Vectorize, citation grounding, RAG evaluation, property-based ve mutation testing.  
**Demo:** Sentetik satın alma prosedürü PDF'i üzerinden akış taslağı ve dayanak bölümleri; yanında AI hataları/graph invariant'larını otomatik yakalayan test raporu.  
**Çıkış kapısı:** Citation-grounded RAG, owner isolation, cost guard ve güçlü test başarı raporu.

- [ ] **WB2-601 — Doküman güven sınırı ve R2 ingestion** · P0 · L · Bağımlılık: 004, 202  
      **İş:** Önce sentetik PDF/TXT belgeleri için upload/parsing pipeline; R2 object ownership, hash, dosya boyutu/format limiti, mime sniffing, retention/delete ve parser izolasyonu.  
      **Kabul:** Zararlı/çok büyük belge reddedilir; başka kullanıcının belgesi görünmez; içerik production loglarına düşmez.  
      **Test/kanıt:** Upload, parser failure, ACL, oversized/malformed document tests.

- [ ] **WB2-602 — Chunking, embeddings ve Vectorize indeksleme** · P0 · L · Bağımlılık: 601  
      **İş:** Belge parça kimliği, sayfa/bölüm provenance, embedding model versiyonu, user namespace/metadata filtering, reindex/delete süreçlerini kur; fixture tabanlı test adapter.  
      **Kabul:** Belge güncelleme/silmede eski parçalar yanlışlıkla sunulmuyor; tekrar indeksleme idempotent; kontrol edilebilir maliyet sınırı var.  
      **Test/kanıt:** Chunk snapshots, reindex, delete, cross-user retrieval tests.

- [ ] **WB2-603 — Retrieval API ve source attribution** · P0 · M · Bağımlılık: 602  
      **İş:** Top-k arama, min-score ve kaynak referansı; yalnız erişim yetkisi olan dokümanlardan alıntı/sayfa konumu döndür; no-result davranışı.  
      **Kabul:** Her önerilen kaynak belge/parçaya bağlanabilir; ilgisiz sorgu kaynak uydurmuyor; erişimi kaldırılmış kaynak hiç dönmüyor.  
      **Test/kanıt:** Gold retrieval dataset, precision@k veya hit@k, authorization tests.

- [ ] **WB2-604 — Grounded document-to-workflow agent** · P0 · L · Bağımlılık: 203, 603  
      **İş:** Retrieval'ı agent'a araç olarak bağla; kaynağa dayalı kurallar/varsayımlar ayrı gösterilsin; doküman kaynaklı talimatların agent'ın sistem/güvenlik kurallarını aşmamasını sağla.  
      **Kabul:** AI yalnız proposal üretir; source attribution kullanıcıya görünür; çözülmeyen boşluklarda soru sorar; prompt injection kaynağı emir olarak uygulamıyor.  
      **Test/kanıt:** PDF injection, ambiguous policy, unsupported claim ve stale doc tests.

- [ ] **WB2-605 — RAG kalite ve maliyet eval raporu** · P1 · M · Bağımlılık: 604  
      **İş:** En az 30 sentetik, etiketli policy QA/task vakası; retrieval hit-rate, groundedness kontrolü, validation success ve token/cost kıyaslaması; mock CI + onaylı live eval.  
      **Kabul:** Belge kaynaklı hatalar kategorize edilmiş; sağlayıcı/prompt/embedding versiyonu, maliyet ve başarısızlık örnekleri belgeli.  
      **Test/kanıt:** Versiyonlu eval fixture ve reproducible benchmark.

- [ ] **WB2-606 — Property-based testing (fast-check)** · P0 · M · Bağımlılık: 005  
      **İş:** Rastgele graph/input üretimi ile topoloji, kanonik serialize/hash, diff/patch invariants ve simulator determinism property'lerini test et; shrink/replay seed desteği.  
      **Kabul:** En az 8 anlamlı invariant; başarısız seed tekrar koşturulabilir; hatalı rastgele graf doğrulayıcıyı çökertmiyor.  
      **Test/kanıt:** CI'da deterministic seeds, example shrunk failure.

- [ ] **WB2-607 — Mutation testing (StrykerJS)** · P1 · M · Bağımlılık: 606  
      **İş:** Önce validator/conditions/patch çekirdeğinin kritik alt kümesinde mutation score baseline al; anlamlı hayatta kalan mutantları hedefli testlerle azalt.  
      **Kabul:** Kapsam seçimi ve mutation score raporlanmış; hedef skor önceden belirlenmiş ve ilerleme açıklanmış; sonsuz/çok pahalı CI koşusu yaratılmamış.  
      **Test/kanıt:** HTML/CI mutation report, en az 3 yakalanmış mutant örneği.

- [ ] **WB2-608 — Fuzz ve supply-chain kalite kapıları** · P1 · M · Bağımlılık: 606  
      **İş:** MCP payload, parser, graph schema için fuzz/limit testleri; SBOM/dependency vulnerability scanning ve lockfile review; false-positive/suppress policy.  
      **Kabul:** DoS'a açık boyut/derinlik girdileri reddediliyor; kritik dependency uyarıları için triage ve remediation yolu tanımlı.  
      **Test/kanıt:** Security pipeline raporu ve örnek adversarial suite.

- [ ] **WB2-609 — Document-to-Workflow showcase paketi** · P1 · S · Bağımlılık: 605, 607  
      **İş:** Lisans ve gizlilik sorunu olmayan sentetik 2 örnek politika belgesi, yanlış/eksik kural senaryosu, source-linked proposal, test metrik görselleri hazırla.  
      **Kabul:** Demo internetsiz mock modda ve onaylı live modda tekrar üretilebilir; atıf ve hata halinde davranış açık.  
      **Test/kanıt:** Demo checklist + end-to-end replay.

**Faz 06 gate:** Belge kaynaklı öneriler ve attribution; RAG eval; property/mutation kanıtları; izolasyon, deletion ve maliyet testleri; `docs/v2/PHASE_06_REPORT.md` → **kullanıcı onayı**.

---

## FAZ 07 — Real-Time Collaboration (ileri / opsiyonel)

**Amaç:** Dağıtık veri yapıları bilgisini göstermek için eşzamanlı grafik düzenlemesi. Bu faz ürün açısından zorunlu değil; yalnız diğer çekirdek başarılar sonrası uygulanır.  
**Öğrenme kanıtı:** Yjs CRDT, WebSocket lifecycle, offline merge, versioned persistence, conflict resolution.  
**Demo:** İki tarayıcı aynı grafı eşzamanlı düzenler; offline/reconnect sonrasında yakınsar; geçersiz topoloji kullanıcıya işaretlenir, veri kaybı olmaz.  
**Çıkış kapısı:** Convergence ve permission testleri, snapshot restore, bozulmadan V1 single-user fallback.

- [ ] **WB2-701 — CRDT domain model spike ve ADR** · P0 · M · Bağımlılık: WB2-003 + V1 `expectedRevision` sözleşmesi  
      **İş:** `Y.Doc` içinde nodes/edges/inputs nasıl temsil edilir, node/edge ID eşsizliği ve zamanlı silme/değiştirme çatışmaları nasıl çözülür POC ile değerlendir.  
      **Kabul:** Aynı alan/edge düzenleme, silme sırasında referans, offline merge ve validator'ın ne zaman çalıştığı için ADR var.  
      **Test/kanıt:** İki-client convergence property testleri.

- [ ] **WB2-702 — Yjs ↔ workflow-contract dönüştürme katmanı** · P0 · L · Bağımlılık: 701  
      **İş:** CRDT dokümandan valid V1 workflow snapshot üret; geçici eşzamanlı edit hatalarını kalıcı kayıt aşamasında doğrula; JSON export ve diff korunmalı.  
      **Kabul:** Yjs ara hali geçersiz olsa bile app çökmez; persist öncesi validator her zaman çalışır; snapshot deterministik ve kayıp alan yok.  
      **Test/kanıt:** Convergence + canonical hash + export/import tests.

- [ ] **WB2-703 — Durable Object WebSocket room ve auth** · P0 · L · Bağımlılık: 701, 702  
      **İş:** Her workflow için owner-scoped room, DO WebSocket Hibernation, authenticated connect, TTL/size limit, reconnect ve fan-out; ayrı `COLLAB_ENABLED` flag.  
      **Kabul:** Yetkisiz client odaya giremiyor; rate/size limit; disconnect/reconnect kayıpsız; prod başlangıçta OFF.  
      **Test/kanıt:** WS auth, reconnect, heartbeat/hibernation, tenant isolation.

- [ ] **WB2-704 — Snapshot persistence ve revision bridge** · P0 · L · Bağımlılık: 702, 703  
      **İş:** Debounced persist, immutable revision, base-hash ve `expectedRevision` ile mevcut D1 geçmişini koruyan köprü; hibernation sonrası yeniden yükleme.  
      **Kabul:** Yeniden başlatma/uyku sonrası doküman açılıyor; eski revision farkı sessiz overwrite olmuyor; kalıcı kayıt sahibi denetleniyor.  
      **Test/kanıt:** Crash/recovery, two-tab persistence, revision conflict tests.

- [ ] **WB2-705 — Presence, conflict UX ve soft locks** · P1 · M · Bağımlılık: 704  
      **İş:** Çoklu imleç/kim düzenliyor bilgisi (minimum kişisel veri), aynı node edit bildirimi, semantik geçersizlik uyarısı, read-only mod; otomatik workflow uygulanmaz.  
      **Kabul:** UI geçici çakışmada veri kaybını gizlemiyor; kullanıcı düzeltme yapabiliyor; klavyeyle ana yol kullanılabilir.  
      **Test/kanıt:** Multi-client E2E, axe ve UI conflict scenarios.

- [ ] **WB2-706 — Eşzamanlılık ve reconnect stres testleri** · P0 · M · Bağımlılık: 704, 705  
      **İş:** 2–5 istemcili deterministic senaryolar, packet drop/reordering, offline edits, delete/recreate races ve kaynak tüketimi; CRDT memory leak kontrolü.  
      **Kabul:** Reconnect sonrası replica convergence; veri silinmesi veya yetkisiz snapshot görülmemesi; known limitations listelenir.  
      **Test/kanıt:** Multi-browser Playwright ve synthetic concurrency testleri.

- [ ] **WB2-707 — Fallback ve canlı iş birliği demosu** · P1 · S · Bağımlılık: 705, 706  
      **İş:** Eşzamanlı demo, offline düzenleme, reconnect, snapshot restore; collaboration flag OFF iken V1 tek kullanıcı deneyimi aynen sürer.  
      **Kabul:** Demo video/README ve performans/limit notları; maintenance cost değerlendirmesi tamam.  
      **Test/kanıt:** Two-browser recorded run ve fallback smoke.

**Faz 07 gate:** Convergence, owner scope, reconnect, version bridge, WCAG ve V1 fallback; `docs/v2/PHASE_07_REPORT.md` → **kullanıcı onayı**. Faz iptal edilirse roadmap'te gerekçesi `DEFERRED` yazılır; önceki fazların tamamlanması etkilenmez.

---

## FAZ UI-03 — AI, Workflow Runs ve RAG için Gelişmiş Frontend

**Amaç:** Backend/AI gelişmelerini gerçekten anlaşılabilir, izlenebilir bir mühendislik demosuna dönüştürmek. **Ön şart:** UI-01; her görevde ilgili servis/contract hazır olmalı. **Önemli:** Agent trace ekranında prompt, token, gizli workflow içeriği veya kişisel veriyi logdan geri getirme yok; yalnız güvenli tool-name, durum, duration ve uygun masked metadata.

- [ ] **WB2-UI301 — AI visual proposal ve semantic graph diff** · P0 · L · Bağımlılık: UI201, UI203, WB2-205  
      **İş:** Mevcut metinsel diff'i koruyarak added/removed/updated nodes ve edges'i salt-okunur graph preview'da görselleştir; proposal, stale document hash ve explicit apply/undo semantiğini koru.  
      **Kabul:** Accept öncesi draft kesinlikle değişmez; node IDs preserved; hem create hem edit modunda TR/EN ve keyboard navigation var.  
      **Test/kanıt:** Proposal snapshot mismatch, visual diff golden, accept/reject/undo E2E.

- [ ] **WB2-UI302 — Agent tool activity inspector + guarded UX** · P1 · M · Bağımlılık: WB2-208, UI103  
      **İş:** Planning/clarification/tool execution/repair/validated/error/cancelled aşamalarını safe status event'lerinden render et; quota, timeout, retry, budget-denied ve cancellation states; full chain-of-thought görüntüleme iddiası yok.  
      **Kabul:** UI yalnız sunucu tarafından izin verilen sınırlı olayları gösteriyor; session switch/abort sonrası stale state yanlış uygulanmıyor.  
      **Test/kanıt:** MSW fixture status transitions, no sensitive content snapshots, UI state-machine regression.

- [ ] **WB2-UI303 — AI compare / prompt-to-workflow story panel** · P1 · M · Bağımlılık: UI301, UI302  
      **İş:** Baseline graph vs önerilen graph'u side-by-side veya overlay göster; validation errors, node count, suggestion coverage, maliyet/mode durumunu güvenli meta olarak özetle.  
      **Kabul:** Diff büyük grafikte legible, proposal never auto-applies, selection cross-highlighting var; low memory cihazda graceful fallback.  
      **Test/kanıt:** 50 node before/after fixture, accessibility ve screenshot comparison.

- [ ] **WB2-UI304 — Durable sandbox execution monitor** · P0 · L · Bağımlılık: WB2-306, UI103, UI205  
      **İş:** Run start / waiting approval / resumed / completed / failed / cancelled durumları için timeline, step inspector ve retry/error hint. Local simulation ile **Sandbox Run** belirgin ayrılmalı; owner-scoped API'den read, açık onayla mutating actions.  
      **Kabul:** Out-of-order polling/event sequence deterministic reconcile; çoklu sekme/refresh sonrası status doğru; workflow edit'i run data'yı bozmaz.  
      **Test/kanıt:** MSW run fixture, Playwright pause/approve/retry/reload, authorization negative case.

- [ ] **WB2-UI305 — Event delivery / DLQ debug console (demo-only)** · P1 · M · Bağımlılık: WB2-405, UI304  
      **İş:** Event lifecycle, attempts, DLQ counts ve safe redrive action göster; yalnız demo-admin scope ve flag ile etkin; payload içeriğini veya secret'ı UI'da açma.  
      **Kabul:** Ordinary member DLQ verisini görmez; yanlışlıkla prod redrive yok; redrive explicit confirmation ve server enforcement kullanıyor.  
      **Test/kanıt:** Auth matrix E2E, failure/retry simulation, read-only fallback.

- [ ] **WB2-UI306 — RAG source evidence viewer** · P1 · M · Bağımlılık: WB2-604, UI301  
      **İş:** Yüklenen doküman için extraction status, source citations, chunk reference ve ilgili node eşlemesini göster; PDF/render güvenliği ve HTML sanitization. Modelin belgeyle desteklemediği node'ları 'çıkarım' diye işaretle.  
      **Kabul:** Kaynak linki doğru document/segment erişimi ile sınırlı; boş/unsupported source açık; RAG kapalıysa app çalışır.  
      **Test/kanıt:** Cited/uncited fixture, malicious text escaping, owner isolation, a11y.

- [ ] **WB2-UI307 — Cloud workflow library, revisions ve restore UX** · P1 · M · Bağımlılık: UI105, WB2-001  
      **İş:** Var olan owner-scoped workflow list + revisions API üzerinden arama/sıralama, visual revisions compare, restore önizlemesi, optimistic concurrency 409 resolution; yeni kaydetme kuralı icat edilmez.  
      **Kabul:** 0/1/100 records UI, cloud error/offline, revision conflict; restore yeni sürüm olarak izlenir ve kullanıcı onayı gerekir.  
      **Test/kanıt:** Mock+staging auth testleri, ownership negative cases, undo/restore test.

- [ ] **WB2-UI308 — Scenario testing explorer + branch coverage UI** · P1 · L · Bağımlılık: UI207, WB2-606  
      **İş:** Girdi setleri ve beklenen sonucu fixture olarak saklayan scenario runner; local deterministic simulator ile testleri toplu oynat, visited branch coverage ve expected/actual diff göster; core değişikliği gerekiyorsa ayrı ADR/contract ve test.  
      **Kabul:** Same fixture = same output; 0/1/20 scenario, approval decisions, stale graph state; AI maliyeti yok ve sandbox yürütme yok.  
      **Test/kanıt:** Golden scenario runs, 100% deterministic regression, coverage visualization snapshots.

**UI-03 gate:** Her alt görev kendi backend fazını bekler. `docs/v2/PHASE_UI_03_REPORT.md`: AI proposal / run / RAG örnekleri, güvenlik/redaction, async states, before/after ve **kullanıcı onayı**. Backend fazı seçilmemiş özellik `DEFERRED` kalabilir.

---

## FAZ UI-04 — Frontend Architecture, Test Engineering ve Performance

**Amaç:** Sadece güzel görünen değil, test edilebilir, sürdürülebilir, hızlı ve erişilebilir React uygulaması kanıtlamak. **Teknolojiler:** React 19, TypeScript, Playwright screenshots/trace, MSW, Lighthouse CI, Vitest, Storybook; TanStack Query/XState yalnız kayıt altına alınmış faydaya göre.

- [ ] **WB2-UI401 — Feature-based React modülerleştirme ve CSS boundaries** · P0 · L · Bağımlılık: UI103, UI105  
      **İş:** Büyüyen `Editor.tsx` sorumluluklarını shell/canvas/inspector/toolbar/notifications şeklinde ayır; mevcut reducer history ve core boundaries korunur; global `styles.css` işlevsel bölümlere/tokens'a ayrılır. Context kullanımı için render profilini kontrol et.  
      **Kabul:** Contract, dispatch, draft-storage ve auth davranışı aynı; büyük refactor atomik testlerle küçük PR'lara bölünmüş; yerel state gereksiz yere globalleşmez.  
      **Test/kanıt:** CI, E2E, snapshot, before/after imports/dependency graph.

- [ ] **WB2-UI402 — TanStack Query server-state pilot (conditional)** · P1 · M · Bağımlılık: UI401, UI307  
      **İş:** Cloud list/revisions ve run status gibi gerçekten server-owned state için caching, cancellation, 409 invalidation, retry policy ve auth logout cache purge pilotu; `useReducer` local canvas state'i yerinde kalır. Pilot değer üretmezse `DEFERRED` ADR.  
      **Kabul:** Cross-user cache leakage yok, stale revision apply yok; query key ve server owner scope ayrılmış.  
      **Test/kanıt:** MSW race/retry/logout fixtures, E2E revision update.

- [ ] **WB2-UI403 — XState async UI state-machine pilot (conditional)** · P1 · M · Bağımlılık: UI302, UI401  
      **İş:** Agent request lifecycle ya da sandbox run controls için statechart ile invalid transition'ları modelle; tüm mevcut V1 state'i XState'e taşınmaz. State machine vs reducer karşılaştırmalı ADR yaz.  
      **Kabul:** Duplicate submit, cancellation, timeout, budget-denied ve stale reply state'leri deterministik; ek bağımlılık mimari fayda sağlamazsa pilot geri alınır.  
      **Test/kanıt:** Model-based transition tests + integration/E2E.

- [ ] **WB2-UI404 — MSW frontend integration test foundation** · P0 · M · Bağımlılık: UI103, WB2-005  
      **İş:** Service Worker yalnız development/test'te; Firebase mock auth, workflow list, revisions, agent statuses, run timeline ve network-failure fixtures; gerçek secret/production API'ye fallback olmamalı.  
      **Kabul:** E2E hermetic, deterministic, offline; mock production build'e yüklenmez.  
      **Test/kanıt:** Forbidden real request test, `msw` handler tests, smoke.

- [ ] **WB2-UI405 — Playwright visual regression CI ve story screenshot matrix** · P0 · M · Bağımlılık: UI101, UI103, UI404  
      **İş:** Görsel baseline'ları UI bileşenlerine ve tam editöre uygula; light/dark, TR/EN, 390/768/1280/1440, selected/invalid/AI/error states; font ve platform varyansını stabilize et, snapshot değişiklikleri manuel review ile onayla.  
      **Kabul:** Bilinçli görsel değişiklik PR'da diff üretir, flaky screenshot takibi var; full matrix gerektiğinde shard edilebilir.  
      **Test/kanıt:** CI baseline ve deliberate CSS regression fail testi.

- [ ] **WB2-UI406 — Web Vitals, bundle analysis ve Lighthouse CI** · P1 · M · Bağımlılık: UI401, UI405  
      **İş:** Demo site için performans baseline, render/hydration/bundle budget, local vs staging LCP/CLS/INP (lab proxy + RUM ayrımını belirt), Lighthouse CI ve bundle analyzer; büyük AI/RAG panelleri lazy load adayı.  
      **Kabul:** Gerçek önce/sonra rakamları ve hedef bütçe ADR'de; veriye göre fail threshold; performans optimize edilince içerik kaybı veya lazy-load race yok.  
      **Test/kanıt:** Lighthouse JSON, bundle report, throttled-device performance capture.

- [ ] **WB2-UI407 — 50-node stress, profiling ve Web Worker izolasyonu** · P1 · L · Bağımlılık: UI203, UI401, UI406  
      **İş:** 50 node/100 edge (contract sınırı) fixture ile drag, selection, auto-layout, validation ve simülasyonu profille; memoization, batch reducer action ve gerekliyse Web Worker layout; hiçbir ölçüm olmadan optimizasyon yapma.  
      **Kabul:** React commit/render ölçümleri ile iyileşme kanıtı; drag/focus responsive; semantik diff ve history bozulmaz.  
      **Test/kanıt:** CPU throttle benchmark, before/after flamegraph ve 50-node E2E.

- [ ] **WB2-UI408 — Advanced accessibility & interaction audit** · P0 · M · Bağımlılık: UI106, UI202, UI205, UI405  
      **İş:** Yeni panel/drawer/command palette/graph shortcuts için screen reader, visible focus, keyboard-only add/connect/undo, roving navigation, reduced-motion, zoom 200% ve dark/light contrast. Axe taramasını gerçek klavye/screen-reader manuel testle tamamla.  
      **Kabul:** WCAG 2.1 AA mevcut hedefi korunmuş; eleştirel keyboard trap yok, mouse-only essential feature yok veya eşdeğer accessible fallback sağlanmış; istisna belgelendirilmiş.  
      **Test/kanıt:** Axe E2E + manual test script + annotated screenshots.

**UI-04 gate:** `docs/v2/PHASE_UI_04_REPORT.md`: deterministic mocks, screenshot CI, accessibility, 50-node benchmark, bundle/Lighthouse raporu, demo video, **kullanıcı onayı**.

---

## FAZ 08 — Engineering Showcase ve final review

**Amaç:** Kullanılan teknolojileri sadece dependency listesi olarak değil; kanıtlanmış mühendislik kararları, karşılaşılan problemler, negatif testler ve gerçek demo halinde sunmak.  
**Çıkış kapısı:** Klonlayıp çalıştırılabilir repo, görsel mimari, kanıtlı teknik değerlendirme ve tek sayfalık portfolio özeti.

- [ ] **WB2-801 — Architecture Story ve karar kayıtları** · P1 · M · Bağımlılık: Seçilen fazlar  
      **İş:** C4 context/container/component, sequence (MCP proposal, agent tool loop, durable approval, queue retry), **React shell / canvas / UI state boundaries, Storybook design system ve ELK layout sequence**, ADR index ve trade-off'lar hazırlansın.  
      **Kabul:** Her teknoloji için “neden gerekli / alternatif / çözdüğü problem / bedeli” anlatılmış; kullanılmayan teknoloji başlıkları başarı gibi gösterilmemiş.  
      **Test/kanıt:** Doc link check + mimari review.

- [ ] **WB2-802 — Reproducible developer demo** · P1 · M · Bağımlılık: 801  
      **İş:** Tek başlatma yolu (mock-first), seed demo, gerekli env example, Cloudflare staging demo script, varsa .NET optional komutu, feature flag senaryoları; **Storybook + canvas auto-layout + mobile demo**.  
      **Kabul:** Temiz makinede secrets olmadan mock demo ve temel testler çalışıyor; gerçek hesap gerekliyse açıkça belirtiliyor.  
      **Test/kanıt:** Clean checkout rehearsal + CI.

- [ ] **WB2-803 — Security/cost/reliability final audit** · P0 · M · Bağımlılık: Seçilen fazlar  
      **İş:** Tehdit modeli güncelle, üçüncü taraf maliyetleri kontrol et, secret/PII log taraması, 5 USD AI guardrail, migration/rollback, dependency ve access denetimi.  
      **Kabul:** Açık P0 güvenlik/ücret aşımı riski yok veya kullanıcı onaylı devre dışı bırakma var; prod V2 feature'ları karara kadar OFF.  
      **Test/kanıt:** Audit checklist + risk acceptance kaydı.

- [ ] **WB2-804 — Final technical retrospective ve portfolio case study** · P1 · M · Bağımlılık: 801–803  
      **İş:** Teknik başarılar, seçilen stack, şemalar, test/benchmark sonuçları, öğrenilenler, limitations, **responsive UI before/after, auto-layout ve görsel regresyon kanıtı**, 3–5 dakikalık demo ve GitHub README yaz.  
      **Kabul:** V1 ile V2 ayrı; ölçümler kaynaklı; bitmeyen/opsiyonel özellikler açık; mülakatta açıklanabilen mimari kararlar mevcut.  
      **Test/kanıt:** Final review tutanağı + demo checklist.

---

## 2. Fazlar arası strateji, risk ve bağımlılıklar

### Stop/go kararları

| Kontrol          | GO                                                           | STOP / BLOCKED                                        |
| ---------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| AI bütçesi       | Yeni feature mevcut defterle fail-closed ve üst limitli      | Toplam 4,50 USD stop aşılabilir / maliyet bilinmiyor  |
| Runtime uyumu    | SDK hedef runtime'da demo + smoke geçti                      | SDK edge ortamında çalışmıyor; ADR olmadan workaround |
| Auth & isolation | Owner scope ve write approval testli                         | MCP/WS/RAG'de cross-user erişim ihtimali              |
| Sürüm sözleşmesi | V1 import/export ve hash değişmedi veya migration ADR'si var | Şema sessizce değişiyor                               |
| Üretim           | Manual approved, staging smoke, rollback var                 | Onaysız deploy veya ücretli kaynak aktivasyonu        |
| Test             | Her görevde ilgili unit/contract/E2E ve quality gates yeşil  | Fail test gizleme/silme veya kanıtsız DONE            |

### Mühendislik riskleri ve kontrolü

1. **Aşırı karmaşıklık:** Her yeni servis/teknoloji bağımsız gösterilebilir teknik probleme karşılık gelmeli. Sırf mikroservis sayısını artırma.
2. **Agent maliyet patlaması:** Çok turlu tool loops, retrieval ve eval çalışmaları V1 5 USD tahsisini hızla tüketebilir. Max turns/token, ayrı demo bütçesi ve manual enable zorunlu.
3. **MCP uzaktan auth:** Üçüncü parti istemcilere Firebase ID token taşıma güvenli varsayılmamalı; ayrı token/audience/scopes ve standart transport auth tasarımı gerekir.
4. **Distributed consistency:** Workflows + D1 + Queues arasında tek bir global transaction yok. Outbox, tekrar teslim ve idempotency buna göre tasarlanmalı; exactly-once dış yan etki iddia edilmemeli.
5. **Cloudflare runtime ve plan limitleri:** SDK, queue, R2, Vectorize, Workflows, telemetry ve Terraform provider sürümleri güncel dokümanla uygulama anında tekrar doğrulanmalı.
6. **PII ve trace:** Agents SDK varsayılan tracing davranışı dahil tüm outbound exporterlar gözden geçirilmeli. İçerik/secret export kapatılmalı ya da yalnız güvenli metadata kullanılmalı.
7. **CRDT graph validity:** CRDT'nin yakınsaması grafiğin semantik olarak geçerli olduğu anlamına gelmez. Validator persist öncesinde son sözü söyler.
8. **Frontend overengineering:** Storybook, XState, TanStack Query, UI library veya animation bağımlılıkları yalnız ölçülebilir amaç için eklenir; React reducer/core sınırları korunur. Responsive ve accessible behavior makyajdan önceliklidir.
9. **Visual proof gap:** Bu plan hazırlanırken canlı SPA screenshot görüntülenemedi; gerçek tarayıcı görünümü `WB2-UI101` ile doğrulanmadan spesifik görsel hata DONE/bug olarak raporlanmaz.
10. **Demos over platform creep:** Her yeni backend/AI özelliğine anlaşılır bir frontend demo ve teknik rapor eşlik eder; sadece UI polish veya teknoloji koleksiyonu hedef değildir.

### Başarı ölçütleri (teknik, ticari değil)

- **Correctness:** Kanonik/hash ve validator invariants; deterministic simulator; no double-terminal run; invalid proposal asla uygulanmaz.
- **Security:** Owner isolation, scope, replay protection, prompt/secret redaction, SSRF ve abuse limit testleri.
- **Reliability:** Injected failure sonrası retry/recovery, DLQ visibility, idempotent consumer, rollback rehearsal.
- **AI engineering:** Başlangıç vs agent aynı eval seti; valid workflow %, repair iterations, latency, token/cost per successful proposal.
- **Engineering maturity:** Her faz onaylı ADR, dokümantasyon, test kanıtı, CI ve reproducible demo.
- **Frontend craftsmanship:** 4 viewport + 2 tema + 2 dil visual matrix, keyboard/touch erişilebilirliği, deterministic ELK layout, component story, e2e snapshots ve kanıtlı 50-node performansı.
- **Portfolio impact:** MCP client interoperability, human-in-loop durable run, trace, RAG source attribution ve/veya CRDT multi-client demo; ayrıca canlı canvas, Storybook, responsive before/after ve graph UX gerçekten çalışıyor.

---

## 3. Codex'e tek görev verme şablonu

Aşağıdaki şablonda `{TASK_ID}` ve `{PHASE}` doldur. **Bir turda bir görev.** UI görevleri için screenshot, responsive/a11y ve visual diff zorunlu kanıttır.

```text
Workflow Builder V2 projesinde yalnız {TASK_ID} görevini uygula.
Önce şunları oku: PROJECT_OVERVIEW.md, AGENTS.md, ROADMAP.md,
TASKS.md/BACKLOG.md, ARCHITECTURE.md, STATUS.md, ilgili ADR ve
WORKFLOW_BUILDER_V2_TECH_ROADMAP.md içindeki {PHASE} bölümü.
UI işi ise docs/v2/FRONTEND_AUDIT.md ve güncel frontend dosyalarını da oku.

İşe başlamadan:
1) Mevcut kodu/dosyaları incele; varsayım yapma.
2) Hedef, değişecek dosyalar, bağımlılıklar, riskler, maliyet,
   test planı ve rollback için kısa bir plan üret.
3) Kapsamı ve ADR ihtiyacını açıkla. Mimari/yetki/ücret/prod değişikliği
   gerekiyorsa DUR ve karar iste; kendi kendine genişletme.

Uygulama:
4) Yalnız bu görevi yap; mevcut V1 davranışını ve testleri koru.
5) Testlerini yaz/çalıştır (negative cases dahil), lint/typecheck/build,
   security scan ve uygun E2E/staging smoke uygula. UI işinde Storybook,
   Playwright screenshot diff, 390/768/1280/1440 viewport, iki tema,
   iki dil, keyboard/focus, reduced-motion ve axe kontrolünü raporla.
6) Diff review yap, gerekli Markdown/ADR/STATUS belgelerini güncelle.
7) Kanıtla: değişen dosyalar, test komutları/sonuçları,
   bilinçli sapmalar, commit/PR, kalan riskler.

Bitirirken:
- Kabul kriterlerinden başarısız olan varsa BLOCKED yaz.
- Sonraki göreve/faza kullanıcı onayı olmadan geçme.
- Production deploy veya ücretli kaynak açma.
```

### Faz sonu onay raporu şablonu

```markdown
# Phase XX — Completion Report

- Implemented IDs:
- PR / commit / branch:
- Architecture/ADR changes:
- Tests: unit / contract / integration / E2E / security / CI / smoke:
- Demo: scenario, steps, expected vs actual:
- Performance & cost impact:
- UI evidence (varsa): viewport/theme/locale snapshots, Storybook, a11y, visual regression, before/after:
- Security / privacy / operational risks:
- Deviations and intentionally deferred tasks:
- Rollback rehearsal:
- Recommended next phase:
- User approval: PENDING / APPROVED / REJECTED
```

### Önerilen repo dosya organizasyonu

```text
PROJECT_OVERVIEW.md      # V1 mevcut durum (kanıta dayalı)
AGENTS.md                # Codex çalışma kuralları
ROADMAP.md               # Ana plan (bu dosyaya link / mevcut planı bozma)
TASKS.md veya BACKLOG.md # Tekil görevin güncel durumu
ARCHITECTURE.md          # Uygulanmış mimari
STATUS.md                # Son durum ve blockers
docs/v2/
  BASELINE.md
  TECH_ROADMAP.md        # Bu belgenin repo kopyası
  PHASE_00_REPORT.md ... PHASE_08_REPORT.md
  PHASE_UI_01_REPORT.md ... PHASE_UI_04_REPORT.md
  FRONTEND_AUDIT.md
  UI_DESIGN_SYSTEM.md
  UI_PERFORMANCE.md
  ADR-*.md
  MCP.md
  BENCHMARKS.md
  COST_AND_RISK.md
```

---

## 4. Kullanılan dış teknik referanslar (1 Kasım 2026 itibarıyla)

Uygulama başlamadan önce API/SDK/ücretlendirme tekrar kontrol edilmeli:

- MCP TypeScript SDK, remote Streamable HTTP: https://ts.sdk.modelcontextprotocol.io/server
- MCP specs: https://modelcontextprotocol.io/specification/
- OpenAI Agents SDK TS: https://openai.github.io/openai-agents-js/
- OpenAI Agents SDK tracing/guardrails: https://openai.github.io/openai-agents-js/guides/tracing/ , https://openai.github.io/openai-agents-js/guides/guardrails/
- Cloudflare Workflows: https://developers.cloudflare.com/workflows/
- Cloudflare Workflows billing: https://developers.cloudflare.com/workflows/reference/pricing/
- Cloudflare Queues retries/DLQ: https://developers.cloudflare.com/queues/configuration/batching-retries/
- Cloudflare Durable Object WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare Vectorize: https://developers.cloudflare.com/vectorize/
- Terraform on Cloudflare: https://developers.cloudflare.com/terraform/installing/
- React Flow / XYFlow: https://reactflow.dev/
- ELK.js graph layout: https://github.com/kieler/elkjs
- Storybook: https://storybook.js.org/docs/
- Playwright visual comparisons: https://playwright.dev/docs/test-snapshots
- MSW: https://mswjs.io/
- TanStack Query: https://tanstack.com/query/latest
- XState: https://stately.ai/docs/xstate
- Lighthouse CI: https://github.com/GoogleChrome/lighthouse-ci

---

## 5. Proje yöneticisi önerisi: ilk sprint

1. `WB2-001` — Kod ve test baseline'ını doğrula.
2. `WB2-002` — Ortam izolasyonu ve prod güvenliği.
3. `WB2-003` — ADR/mimari sınırlar.
4. `WB2-004` — V2 feature flags ve AI maliyet kilidi.
5. `WB2-005` — Test/fixture altyapısı.
6. `WB2-006` — Güvenlik ve trace standardı.
7. Faz 00 review ve **kullanıcı onayı**.
8. **Frontend ilk dalga (MCP ile paralel veya önce):** `WB2-UI101 → UI102 → UI103 → UI105 → UI201 → UI203 → UI405` (bağımlılıklara göre; UI405 için UI404 de tamamlanır).
9. UI-01 gate ve **kullanıcı onayı**. Paralel backend dalında ilk Codex görevi `WB2-101`; aynı PR'da UI + MCP feature geliştirme yapma.

**Son kural:** Bütün teknolojileri eklemek değil, seçilen her teknoloji için **kanıtlanabilir bir mühendislik problemi + tasarım kararı + çalışan demo + negatif test + kalite raporu** üretmek başarılı V2'nin ölçüsüdür. Frontend tarafında buna ayrıca **responsive before/after + component story + erişilebilirlik + performance benchmark** eklenir.
