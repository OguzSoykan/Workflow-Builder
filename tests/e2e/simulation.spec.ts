import { expect, test, type Page } from '@playwright/test';
import { purchaseWorkflow } from '../fixtures/purchase';

const panel = (page: Page) => page.getByRole('region', { name: 'Simülasyon', exact: true });
const trace = (page: Page) =>
  panel(page).getByRole('list', { name: 'Simülasyon adımları', exact: true }).getByRole('listitem');

async function loadPurchase(page: Page) {
  await page.goto('/');
  await page.getByLabel('JSON içe aktar', { exact: true }).setInputFiles({
    name: 'satin-alma.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(purchaseWorkflow())),
  });
  await page.getByRole('button', { name: 'Taslağı değiştir', exact: true }).click();
  await expect(panel(page)).toContainText('Yalnız simülasyon');
}
async function start(page: Page, amount: string) {
  await panel(page).getByLabel('Tutar (Sayı, gerekli)', { exact: true }).fill(amount);
  await panel(page)
    .getByRole('button', { name: /Simülasyonu başlat|Yeniden başlat/ })
    .click();
}

test('routes small amounts to completion and waits for approval on large ones', async ({
  page,
}) => {
  await loadPurchase(page);
  await start(page, '5000');
  await expect(panel(page).getByRole('status')).toHaveText('Sonuç: akış tamamlandı');
  await expect(trace(page)).toHaveText([
    '“Başlangıç” başladı.',
    '“Tutar kontrolü”: Tutar büyüktür 10000 (değer: 5000) → Yanlış.',
    '“Tamamlandı” bitişine ulaşıldı: akış tamamlandı.',
  ]);
  await expect(panel(page).getByRole('group', { name: 'Onay kararı' })).toHaveCount(0);

  await start(page, '15000');
  await expect(panel(page).getByRole('status')).toHaveText('Onay bekleniyor');
  const decision = panel(page).getByRole('group', { name: 'Onay kararı', exact: true });
  await expect(decision).toContainText('“Yönetici onayı” — Yönetici olarak karar verin.');
  await expect(page.locator('.workflow-card.sim-current')).toContainText('Yönetici onayı');
  await expect(page.locator('.workflow-card.sim-visited')).toHaveCount(2);
  await expect(page.locator('.react-flow__edge.sim-edge')).toHaveCount(2);

  await decision.getByRole('button', { name: 'Onayla', exact: true }).click();
  await expect(panel(page).getByRole('status')).toHaveText('Sonuç: akış tamamlandı');
  await expect(trace(page).nth(3)).toHaveText('“Yönetici onayı”: Onaylandı.');
  await expect(page.locator('.react-flow__edge.sim-edge')).toHaveCount(3);

  await start(page, '15000');
  await decision.getByRole('button', { name: 'Reddet', exact: true }).click();
  await expect(panel(page).getByRole('status')).toHaveText('Sonuç: akış reddedildi');
  await expect(trace(page).last()).toHaveText('“Reddedildi” bitişine ulaşıldı: akış reddedildi.');
  await panel(page).getByRole('button', { name: 'Simülasyonu temizle', exact: true }).click();
  await expect(trace(page)).toHaveCount(0);
  await expect(page.locator('.workflow-card.sim-visited, .workflow-card.sim-current')).toHaveCount(
    0,
  );
});

test('asks for missing or invalid inputs and marks a run stale after edits', async ({ page }) => {
  await loadPurchase(page);
  await panel(page).getByRole('button', { name: 'Simülasyonu başlat', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toHaveText(
    '“Tutar” için bir değer girin; alan zorunlu veya bir koşulda kullanılıyor.',
  );
  await start(page, '-1');
  await expect(panel(page).getByRole('alert')).toContainText('sınırları dışında');
  await expect(trace(page)).toHaveCount(0);

  await start(page, '15000');
  await expect(panel(page).getByRole('status')).toHaveText('Onay bekleniyor');
  await page
    .getByRole('list', { name: 'Akıştaki adımlar', exact: true })
    .getByRole('button', { name: 'Yönetici onayı', exact: false })
    .click();
  await page.getByLabel('Onaylayan rolü', { exact: true }).fill('Finans müdürü');
  await page.getByRole('button', { name: 'Değişiklikleri uygula', exact: true }).click();
  await expect(panel(page).getByRole('status')).toHaveText(
    'Akış değişti; simülasyonu yeniden başlatın.',
  );
  await expect(panel(page).getByRole('button', { name: 'Onayla', exact: true })).toBeDisabled();
  await expect(page.locator('.react-flow__edge.sim-edge')).toHaveCount(0);

  await page.getByRole('button', { name: 'Adımı sil', exact: true }).click();
  await expect(panel(page)).toContainText('Simülasyon için önce doğrulama sorunlarını giderin.');
});
