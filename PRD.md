# PRD v1.1 — AI Workflow Builder

**Tarih:** 22.10.2026 | **Durum:** Plan onayı için hazır; geliştirilmedi | **Önceki sürüm:** v1.0

## 1. Problem, hedef, kullanıcı

**Problem:** Kurumsal onay süreçlerinin anlaşılır biçimde tanımlanması, değişiklik etkisinin görülmesi ve çalıştırılmadan sınanması pahalı/yüksek öğrenme eğrili araçlara bağlı kalıyor.

**Vizyon:** Kullanıcı görsel editör veya doğal dil ile iş akışı tasarlar; önerileri diff olarak inceler ve onaylar; kendi tanımladığı veriler ve manuel onay/ret kararıyla akışı simüle eder.

**Persona A — İş analisti:** Kod yazmaz; talep yönlendirmesini anlatır, akışı görür, hatayı düzeltir.  
**Persona B — Geliştirici:** JSON çıktısını inceler, koşulları doğrular, sistem mimarisini ve testleri değerlendirir.  
**Persona C — Demo ziyaretçisi:** Hesap açmadan ürün değerini deneyip isterse kaydolur.

**North-star:** İlk oturumda oluşturulan veya düzenlenen akışın, kullanıcı tarafından başarılı simüle edilme oranı.

## 2. Kesinleşmiş ürün kararları

| Başlık | Karar |
|---|---|
| Arayüz | Kurumsal ERP dashboard, Türkçe + İngilizce |
| Kapsam | Serbest workflow tasarımı fakat yalnızca 4 MVP node tipi |
| Node'lar | Start, Approval, Condition, End |
| Simulation | Adım adım, Approval'da bekle; kullanıcı onay/ret girsin |
| Veri alanları | Kullanıcının tanımladığı tipli alanlar: tutar, departman, tarih vb. |
| Anonim saklama | Tarayıcı, dışarı JSON çıkarma |
| Üye saklama | Cloudflare D1 üzerinde owner-private workflow |
| Üyelik | E-posta + şifre, Firebase Auth Spark tarafından yönetilir |
| AI create/edit | Her ikisi; sadece kullanıcı onayı ile uygulanır |
| AI edit | Node ID'leri korunur; revizyon tabanlı operasyonlar; diff zorunlu |
| Anonim AI | Bir deneme hedefi; Turnstile + anonim oturum/kota + global harcama koruması |
| AI bütçesi | 5 USD toplam tahsis; 4,50 USD uygulama kapatma eşiği |
| Geliştirme | Temiz repo; Codex küçük branch/PR görevleri; kaynak kod bu pakette yok |

## 3. Kullanıcı senaryoları

**UJ-01 — Anonim yerel tasarım:** Boş canvas/şablon aç → dört node ve handle ekle → input alanlarını tanımla → doğrula → yerel kaydet → sayfa yenile → aynı çalışmayı gör → JSON dışarı aktar. Bu akış için hesap gerekmez.

**UJ-02 — Simülasyon:** Kullanıcı input değerlerini girer → Start'tan başlatır → Condition dallarını görür → Approval'a gelince yürütme durur → onay veya ret verir → sonuca ve adım günlüğüne ulaşır. Harici işlem çalışmaz.

**UJ-03 — AI create:** Prompt + Turnstile (gerektiğinde) → global/ziyaretçi kotası kontrolü → model yapılandırılmış taslak önerir → sunucu şema ve mantıksal doğrulamadan geçirir → önizleme → kullanıcı 'Uygula' veya 'Vazgeç'. Prompt yüzünden kayıt değişmez.

**UJ-04 — AI edit:** Açık workflow + mevcut grafik hash'i/revizyonu + prompt → sunucu kontrollü patch listesi önerir → orijinal / önerilen diff → kullanıcı onayı → hash hâlâ eşleşiyorsa graph'a uygulanır; bulut workflow ise yeni revision kaydedilir. Çakışma durumunda otomatik üzerine yazma yoktur.

**UJ-05 — E-posta/şifre:** Firebase aracılığıyla kayıt, e-posta doğrulama, giriş ve parola sıfırlama. Worker imzalı Firebase ID token'ını doğrular ve sahipliği D1'de yönetir. E-posta doğrulanmadan bulut kaydı ve ek üye AI hakkı açılmaz (önerilen varsayılan).

**UJ-06 — Giriş sonrası taşıma:** Kullanıcıya yerel workflow'ları buluta taşımak isteyip istemediği sorulur; açık onay üzerine kopyalar D1'e kaydedilir. Yerel kopyalar başarılı geçiş ve kullanıcı tercihine kadar silinmez (önerilen varsayılan).

## 4. Fonksiyonel gereksinimler

| ID | Gereksinim | Öncelik | Kabul ölçütü |
|---|---|---|---|
| FR-01 | Start / Approval / Condition / End node ekleme, ayar ve bağlantılar | P0 | Dört node canvas'a eklenir, yapılandırılır, silinir ve bağlanır. |
| FR-02 | Tipli kullanıcı input alanları oluşturma | P0 | `number`, `string`, `boolean`, `date`, `enum` tanımlanabilir; benzersiz field key gerekir. |
| FR-03 | Doğrulama ve açıklanabilir hatalar | P0 | Tüm çıkışlar, erişilebilirlik, döngüsüzlük ve tipler kontrol edilir; hatalı node gösterilir. |
| FR-04 | Adım adım, manuel onay/ret simülasyonu | P0 | Approval'da bekler; kullanıcı seçince doğru handle üzerinden ilerler. |
| FR-05 | Yerel kayıt, JSON import/export, bozuk dosya güvenliği | P0 | Yenilemeden sonra korunur; bozuk import aktif akışı bozmaz. |
| FR-06 | AI ile yeni workflow taslağı | P0 | Sonuç validasyonu ve önizleme olmadan canvas değişmez. |
| FR-07 | AI ile mevcut workflow için operasyon bazlı edit | P0 | Değişmeyen node ID'leri korunur; stale hash engellenir. |
| FR-08 | Diff, approve/reject, undo | P0 | Eklenen/değişen/silinen öğeler görünür; ret sıfır değişikliktir. |
| FR-09 | Firebase e-posta/şifre / verify / reset | P0 | Sahte veya süresi dolmuş token kabul edilmez; şifre D1'de tutulmaz. |
| FR-10 | Üyeye özel workflow CRUD, revisions | P0 | Owner izolasyonu ve 409 revision conflict zorunlu. |
| FR-11 | TR/EN; klavye erişilebilirliği | P0 | Ana senaryolar iki dilde tamamlanır. |
| FR-12 | Anonim AI bir hak hedefi, güvenlik ve harcama kontrolü | P0 | Turnstile doğrulanır; limit ve kill switch çalışır; eşik sonrası model çağrısı yoktur. |
| FR-13 | Şablonlar | P1 | En az 3 yerleşik örnek: satın alma, izin, masraf. |
| FR-14 | Revizyon restore ve simülasyon history | P1 | Geri alma yeni revision yaratır; kaydedilmiş simülasyonlar isteğe bağlıdır. |
| FR-15 | Gerçek approval inbox/atama, webhook/e-posta node'u | P2 | MVP kapsam dışı. |

## 5. Kapsam dışı

Gerçek role-based approval (rol adı sadece simülasyon metadatası), insanlara görev/e-posta gönderimi, üçüncü taraf ERP bağlantısı, BPMN 2.0 tam uyumu, sınırsız düğüm/sonsuz döngü, collaborative editing, full low-code scripting, AI'nın kendiliğinden bir workflow'u yayınlaması. İleriye dönük şema bu özellikleri eklemeye izin verir; ilk sürüm için altyapısı peşinen yazılmaz (YAGNI).

## 6. Genel kabul kriterleri

- **AC-01:** Anonim kullanıcı giriş olmadan workflow üretir; input alanı, koşul ve iki dallı onay ekler; sayfa yenileyince akış bulunur.
- **AC-02:** Aynı input + aynı onay kararları = aynı node/edge adım dizisi ve sonuç (run ID/zaman hariç).
- **AC-03:** 15000 sayısal tutar true, 5000 false dalından gider; koşul karşılaştırması input tipiyle uyumludur.
- **AC-04:** Approval sırasında durum `waiting_for_approval`; karar verilene kadar ilerlemez; `approved/rejected` çıkışı doğru seçilir.
- **AC-05:** Start sayısı farklı, bağlı olmayan node, eksik handle, self-loop, koşul tipi hatası ve sonsuz yol reddedilir; mesaj lokalizedir.
- **AC-06:** AI create ve edit, kullanıcı onayı olmadan çalışma kopyasını değiştirmez; ret hiçbir kalıcı değişiklik yapmaz.
- **AC-07:** AI edit sonrası değişmeyen node kimliklerinin %100'ü korunur, kaynak graph hash'i değişmişse onay reddedilir.
- **AC-08:** Login olmayan kullanıcı başka kişinin workflow'una hiçbir yoldan erişemez; kullanıcı A, B'nin workflow'unu alamaz veya güncelleyemez.
- **AC-09:** 5 USD toplam bütçe için 4,50 USD uygulama durdurma eşiğine (rezervasyon dahil) varıldığında yeni OpenAI isteği gönderilmez; servis hata durumunda varsayılan fail-closed.
- **AC-10:** Herkese açık AI isteği Turnstile Siteverify'dan geçer; demo hakkı tüketildikten sonra aynı anonim oturum ikinci model çağrısı yapamaz. Farklı cihaz/çerez ile aşılabilme dürüstçe kabul edilir.
- **AC-11:** Geçersiz JSON import veya OpenAI hata yanıtı mevcut çalışma kopyasını değiştirmez.
- **AC-12:** E-posta doğrulama ve parola sıfırlama Firebase ile işler; Workers tarafında parola hash'i/saklama yapılmaz.
- **AC-13:** Staging ve prod ortamlarının D1 verileri/anahtarları ayrıdır; CI typecheck, lint, test ve build kapıları geçilmeden prod deploy edilmez.

## 7. Fonksiyonel olmayan gereksinimler

- Strict TypeScript, versiyonlu ortak graph contract, testlerle doğrulanan saf simulator/validator.
- 50 node / 100 edge MVP üst limiti; 50 node'lu örnek akışın saf simülasyon hesabı referans makinada 1 saniyeden kısa hedeflenir.
- Desktop-first, dar ekranlarda erişilebilir okuma/simülasyon; mobilde tam sürükle-bırak UX'i MVP zorunluluğu değildir.
- API input sınırları (prompt boyutu, graph boyutu, token çıkış sınırı), bütün auth kontrolü sunucuda.
- CSP, XSS/gömülü HTML koruması, gizli anahtarların yalnızca environment secret oluşu, prompt/ham token loglanmaması.
- Error envelope + requestId, test edilebilir 400/401/403/404/409/422/429/503 davranışları.
- Zorunlu performans ölçümü: Workers CPU limiti ile uyum, ağır computation'ın tarayıcıya alınması.
- Karşılaştırma/simülasyon kullanıcıya açıkça 'simulation only' olarak etiketlenir.

## 8. Kalite hedefleri (ölçülebilir)

- Altın test setinde en az 20 AI prompt; ilk denemede semantik açıdan geçerli graph veya patch ≥%85 (hedef, taahhüt değil).
- Korunması gereken stable node ID oranı: %100.
- Core graph validation + simulator için sınır/negatif testler; kritik dallar için parametrik test seti.
- E2E: create → edit → diff → approve → simulate → optional login → cloud save.
- AI modeli/sürümü değiştirilince aynı değerlendirme seti tekrar koşulur; kalite ve token başı maliyet birlikte ölçülür.

## 9. Bilinen riskler ve ilkeler

1. Anonim 'bir kişi, bir deneme' IP/cookie ile kusursuz uygulanamaz; merkezi toplam bütçe mutlak güvenlik katmanıdır.
2. 5 USD kullanıcı kararına göre **tek seferlik toplam** bütçedir, otomatik yenilenen aylık limit değildir.
3. Cloudflare Free genel istek/CPU/D1 limitleri aşılabilir; platform ücretsiz kotaları ücret garantisi değil, operasyonel limittir.
4. Firebase vendor bağımlılığı var; Worker'da auth-port soyutlaması ile başka sağlayıcıya geçiş mümkün olur.
5. OpenAI Structured Outputs JSON şekline uyumu güçlendirir, iş akışı semantiğinin doğruluğunu garanti etmez.
6. E-posta doğrulama ve otomatik yerel→bulut taşıma davranışı v1.1 önerilen varsayılandır; ürün sahibinin son onayı aşağıdaki takip sorularında alınabilir.

## 10. Ertelenen ürün kararları

- Üyelikten sonra varsayılan günlük AI hakkı: **öneri** 3 çağrı / doğrulanmış kullanıcı / UTC gün; yapılandırılabilir.
- Yerel workflow'ların buluta taşınması: **öneri** isteğe bağlı, kullanıcı onayıyla.
- Kayıtlı kullanıcıya demo denemesinin ek hak sağlayıp sağlamaması: **öneri** anonim ve üye kotalarını ayrı saymak ancak global USD bütçeyi ortak tutmak.
