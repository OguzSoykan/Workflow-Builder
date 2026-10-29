import { expect, test, type Page } from '@playwright/test';
import { openTab } from './ui';

const sim = (page: Page) => page.getByRole('region', { name: 'Simülasyon', exact: true });
const status = (page: Page) => sim(page).getByRole('status');

async function load(page: Page, name: string) {
  await openTab(page, 'Oluştur');
  await page
    .getByRole('region', { name: 'Örnekten başla', exact: true })
    .getByRole('button', { name, exact: true })
    .click();
  await openTab(page, 'Oluştur');
  await page.getByRole('button', { name: 'Örneği yükle', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Doğrulama', exact: true })).toContainText(
    'Akış çalıştırılabilir',
  );
}
async function run(
  page: Page,
  values: Record<string, string>,
  decisions: string[],
  result: string,
) {
  for (const [label, value] of Object.entries(values)) {
    await openTab(page, 'Simülasyon');
    const control = sim(page).getByLabel(label, { exact: true });
    await openTab(page, 'Simülasyon');
    if ((await control.evaluate((element) => element.tagName)) === 'SELECT')
      await control.selectOption({ label: value });
    else await control.fill(value);
  }
  await openTab(page, 'Simülasyon');
  await sim(page)
    .getByRole('button', { name: /Simülasyonu başlat|Yeniden başlat/ })
    .click();
  for (const decision of decisions) {
    await openTab(page, 'Simülasyon');
    await expect(status(page)).toHaveText('Onay bekleniyor');
    await openTab(page, 'Simülasyon');
    await sim(page).getByRole('button', { name: decision, exact: true }).click();
  }
  await openTab(page, 'Simülasyon');
  await expect(status(page)).toHaveText(result);
}

test('purchase example routes by amount (AC-03) and waits for the manager (AC-04)', async ({
  page,
}) => {
  await page.goto('/');
  await load(page, 'Satın alma talebi');
  await expect(page.getByRole('heading', { name: 'Satın alma talebi', exact: true })).toBeVisible();
  await run(page, { 'Tutar (Sayı, gerekli)': '5000' }, [], 'Sonuç: akış tamamlandı');
  await run(page, { 'Tutar (Sayı, gerekli)': '15000' }, ['Reddet'], 'Sonuç: akış reddedildi');
  await openTab(page, 'Simülasyon');
  await expect(sim(page).getByRole('list', { name: 'Simülasyon adımları' })).toContainText(
    'Yönetici onayı',
  );
});

test('leave example needs two approvals for long leave and one for short leave', async ({
  page,
}) => {
  await page.goto('/');
  await load(page, 'İzin talebi');
  const values = {
    'Gün sayısı (Sayı, gerekli)': '10',
    'İzin türü (Seçenek listesi, gerekli)': 'Yıllık',
  };
  await run(page, values, ['Onayla', 'Onayla'], 'Sonuç: akış tamamlandı');
  await run(
    page,
    { ...values, 'Gün sayısı (Sayı, gerekli)': '3' },
    ['Reddet'],
    'Sonuç: akış reddedildi',
  );
  await openTab(page, 'Simülasyon');
  await expect(sim(page).getByRole('list', { name: 'Simülasyon adımları' })).toContainText(
    'Ekip lideri onayı',
  );
});

test('expense example rejects missing invoices and asks finance for large amounts', async ({
  page,
}) => {
  await page.goto('/');
  await load(page, 'Masraf iadesi');
  await run(
    page,
    { 'Fatura var mı (Doğru / yanlış, gerekli)': 'Yanlış', 'Tutar (Sayı, gerekli)': '100' },
    [],
    'Sonuç: akış reddedildi',
  );
  await run(
    page,
    { 'Fatura var mı (Doğru / yanlış, gerekli)': 'Doğru', 'Tutar (Sayı, gerekli)': '3000' },
    ['Onayla'],
    'Sonuç: akış tamamlandı',
  );
});

test('loading an example asks first and can be undone', async ({ page }) => {
  await page.goto('/');
  await openTab(page, 'Adımlar');
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await openTab(page, 'Oluştur');
  const examples = page.getByRole('region', { name: 'Örnekten başla', exact: true });
  await openTab(page, 'Oluştur');
  await examples.getByRole('button', { name: 'Masraf iadesi', exact: true }).click();
  await openTab(page, 'Oluştur');
  await expect(examples.getByRole('group', { name: 'Örnek yükleme onayı' })).toContainText(
    'mevcut taslağın yerine geçecek',
  );
  await openTab(page, 'Oluştur');
  await examples.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await openTab(page, 'Adımlar');
  const steps = page
    .getByRole('list', { name: 'Akıştaki adımlar', exact: true })
    .getByRole('button');
  await expect(steps).toHaveCount(1);
  await load(page, 'Masraf iadesi');
  await openTab(page, 'Adımlar');
  await expect(steps).toHaveCount(6);
  await page.getByRole('button', { name: 'Geri al', exact: true }).click();
  await expect(steps).toHaveCount(1);
});
