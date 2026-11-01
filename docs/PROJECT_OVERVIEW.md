# Workflow Builder — Proje Analizi

**Tarih:** 1 Kasım 2026 · **Durum:** Canlıda (deneme/demo) · **Kaynak:** `main` @ `e9c6f6b` sonrası

| Ortam      | Adres                                          | AI                                 |
| ---------- | ---------------------------------------------- | ---------------------------------- |
| Production | https://workflow.oguzsoykan.com                | Gerçek OpenAI (`gpt-6-luna`), açık |
| Staging    | https://workflow-staging.oguzsoykan.com        | Sahte (mock) sağlayıcı, ücretsiz   |
| Kaynak kod | https://github.com/OguzSoykan/Workflow-Builder | —                                  |

Bu belge projenin **iş mantığını** (neyi, kimin için, hangi kurallarla yaptığını) ve **teknolojisini** (nasıl
kurulduğunu) tek yerde özetler. Ayrıntılı sözleşmeler için [PRD](PRD.md), [Architecture](ARCHITECTURE.md),
[Workflow Contract](WORKFLOW_CONTRACT.md), [Data Model](DATA_MODEL.md), [API Contract](API_CONTRACT.md) ve
[ADR'ler](adr/) esas alınır.

---

## 1. Özet

Workflow Builder; onay süreçlerini (satın alma, izin, masraf vb.) **görsel olarak tasarlamaya**, anında
**doğrulamaya**, kendi girdi değerleriyle **adım adım simüle etmeye** ve süreci **doğal dille anlatarak yapay
zekâdan akış önerisi almaya** yarayan bir web uygulamasıdır.

Proje bir **deneme**dir: Kurumda kullanılan BPM sistemlerine alternatif olarak, "süreç tasarımını yapay zekâ ile
hızlandırmak mümkün mü?" sorusunu küçük ve güvenli bir kapsamda sınamak için yapılmıştır. Gerçek bir BPM
ürününün yerini tutmaz; süreçleri gerçekte çalıştırmaz, bildirim göndermez, entegrasyon yapmaz.

---

## 2. İş mantığı

### 2.1 Problem ve hedef

- **Problem:** Onay süreçlerini tanımlamak, değişikliğin etkisini görmek ve süreci canlıya almadan sınamak çoğu
  zaman pahalı, öğrenme eğrisi yüksek araçlara bağlı. Süreci bilen kişi (iş birimi) ile aracı bilen kişi
  (geliştirici/BPM uzmanı) arasında sürekli gidip gelme gerekiyor.
- **Hedef:** Süreci bilen kişinin, akışı kendi başına çizebilmesi veya anlatabilmesi; sonucu görüp kendi
  verileriyle denemesi.
- **North-star metrik:** İlk oturumda oluşturulan/düzenlenen akışın kullanıcı tarafından **başarıyla simüle
  edilme oranı**.

### 2.2 Kullanıcılar

| Persona          | İhtiyaç                                                               |
| ---------------- | --------------------------------------------------------------------- |
| İş analisti      | Kod yazmadan süreci çizmek/anlatmak, hatayı görmek ve düzeltmek       |
| Geliştirici      | JSON çıktısını incelemek, koşulları ve mimariyi değerlendirmek        |
| Demo ziyaretçisi | Hesap açmadan denemek; beğenirse kayıt olup AI ve bulut kaydını açmak |

### 2.3 Kapsam: ne yapar, ne yapmaz

**Yapar**

- 4 adım tipiyle akış tasarımı: **Başlangıç**, **Onay**, **Koşul**, **Bitiş**.
- Tipli **girdi alanları** (sayı, metin, seçenek listesi, tarih, evet/hayır vb.) ve bu alanlara bağlı koşullar
  (eşittir, büyüktür, şunlardan biridir…).
- Her değişiklikte **anlık doğrulama** ve sorunu ilgili adıma götüren açıklamalar.
- **Simülasyon:** Girdi değerleriyle akışı başlatma, koşul dallarını izleme, Onay adımında durup kullanıcıdan
  onay/ret kararı alma, adım günlüğü ve sonuç (tamamlandı / reddedildi).
- **AI ile oluşturma ve düzenleme:** Süreci doğal dille anlatınca yeni akış önerisi; mevcut akışa değişiklik
  önerisi ve **diff** (ne eklendi/değişti/silindi). Kullanıcı onaylamadan taslağa hiçbir şey uygulanmaz,
  uygulanan öneri “Geri al” ile geri alınır.
- **Saklama:** Hesapsız kullanımda tarayıcıda otomatik taslak ve JSON içe/dışa aktarma; üyelerde sürüm
  geçmişli **bulut kaydı**.
- Hazır **örnekler:** Satın alma talebi, İzin talebi, Masraf iadesi.
- Türkçe/İngilizce arayüz, açık/koyu tema, klavye ile tam kullanım, WCAG 2.1 AA.

**Yapmaz (bilinçli kapsam dışı)**

- Süreci gerçekte çalıştırmak (e-posta, görev atama, harici sistem çağrısı) — simülasyon tamamen yereldir.
- Form tasarımı, rol/yetki yönetimi, organizasyon şeması, SLA/zamanlayıcı, paralel dallar, alt süreçler.
- Çok kullanıcılı eşzamanlı düzenleme, paylaşma, kurumsal SSO.

### 2.4 Kullanıcı yolculukları

1. **Hesapsız deneme:** Siteyi aç → örnek yükle veya adım ekle → alanları tanımla → doğrulama yeşil → simüle et
   → sayfayı yenile, taslak yerinde → JSON olarak indir.
2. **Kayıt:** “Kayıt ol” → e-posta + şifre (tekrar, canlı kontrol) → doğrulama e-postası → “Doğruladım, devam et”
   → AI ve bulut kaydı açılır. Hata durumlarında sonraki adım önerilir (yanlış şifre → sıfırla; kayıtlı e-posta
   → giriş).
3. **AI ile oluşturma:** “Oluştur” sekmesi → süreci anlat → önizleme (adım sayısı, doğrulama durumu, adım
   listesi) → “Taslağa uygula” veya “Reddet”.
4. **AI ile düzenleme:** Mevcut akışta “Bu akışı düzenle” → değişikliği anlat → diff önizlemesi → uygula. Öneri
   alındıktan sonra taslak değiştiyse öneri uygulanmaz (eski öneri yeni taslağı ezemez).
5. **Bulut kaydı:** “Dosya” sekmesi → “Buluta kaydet” (onaylı) → her kayıt yeni sürüm → başka sekme/cihazdan
   kayıt varsa **çakışma** açıkça gösterilir ve kullanıcı seçer.

### 2.5 İş kuralları

**Akış geçerliliği**

- Tam olarak bir Başlangıç; en az bir Bitiş; her adım Başlangıç'tan ulaşılabilir; döngü yok.
- Çıkışlar adım tipine göre sabittir: Başlangıç → `Sonraki`; Koşul → `Doğru`/`Yanlış`; Onay →
  `Onaylandı`/`Reddedildi`. Her çıkış tam olarak bir adıma bağlanmalı.
- Koşullar tanımlı bir alana ve alan tipine uygun karşılaştırmaya bağlı olmalı; alanı kullanan koşul varken alan
  silinemez.
- Sınırlar: 50 adım, 100 bağlantı, 30 alan, 100 seçenek, 1.000 karakter metin, 256 KB belge.
- Eksik akış da kaydedilir (taslak), ama **simülasyon ve bulut kaydı yalnız geçerli akışta** açılır.

**Simülasyon**

- Yalnız simülasyondur: e-posta, onay isteği veya harici işlem gönderilmez; sonuç kaydedilmez.
- Zorunlu veya bir koşulda kullanılan alanlar için değer istenir; tip ve sınır dışı değerler reddedilir.
- Akış simülasyon sırasında değişirse çalışma “eski” olarak işaretlenir ve yeniden başlatılması istenir.

**Yapay zekâ (maliyet ve güvenlik kuralları)**

| Kural              | Değer / davranış                                                                     |
| ------------------ | ------------------------------------------------------------------------------------ |
| Kim kullanabilir   | Yalnız **e-postası doğrulanmış üyeler** (misafir AI yok)                             |
| Günlük kota        | Üye başına **günde 1** öneri (UTC günü)                                              |
| Toplam bütçe       | 5 USD tahsis; **4,50 USD'de AI kendiliğinden kapanır**                               |
| Hata durumunda     | **Fail-closed:** bütçe sayacına ulaşılamazsa AI kapalı kalır, editör çalışır         |
| Bilinmeyen maliyet | Ayrılan tutarın tamamı harcanmış sayılır (temkinli muhasebe)                         |
| Tekrar istek       | Aynı `Idempotency-Key` ile gelen istek yeniden ücretlendirilmez, kayıtlı yanıt döner |
| Uygulama           | Öneri **asla otomatik uygulanmaz**; önizleme + kullanıcı onayı + geri al             |
| Düzenleme          | Adım kimlikleri korunur; değişiklik yama (patch) olarak üretilir ve diff gösterilir  |
| Gizlilik           | Prompt, token, e-posta ve akış içeriği loglanmaz                                     |

**Hesap ve saklama**

- Kimlik: Firebase Authentication, e-posta + şifre. Şifre yalnız Firebase'e gider, uygulamanın sunucusuna
  hiç gelmez.
- Bulut kaydı ve AI için e-posta doğrulaması zorunlu.
- Kayıtlar sahibine özeldir (owner-scoped); başka kullanıcının kaydını görmek/tahmin etmek mümkün değildir.
- Her bulut kaydı değiştirilemez bir **sürüm** oluşturur; çakışma iyimser kilitle (beklenen sürüm) yakalanır.
- Silme yumuşak silmedir (`deleted_at`). Çıkış yapmak tarayıcıdaki yerel taslağı silmez.

### 2.6 Maliyet modeli

| Kalem                        | Maliyet                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Barındırma (Workers, D1, DO) | Cloudflare ücretsiz katman                                                                                |
| Kimlik (Firebase Auth)       | Spark (ücretsiz) plan                                                                                     |
| Alan adı                     | Mevcut `oguzsoykan.com`                                                                                   |
| AI                           | `gpt-6-luna`: 1M token başına 0,10 USD girdi / 0,50 USD çıktı; tek öneri ≈ 0,0005 USD. Üst sınır 4,50 USD |

Ücretsiz katman limitleri aşılırsa istekler hata verir; otomatik ücret oluşmaz. Canlı AI değerlendirmesinde
20 senaryonun 19'u başarılı oldu (toplam maliyet ≈ 0,01 USD).

### 2.7 Kurumdaki BPM sistemine göre konum

| Konu                                     | Kurumsal BPM                  | Workflow Builder (deneme)                |
| ---------------------------------------- | ----------------------------- | ---------------------------------------- |
| Süreç tasarımı                           | Uzman aracı, uzun öğrenme     | Basit görsel editör + doğal dilden öneri |
| Doğrulama                                | Yayın öncesi / çalışırken     | Her değişiklikte anlık                   |
| Deneme                                   | Test ortamında gerçek çalışma | Tarayıcıda güvenli simülasyon            |
| Gerçek yürütme, form, yetki, entegrasyon | Var                           | Yok (kapsam dışı)                        |

Çıkarım: AI ile üretilen akışlar **iyi bir başlangıç taslağı** olabiliyor; ancak sonucun bir insan tarafından
kontrol edilmesi şart. Asıl zorluk AI değil, sürecin ve kenar durumlarının doğru tarif edilmesi.

---

## 3. Teknoloji

### 3.1 Mimari

```
Tarayıcı (React SPA)
 ├─ Editör, doğrulama, simülasyon  ──►  workflow-core (saf TS, tarayıcıda çalışır)
 ├─ Yerel taslak (localStorage)
 ├─ Firebase Auth REST  ──────────────►  Google Identity Toolkit (e-posta/şifre)
 └─ /api/*  (Bearer ID token)
        │
        ▼
Cloudflare Worker (Hono) — tek deployment, statik dosyaları da sunar
 ├─ Token doğrulama (RS256, WebCrypto, Google JWK)
 ├─ /api/v1/workflows  ──►  D1 (SQLite): users, workflows, workflow_revisions
 ├─ /api/v1/ai/*  ──►  AiBudget Durable Object (global bütçe + kota defteri)
 │                 └─►  OpenAI Responses API (strict JSON schema)
 └─ Her sınırda workflow-contract ile yeniden doğrulama
```

Tek Worker hem SPA'yı hem API'yi aynı origin'den sunar (CORS yok). Ayrı mikroservis yoktur.

### 3.2 Monorepo yapısı (npm workspaces)

| Paket                        | Sorumluluk                                                        | Bağımlılık                      | Satır* |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------- | ------ |
| `packages/workflow-contract` | Ortak şema, tipler, sınırlar, kanonik JSON + SHA-256 içerik özeti | Zod 4.6, @noble/hashes          | ~640   |
| `packages/workflow-core`     | Saf mantık: validator, topoloji, koşullar, simülatör, patch/diff  | Yalnız contract                 | ~690   |
| `apps/web`                   | React 19 SPA: editör, paneller, hesap, AI, bulut, i18n, tema      | React 19.3, @xyflow/react 12.12 | ~6.600 |
| `apps/worker`                | Hono API, auth, D1 deposu, AI hattı, bütçe Durable Object'i       | Hono 4.13                       | ~2.000 |
| `tests/`                     | E2E (Playwright), platform/sözleşme testleri, fixture'lar         | Playwright 1.58, axe-core 4.14  | ~3.700 |
| `infra/`                     | `wrangler.jsonc` (local/staging/production), D1 migration'ları    | Wrangler 4.151                  | —      |

\* `.ts/.tsx/.css` satır sayısı, yaklaşık.

Katman kuralları: `workflow-contract` ve `workflow-core` UI/ağ/DB/LLM bilmez; `apps/web` ve `apps/worker`
birbirinin içini import etmez, yalnız paketlerin public arayüzünü kullanır.

### 3.3 Workflow sözleşmesi (`workflow-contract`)

- **Belge:** `schemaVersion: 1`, `workflowId`, `title`, `locale (tr|en)`, `inputs[]`, `nodes[]`, `edges[]`.
- **Adımlar:** `start`, `approval` (onaylayan rolü), `condition` (alan + operatör + değer), `end` (`completed` |
  `rejected`).
- **Bağlantı çıkışları:** `next`, `true`, `false`, `approved`, `rejected`.
- **Güvenlik sınırları:** derinlik 12, 20.000 değer, 256 KB, güvenli anahtar adları (prototip kirliliği engeli),
  katı (strict) nesneler — bilinmeyen alan reddedilir.
- **Kanonik JSON + SHA-256:** Aynı içerik her yerde aynı özeti verir (tarayıcı, Worker, Node; UTF-8 vektörleriyle
  test edilir). AI düzenleme önerisinin “hangi belge için üretildiği” bu özetle kontrol edilir.

### 3.4 Çekirdek mantık (`workflow-core`)

| Modül        | İşlev                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `validator`  | Şema + topoloji + koşul kontrolleri; kullanıcıya gösterilecek sorun listesi                       |
| `topology`   | Tek başlangıç, ulaşılabilirlik, döngü, çıkış bağlantı kuralları                                   |
| `conditions` | Alan–operatör–değer tip uyumu                                                                     |
| `simulator`  | `normalizeInputs`, `evaluateCondition`, `startSimulation`, `decideApproval`; saf ve deterministik |
| `patch`      | `applyPatch` (AI düzenleme operasyonları, ID koruyarak), `diffWorkflows`                          |

Saf fonksiyonlar olduğu için hem tarayıcıda (anlık doğrulama/simülasyon) hem Worker'da (sunucu tarafı yeniden
doğrulama, AI çıktısının denetimi) aynı kod çalışır.

### 3.5 Web uygulaması (`apps/web`)

- **Düzen:** Tam ekran çalışma alanı — üst çubuk, sol sekmeler (Adımlar / Alanlar / Oluştur / Dosya), React Flow
  tuvali, sağ sekmeler (Özellikler / Simülasyon), tuval üstünde yüzen doğrulama kartı. WAI-ARIA uyumlu `Tabs`
  bileşeni; gizli paneller bağlı kalır (durum kaybolmaz).
- **Editör durumu:** `useReducer` + geçmiş yığını (Geri al / Yinele, Ctrl/Cmd+Z), atomik özellik düzenleme
  (“Değişiklikleri uygula”).
- **Yerel taslak:** `localStorage` otomatik kayıt; bozuk taslak yedeklenir; kota dolu uyarısı; başka sekmede
  değişiklik algılanır ve kullanıcı sürüm seçer.
- **Hesap:** Firebase Auth **SDK'sız** REST istemcisi (ADR-020); oturum yenileme; modal hesap penceresi
  (giriş / kayıt / sıfırlama / e-posta doğrulama adımları).
- **AI paneli:** Kota ve bütçe durumu, oluştur/düzenle modu, önizleme + diff, eski öneriyi reddeden özet kontrolü;
  giriş yapılmamışken kilitli önizleme ve kayıt çağrısı.
- **i18n:** Kaynak metin anahtarlı `t()`; İngilizce katalog; testler eksik ve kullanılmayan çevirileri yakalar
  (ADR-025).
- **Tema:** Sistem / açık / koyu, kalıcı tercih, React Flow `colorMode`.
- **Erişilebilirlik:** WCAG 2.1 AA (axe), klavye ile tam ana senaryo, görünür odak, ekran okuyucu açıklamaları.

### 3.6 Worker API (`apps/worker`)

| Yöntem | Yol                                    | İşlev                                            | Yetki           |
| ------ | -------------------------------------- | ------------------------------------------------ | --------------- |
| GET    | `/api/health`                          | Sağlık kontrolü                                  | Herkese açık    |
| GET    | `/api/config`                          | Tarayıcıya public Firebase ayarı                 | Herkese açık    |
| GET    | `/api/v1/me`                           | Profil (doğrulama durumu, bulut izni)            | Üye             |
| GET    | `/api/v1/workflows`                    | Kendi akışlarını listele                         | Üye             |
| POST   | `/api/v1/workflows`                    | Yeni akış (sürüm 1)                              | Doğrulanmış üye |
| GET    | `/api/v1/workflows/:id`                | Akışın güncel hali                               | Üye (sahibi)    |
| PUT    | `/api/v1/workflows/:id`                | Yeni sürüm; `expectedRevision` ile çakışma → 409 | Doğrulanmış üye |
| DELETE | `/api/v1/workflows/:id`                | Yumuşak silme                                    | Üye (sahibi)    |
| GET    | `/api/v1/workflows/:id/revisions[/:n]` | Sürüm geçmişi / belirli sürüm                    | Üye (sahibi)    |
| GET    | `/api/v1/ai/limits`                    | AI açık mı, kalan kota, bütçe durumu             | Üye             |
| POST   | `/api/v1/ai/workflows/generate`        | Doğal dilden yeni akış önerisi                   | Doğrulanmış üye |
| POST   | `/api/v1/ai/workflows/edit`            | Mevcut akışa yama + diff önerisi                 | Doğrulanmış üye |

Ortak davranış: her yanıtta `X-Request-ID`; hata zarfı ayrıntı/stack sızdırmaz; gövde boyutu sınırlı; tüm
girdiler `workflow-contract` ile Worker'da yeniden doğrulanır. Sözleşme `docs/openapi.json` ile belgelenir.

### 3.7 Kimlik doğrulama

- Tarayıcı Firebase'den ID token alır; her API isteğinde `Authorization: Bearer`.
- Worker token'ı **WebCrypto** ile doğrular (ADR-018): yalnız `RS256` ve bilinen `kid`; Google'ın public JWK
  anahtarları; `aud` = proje kimliği, `iss` = `securetoken.google.com/<proje>`, `exp/iat/auth_time` kontrolü.
  `none` ve HMAC algoritmaları reddedilir.
- `email_verified` alanı yazma ve AI yetkisini belirler.

### 3.8 Veri modeli (D1 / SQLite)

| Tablo                | İçerik                                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`              | `firebase_uid` (PK), görünen ad, tercih edilen dil, zaman damgaları, `deleted_at`                                                                                                                     |
| `workflows`          | `(owner_uid, id)` PK, başlık, `current_revision_number`, zaman damgaları, `deleted_at`                                                                                                                |
| `workflow_revisions` | `(owner_uid, workflow_id, revision_number)` PK — değiştirilemez anlık görüntü: `graph_json` (≤256 KB), `content_hash` (SHA-256), `source` (`manual` / `ai_create` / `ai_edit` / `import` / `restore`) |

Benzersiz sürüm anahtarı, aynı sürümü iki kez yazmaya çalışan ikinci isteği veritabanı düzeyinde düşürür.

### 3.9 Yapay zekâ hattı

1. **Ön kontroller:** `AI_ENABLED`, doğrulanmış e-posta, `Idempotency-Key` zorunlu, prompt uzunluğu (≤2.000).
2. **Rezervasyon:** `AiBudget` Durable Object'i (SQLite tabanlı, tek global örnek) isteğin üst maliyet sınırını
   ayırır. Bütçe (4,50 USD) veya günlük kota doluysa istek sağlayıcıya hiç gitmez.
3. **Sağlayıcı:** OpenAI Responses API, **strict JSON schema** ile yapılandırılmış çıktı; çıktı token sınırı
   8.000. Testlerde ve staging'de sahte (mock) sağlayıcı.
4. **Denetim:** Çıktı `workflow-contract` + `workflow-core` ile doğrulanır; düzenlemede yama uygulanır ve diff
   üretilir. Geçersiz çıktı kullanıcıya sunulmaz.
5. **Muhasebe:** Gerçek token kullanımıyla kayıt `settled`; sağlayıcı hatasında `released`; maliyet
   bilinmiyorsa `charged_unknown` (ayrılan tutarın tamamı harcanmış sayılır).
6. **Tekrar:** Aynı anahtarla gelen istek kayıtlı yanıtı döner; ikinci kez ücretlendirilmez.

### 3.10 Güvenlik

- Secret'lar yalnız Worker secret'ı olarak durur (`OPENAI_API_KEY`, `FIREBASE_WEB_API_KEY`); repoda yer tutucu
  bile değildir. Gitleaks ve özel secret taraması hem git geçmişini hem build çıktısını tarar.
- Owner-scoped veri erişimi; başka kullanıcının kimlikleri çakışmaz/sızmaz.
- Katı şema, boyut/derinlik sınırları, prototip kirliliği koruması.
- Worker yanıtlarında Hono `secureHeaders` (ör. `X-Content-Type-Options: nosniff`) ve API'de `Cache-Control: no-store`; smoke testi kontrol eder. Statik dosyalar için ayrı CSP henüz yok.
- Loglarda prompt, token, e-posta ve akış içeriği yoktur.

### 3.11 Kalite ve test

| Kapı                                  | Kapsam                                                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck` / `lint` / `format:check` | TypeScript 6 strict, ESLint 10, Prettier                                                                                                            |
| Birim (Vitest 5)                      | **496 test** — contract, core, web bileşen mantığı, worker rotaları, bütçe defteri, i18n                                                            |
| Güvenlik/yayın (node:test)            | Secret tarayıcı, deploy koruması, smoke script'i                                                                                                    |
| Negatif kapılar                       | Bilerek bozulan kodun kapılarca reddedildiğinin kanıtı                                                                                              |
| Coverage                              | `test:coverage` (V8)                                                                                                                                |
| E2E (Playwright)                      | **55 test** — editör, koşullar, simülasyon, örnekler, kalıcılık, hesap, bulut, AI, i18n, erişilebilirlik (axe, açık/koyu), sağlık sayfası, sözleşme |
| Build                                 | Web + Worker; local/staging/production için Wrangler dry-run                                                                                        |
| Secret taraması                       | `secret:scan` + Gitleaks                                                                                                                            |
| AI değerlendirme                      | 20 senaryoluk canlı değerlendirme (19/20)                                                                                                           |

CI: GitHub Actions `quality` işi her PR'da zorunlu; PR'lar squash merge edilir. Ayrıca manuel, onaylı **Deploy**
iş akışı ve GitHub ağından salt okunur **Smoke** iş akışı vardır.

### 3.12 Ortamlar, yayın ve operasyon

| Ortam      | Worker                        | D1                                   | Firebase                         | AI     |
| ---------- | ----------------------------- | ------------------------------------ | -------------------------------- | ------ |
| local      | `wrangler dev`                | yerel                                | yapılandırılmamış/emülatör       | mock   |
| staging    | `workflow-builder-staging`    | `workflow-builder-staging` (WEUR)    | `workflow-builder-staging-a31fe` | mock   |
| production | `workflow-builder-production` | `workflow-builder-production` (EEUR) | aynı proje (geçici, paylaşımlı)  | OpenAI |

- Özel alan adları Cloudflare custom domain ile; `*.workers.dev` bazı ağlarda engelli olduğu için kapalı.
- Yayın: `deploy:check` (yer tutucu ID'de durur) → build → D1 migration → `wrangler deploy` → smoke (6 kontrol).
- Geri alma: `wrangler rollback`; AI'ı anında kapatmak için `AI_ENABLED=false`; veri için D1 Time Travel.
- İzleme: Workers Observability; AI harcaması bütçe defteri + OpenAI kullanım paneli.
- Ayrıntı: [OPERATIONS](OPERATIONS.md), [ENVIRONMENTS](ENVIRONMENTS.md).

### 3.13 Mimari kararlar (ADR)

| ADR | Karar                                                 |
| --- | ----------------------------------------------------- |
| 012 | npm workspaces monorepo, sabitlenmiş araç sürümleri   |
| 013 | Faz 1 kalite kapıları                                 |
| 014 | Workflow v1 sözleşmesi                                |
| 015 | React Flow tabanlı editör tuvali                      |
| 016 | Zod tip bildirimleri (skipLibCheck)                   |
| 017 | Saf, deterministik simülatör                          |
| 018 | Firebase token'ının WebCrypto ile doğrulanması        |
| 019 | D1'de owner-scoped, sürümlü saklama ve iyimser kilit  |
| 020 | Tarayıcıda SDK'sız Firebase Auth (REST)               |
| 021 | Global AI bütçe defteri (Durable Object), fail-closed |
| 022 | OpenAI adaptörü, strict structured outputs            |
| 023 | AI ile oluşturma akışı                                |
| 024 | AI düzenlemenin kanonik patch + diff ile yapılması    |
| 025 | Kaynak metin anahtarlı i18n                           |

---

## 4. Değerlendirme

### 4.1 Güçlü yanlar

- **Tek doğruluk kaynağı:** Aynı şema ve saf çekirdek tarayıcıda ve sunucuda çalışıyor; AI çıktısı da aynı
  kurallardan geçiyor.
- **Güvenli AI kullanımı:** İnsan onayı, diff, eski öneri koruması, global bütçe + günlük kota, fail-closed,
  idempotency.
- **Düşük işletme maliyeti:** Ücretsiz katmanlar + tavanı belli AI harcaması.
- **Kalite disiplini:** 550 civarı otomatik test, erişilebilirlik taraması, secret taraması, ADR ve çalışma
  günlükleri.

### 4.2 Bilinen sınırlar ve riskler

| Konu                      | Durum / risk                                                            |
| ------------------------- | ----------------------------------------------------------------------- |
| Firebase projesi          | Production ve staging aynı Firebase projesini paylaşıyor (geçici sapma) |
| Statik varlıklar için CSP | Güvenlik başlıkları API'de var; SPA için `_headers`/CSP henüz yok       |
| İstek sınırlama           | AI dışındaki API uçlarında rate limiting yok                            |
| KVKK                      | Gizlilik bildirimi ve hesap silme akışı yok                             |
| Bulut                     | “Buluttan aç” listesi arayüzde sınırlı; paylaşma yok                    |
| İzleme                    | Uyarı/alarm kurulu değil; bütçe defteri mutabakatı elle                 |
| Ürün kapsamı              | 4 adım tipi; paralel dal, zamanlayıcı, form, rol, gerçek yürütme yok    |

### 4.3 Önerilen sonraki adımlar

1. Production için ayrı Firebase projesi; SPA için CSP ve güvenlik başlıkları.
2. Gizlilik bildirimi + hesap/veri silme; API rate limiting.
3. Bulut akış listesi (“Buluttan aç”), sürüme geri dönme (restore) arayüzü.
4. AI önerisini adım adım iyileştirme (sohbet tarzı düzenleme), AI'ın sorduğu netleştirme soruları.
5. Ürün kapsamı: paralel onay, zaman aşımı/SLA, rol tabanlı onaylayan, basit form alanları.
6. Gerçek kullanım verisiyle north-star metriğinin ölçülmesi (anonim, gizlilik uyumlu analitik).
