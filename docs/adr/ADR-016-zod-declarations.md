# ADR-016 — Zod 4.6 güvenlik yükseltmesi ve declaration kontrolü

**Durum:** Kabul edildi (27 Ekim 2026). **Kart:** güvenlik takibi GHSA-mrhx-c7xc-m3w5.

## Bağlam

Zod 4.3.6, büyük kısıtlı koleksiyonlarda bellek tüketimine yol açan yüksek önemli
GHSA-mrhx-c7xc-m3w5 bulgusunu taşıyordu; düzeltme 4.6.6+ sürümündedir. Zod 4.6.7
declaration dosyaları DOM `URL` tipine atıf yapar. `workflow-contract` ve
`workflow-core` yalnız `ES2022` lib ile derlenir ve bilinçli olarak DOM/Node tipi
içermez; bu yüzden yükseltme library declaration kontrolünde `TS2304` verdi.

## Karar

- Zod `4.6.7` sürümüne sabitlenir.
- Yalnız saf paketlerin tsconfig'inde `skipLibCheck: true` açılır. Bu ayar yalnız
  `.d.ts` dosyalarının iç kontrolünü atlar; paket kaynakları için `URL`, `fetch` ve
  `process` hâlâ tanımsızdır. Global bir `URL` ortam tipi eklenmez.
- Web/worker/test/tools projeleri tam library kontrolüyle kalır (ADR-015 değişmez).

## Kanıt

`npm audit`: 0 bulgu. Contract ve core'a eklenen geçici probe'da `URL`/`fetch`/`process`
üçü de reddedildi, probe silindi. Typecheck, lint, format, 292 Vitest + scanner +
OpenAPI, negatif kapılar, 29 Chromium testi, build, secret taramaları geçti; OpenAPI
şema çıktısı değişmedi; validator benchmark median 0,59 ms / p95 0,92 ms.

## Sonuçlar

Zod declaration'larındaki olası tip hataları bu iki pakette derleyiciden gizlenir; tüketici
projeler (web/worker) aynı declaration'ları tam kontrolle derlemeye devam eder. Zod yeni
sürümünde DOM bağımlılığı kalkarsa `skipLibCheck` kaldırılmalıdır.
