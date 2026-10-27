import { expect, test, type Page } from '@playwright/test';

const add = (page: Page, kind: string) =>
  page.getByRole('button', { name: `${kind} ekle`, exact: true }).click();
const panel = (page: Page) => page.getByRole('region', { name: 'Doğrulama', exact: true });
const issues = (page: Page) =>
  panel(page).getByRole('list', { name: 'Doğrulama sorunları', exact: true }).getByRole('listitem');

async function connect(page: Page, source: string, target: string) {
  await page
    .getByRole('combobox', { name: 'Kaynak adım', exact: true })
    .selectOption({ label: source });
  await page
    .getByRole('combobox', { name: 'Hedef adım', exact: true })
    .selectOption({ label: target });
  await page.getByRole('button', { name: 'Bağlantı ekle', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
}

test('explains graph problems, selects the related step and clears when executable', async ({
  page,
}) => {
  await page.goto('/');
  await expect(issues(page)).toHaveText([
    'Akışta bitiş adımı yok; en az bir bitiş adımı ekleyin.',
    'Akışta başlangıç adımı yok; bir başlangıç adımı ekleyin.',
  ]);
  await add(page, 'Başlangıç');
  await add(page, 'Onay');
  await add(page, 'Koşul');
  await add(page, 'Bitiş');
  await expect(issues(page)).toContainText([
    '“Onay” adımının “Onaylandı” çıkışı bağlı değil.',
    '“Koşul” koşulu tanımlı bir giriş alanına bağlı değil.',
    '“Koşul” adımına başlangıçtan ulaşılamıyor.',
  ]);
  const approvalCard = page.locator('.react-flow__node').nth(1);
  await expect(approvalCard).toContainText('⚠');
  await expect(approvalCard.locator('.workflow-card')).toHaveClass(/has-issues/);

  await page.locator('.react-flow__pane').click({ position: { x: 5, y: 5 } });
  await panel(page)
    .getByRole('button', { name: '“Koşul” adımına başlangıçtan ulaşılamıyor.', exact: true })
    .click();
  await expect(page.getByLabel('Adım adı', { exact: true })).toHaveValue('Koşul');

  await page.getByRole('button', { name: 'Adımı sil', exact: true }).click();
  await connect(page, 'Başlangıç (1)', 'Onay (1)');
  await connect(page, 'Onay (2)', 'Bitiş (2)');
  await expect(issues(page)).toHaveText([
    '“Başlangıç” adımından sonraki her yol bir bitiş adımına varmıyor.',
    '“Onay” adımının “Reddedildi” çıkışı bağlı değil.',
  ]);
  await add(page, 'Bitiş');
  await connect(page, 'Onay (2)', 'Bitiş (3)');
  await expect(panel(page)).toContainText('Akış çalıştırılabilir; doğrulama sorunu yok.');
  await expect(page.locator('.workflow-card.has-issues')).toHaveCount(0);
});
