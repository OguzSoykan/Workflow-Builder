# ADR-012 — npm workspace ve TypeScript araç zinciri

**Tarih:** 22 Ekim 2026  
**Durum:** WB-001A kapsamında uygulanan teknik karar; PR incelemesinde.  
**Yetki:** Kullanıcının “devam et” talimatı, önerilen ilk kart WB-001A için uygulama onayı olarak kaydedildi. Ürün gereksinimi değişikliği yok.

## Bağlam

Architecture ADR-001/002/003, tek repo içinde web, Worker, ortak contract ve saf core sınırlarını gerektiriyor. WB-001A, paket yöneticisi/sürüm ve strict TS temelini kurar; React/Hono/health WB-001B, test runner WB-001C kapsamındadır.

## Karar

- **npm workspaces**, tek kök `package-lock.json`, dört private paket. Ek monorepo orchestrator, pnpm/Corepack veya workspace başına lockfile yok.
- **Node 24.22.1 LTS + beraberindeki npm 11.19.1** sabitlendi. `package.json` engines ve `.npmrc` engine-strict kurulumda sürüm uyuşmazlığını reddeder; `packageManager` araç kimliğini, `.nvmrc` Node seçimini bildirir. Sürümler birlikte ve ayrı bir bakım değişikliğiyle güncellenir.
- **TypeScript 6.0.3** tek harici geliştirme bağımlılığı. TypeScript 7.0 yayımlanmış olsa da kararlı programatik compiler API sunmuyor; sonraki ESLint entegrasyonunda iki compiler/alias eklememek için 6.0 serisi seçildi. 7.1+ uyumluluğu ihtiyaç halinde ayrı görevde değerlendirilir.
- ESM, `moduleResolution=Bundler`, `target/lib=ES2022`, `noEmit`, strict, exact optional properties ve unchecked indexed access kontrolleri. Paylaşılan kaynaklar browser/Worker bundler'ları tarafından ileride derlenecek; ayrı library emit/publish hattı yok.
- Her workspace kendi tsconfig'i ile kontrol edilir. Web yalnızca kendi config'inde DOM lib'lerini ekler. Core/contract/şimdilik Worker için `types=[]` ve ES lib'leri, ambient Node/DOM sızıntısını engeller. Gerçek Worker tipleri runtime görevinde eklenir.
- Ortak paketler yalnızca `exports["."]` üzerinden kaynak entry point sunar; wildcard/internal export yok. App'ler `exports={}` ile tüketilecek paket API'si sunmaz. `paths` alias ile sınırları bypass etmeyiz.
- Bağımlılık yönü: web/worker → core/contract; core → contract; contract → hiçbir workspace. Eşleşen yerel `0.0.0` sürümleri npm tarafından workspace link'i olarak çözülür. Hiçbiri registry'ye yayınlanmaz.

## Alternatifler ve sonuçlar

pnpm kullanılabilir, ancak dört paket için ek paket yöneticisi/lockfile biçimi bu aşamada fayda sağlamıyor. Ayrı depolar veya Nx/Turbo görev katmanı gereksiz. Composite build/project references gerçek emit/cache ihtiyacı oluşursa değerlendirilir; şu an dört `noEmit` kontrolü yeterlidir.

Export map normal paket deep import'larını sınırlar; npm hoisting veya göreli `../../` import'ları tam mimari enforcement sağlamaz. Bu kartta manifest/config/compile probe ve diff incelemesi vardır; WB-001B lint kurallarında çapraz uygulama ve internal-path import'ları ayrıca sınırlandırılmalıdır. Node/DOM type yokluğu tek başına saf fonksiyon garantisi değildir; saf core için kod incelemesi ve ileride davranış testleri gerekir.

Mevcut global Node 20 değiştirilmedi. Doğrulama için resmi ZIP ve SHA256 manifest'iyle doğrulanan portable Node, repository dışında kullanıcı yerel araç dizinine açıldı; binary/cache Git'e eklenmez. Yeni geliştirici aynı Node/npm sürümlerini istediği sürüm yöneticisi veya resmi dağıtımdan seçebilir.

## Kabul ve doğrulama

Temiz checkout `npm ci`, dört workspace çözümleme/typecheck, geçici yanlış tip ve environment/internal import negatif probe'ları, lockfile değişmeme ve diff kontrolü. Gerçek sonuçlar [WB-001A doğrulama kaydında](../verification/WB-001A.md) tutulur. Sağlayıcı servisi, runtime dependency veya ücretli çağrı yok.

## Resmi kaynaklar

- [Node 24.22.1 dağıtımı](https://nodejs.org/en/blog/release/v24.22.1/) ve [resmi sürüm indeksi](https://nodejs.org/dist/index.json).
- [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/), [engines](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#engines).
- [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html), [bundler resolution](https://www.typescriptlang.org/tsconfig/moduleResolution.html), [TypeScript 7.0 compiler API geçişi](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
