import { expect, test, type Page } from '@playwright/test';
import { openTab } from './ui';

const DRAFT_KEY = 'workflow-builder:draft:v1';
const steps = (page: Page) =>
  page.getByRole('list', { name: 'Akıştaki adımlar', exact: true }).getByRole('button');
const badge = (page: Page) => page.locator('.draft-badge');
const add = async (page: Page, kind: string) => {
  await openTab(page, 'Adımlar');
  await page.getByRole('button', { name: `${kind} ekle`, exact: true }).click();
};

test('restores an incomplete draft after refresh', async ({ page }) => {
  await page.goto('/');
  await expect(badge(page)).toHaveText('Kaydedilecek değişiklik yok');
  await add(page, 'Başlangıç');
  await add(page, 'Koşul');
  await openTab(page, 'Özellikler');
  await page.getByLabel('Adım adı', { exact: true }).fill('Tutar kontrolü');
  await openTab(page, 'Özellikler');
  await page.getByRole('button', { name: 'Değişiklikleri uygula', exact: true }).click();
  await expect(badge(page)).toHaveText('Tarayıcıda kaydedildi');
  const before = await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY);
  await page.reload();
  await openTab(page, 'Adımlar');
  await expect(steps(page)).toHaveText(['BaşlangıçBaşlangıç', 'Tutar kontrolüKoşul']);
  await expect(badge(page)).toHaveText('Tarayıcıda kaydedildi');
  await expect(page.getByRole('alert')).toHaveCount(0);
  // Loading alone does not rewrite the stored draft.
  expect(await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY)).toBe(before);
});

test('backs up a corrupt draft and opens an empty editor', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => localStorage.setItem(key, '{"schemaVersion":1'), DRAFT_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toHaveText(
    'Önceki taslak okunamadı. Yedeklendi ve boş bir taslakla başlandı.',
  );
  await openTab(page, 'Adımlar');
  await expect(steps(page)).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => [localStorage.getItem(key), localStorage.getItem(`${key}:corrupt`)],
      DRAFT_KEY,
    ),
  ).toEqual([null, '{"schemaVersion":1']);
  await add(page, 'Başlangıç');
  await expect(badge(page)).toHaveText('Tarayıcıda kaydedildi');
});

test('keeps editing when storage quota is exceeded', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await add(page, 'Başlangıç');
  await expect(badge(page)).toHaveText('Kaydedilemedi: depolama dolu');
  await expect(page.getByRole('alert')).toContainText('depolaması dolu');
  await add(page, 'Bitiş');
  await openTab(page, 'Adımlar');
  await expect(steps(page)).toHaveCount(2);
});

test('warns about another tab and lets the user choose the version', async ({ context }) => {
  const first = await context.newPage();
  await first.goto('/');
  await add(first, 'Başlangıç');
  await expect(badge(first)).toHaveText('Tarayıcıda kaydedildi');

  const second = await context.newPage();
  await second.goto('/');
  await expect(steps(second)).toHaveText(['BaşlangıçBaşlangıç']);
  await expect(first.getByRole('alert')).toHaveCount(0);
  await add(second, 'Bitiş');

  const warning = first.getByRole('alert');
  await expect(warning).toContainText('başka bir sekmede değiştirildi');
  await expect(badge(first)).toHaveText('Otomatik kayıt duraklatıldı');
  await add(first, 'Onay');
  const stored = () => second.evaluate((key) => localStorage.getItem(key), DRAFT_KEY);
  expect(await stored()).not.toContain('"approval"');
  await warning.getByRole('button', { name: 'Diğer sekmedeki sürümü yükle', exact: true }).click();
  await expect(steps(first)).toHaveText(['BaşlangıçBaşlangıç', 'BitişBitiş']);
  await expect(first.getByRole('alert')).toHaveCount(0);

  await add(first, 'Koşul');
  await expect(second.getByRole('alert')).toContainText('başka bir sekmede');
  await second.getByRole('button', { name: 'Bu sekmedekini kaydet', exact: true }).click();
  await expect(second.getByRole('alert')).toHaveCount(0);
  expect(await stored()).not.toContain('"condition"');
  await expect(first.getByRole('alert')).toContainText('başka bir sekmede');
  await first.getByRole('button', { name: 'Diğer sekmedeki sürümü yükle', exact: true }).click();
  await expect(steps(first)).toHaveText(['BaşlangıçBaşlangıç', 'BitişBitiş']);
});
