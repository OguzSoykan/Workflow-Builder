import { expect, test } from '@playwright/test';
import { openTab } from './ui';

test('creates all five input types and preserves defaults and bounds when reopening', async ({
  page,
}) => {
  await page.goto('/');
  await openTab(page, 'Alanlar');
  const panel = page.getByRole('region', { name: 'Giriş alanları', exact: true });
  for (const [type, label, value] of [
    ['number', 'Tutar', '0'],
    ['string', 'Açıklama', ''],
    ['boolean', 'Aktif', 'false'],
    ['date', 'Tarih', '2024-02-29'],
    ['enum', 'Bölüm', 'Finans'],
  ] as const) {
    await openTab(page, 'Alanlar');
    await panel.getByRole('button', { name: 'Alan ekle', exact: true }).click();
    await openTab(page, 'Alanlar');
    await panel.getByLabel('Alan anahtarı', { exact: true }).fill(type);
    await openTab(page, 'Alanlar');
    await panel.getByLabel('Alan adı', { exact: true }).fill(label);
    await openTab(page, 'Alanlar');
    await panel.getByRole('combobox', { name: 'Alan türü', exact: true }).selectOption(type);
    await openTab(page, 'Alanlar');
    await panel.getByLabel('Zorunlu alan', { exact: true }).check();
    if (type === 'enum')
      await panel
        .getByRole('textbox', { name: 'Seçenekler (her satıra bir seçenek)', exact: true })
        .fill('Finans\nSatış');
    await openTab(page, 'Alanlar');
    await panel.getByLabel('Varsayılan değer kullan', { exact: true }).check();
    if (type === 'boolean')
      await panel
        .getByRole('combobox', { name: 'Varsayılan değer', exact: true })
        .selectOption(value);
    else await panel.getByLabel('Varsayılan değer', { exact: true }).fill(value);
    if (type === 'number') {
      await openTab(page, 'Alanlar');
      await panel.getByLabel('Alt sınır', { exact: true }).fill('-1');
      await openTab(page, 'Alanlar');
      await panel.getByLabel('Üst sınır', { exact: true }).fill('10');
    }
    await openTab(page, 'Alanlar');
    await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
    await openTab(page, 'Alanlar');
    await expect(panel.getByRole('alert')).toHaveCount(0);
    await openTab(page, 'Alanlar');
    await expect(panel.getByRole('heading', { name: 'Yeni alan', exact: true })).toHaveCount(0);
    await openTab(page, 'Alanlar');
    await panel.getByRole('button', { name: `${label} alanını düzenle`, exact: true }).click();
    await openTab(page, 'Alanlar');
    await expect(panel.getByLabel('Varsayılan değer kullan', { exact: true })).toBeChecked();
    await openTab(page, 'Alanlar');
    await expect(panel.getByLabel('Zorunlu alan', { exact: true })).toBeChecked();
    const defaultInput =
      type === 'boolean'
        ? panel.getByRole('combobox', { name: 'Varsayılan değer', exact: true })
        : panel.getByLabel('Varsayılan değer', { exact: true });
    await expect(defaultInput).toHaveValue(value);
    await openTab(page, 'Alanlar');
    if (type === 'number')
      await expect(panel.getByLabel('Alt sınır', { exact: true })).toHaveValue('-1');
    await openTab(page, 'Alanlar');
    await panel.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  }
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('listitem')).toHaveCount(5);
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Tutar alanını düzenle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Varsayılan değer kullan', { exact: true }).uncheck();
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Tutar alanını düzenle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByLabel('Varsayılan değer kullan', { exact: true })).not.toBeChecked();
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Tutar alanını sil', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('listitem')).toHaveCount(4);
});

test('rejects invalid drafts, preserves referenced fields and renames condition references', async ({
  page,
}) => {
  await page.goto('/');
  await openTab(page, 'Alanlar');
  const panel = page.getByRole('region', { name: 'Giriş alanları', exact: true });
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alan ekle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan anahtarı', { exact: true }).fill('alan');
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan adı', { exact: true }).fill('Başvuru');
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Adımlar');
  await page.getByRole('button', { name: 'Koşul ekle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByText('Bağlı koşullar: Koşul', { exact: true })).toBeVisible();
  await openTab(page, 'Alanlar');
  await expect(
    panel.getByRole('button', { name: 'Başvuru alanını sil', exact: true }),
  ).toBeDisabled();
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Başvuru alanını düzenle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan anahtarı', { exact: true }).fill('basvuru');
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.locator('code')).toHaveText('basvuru');
  await openTab(page, 'Alanlar');
  await expect(panel.getByText('Bağlı koşullar: Koşul', { exact: true })).toBeVisible();
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Başvuru alanını düzenle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByRole('combobox', { name: 'Alan türü', exact: true }).selectOption('number');
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('alert')).toContainText('koşulu geçersiz');
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alan ekle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan anahtarı', { exact: true }).fill('basvuru');
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan adı', { exact: true }).fill('Tekrar');
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('alert')).toContainText('zaten kullanılıyor');
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('listitem')).toHaveCount(1);
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan anahtarı', { exact: true }).fill('bolum');
  await openTab(page, 'Alanlar');
  await panel.getByRole('combobox', { name: 'Alan türü', exact: true }).selectOption('enum');
  await panel
    .getByRole('textbox', { name: 'Seçenekler (her satıra bir seçenek)', exact: true })
    .fill('A\nA');
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('alert')).toContainText('benzersiz seçenek');
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('listitem')).toHaveCount(1);
  await panel
    .getByRole('textbox', { name: 'Seçenekler (her satıra bir seçenek)', exact: true })
    .fill('A\nB');
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('alert')).toHaveCount(0);
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('listitem')).toHaveCount(2);
});

test('keeps input form usable on mobile and renders labels as plain text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await openTab(page, 'Alanlar');
  const panel = page.getByRole('region', { name: 'Giriş alanları', exact: true });
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alan ekle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan anahtarı', { exact: true }).fill('new');
  const label = '<img src=x onerror=alert(1)>';
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan adı', { exact: true }).fill(label);
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.locator('img')).toHaveCount(0);
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: `${label} alanını düzenle`, exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByLabel('Alan anahtarı', { exact: true })).toHaveValue('new');
  await openTab(page, 'Alanlar');
  await expect(panel.getByLabel('Alan adı', { exact: true })).toHaveValue(label);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await openTab(page, 'Alanlar');
  await panel.screenshot({ path: test.info().outputPath('inputs-mobile.png') });
});
