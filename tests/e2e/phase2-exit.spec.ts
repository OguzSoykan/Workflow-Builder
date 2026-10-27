import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const add = (page: Page, kind: string) =>
  page.getByRole('button', { name: `${kind} ekle`, exact: true }).click();
const steps = (page: Page) =>
  page.getByRole('list', { name: 'Akıştaki adımlar', exact: true }).getByRole('button');
const undo = (page: Page) => page.getByRole('button', { name: 'Geri al', exact: true });
const redo = (page: Page) => page.getByRole('button', { name: 'Yinele', exact: true });
const validation = (page: Page) => page.getByRole('region', { name: 'Doğrulama', exact: true });
const select = (page: Page, label: string) =>
  page
    .getByRole('list', { name: 'Akıştaki adımlar', exact: true })
    .getByRole('button', { name: label, exact: false })
    .click();
const apply = (page: Page) =>
  page.getByRole('button', { name: 'Değişiklikleri uygula', exact: true }).click();

async function connect(page: Page, source: string, handle: string, target: string) {
  await page
    .getByRole('combobox', { name: 'Kaynak adım', exact: true })
    .selectOption({ label: source });
  await page.getByRole('combobox', { name: 'Çıkış', exact: true }).selectOption({ label: handle });
  await page
    .getByRole('combobox', { name: 'Hedef adım', exact: true })
    .selectOption({ label: target });
  await page.getByRole('button', { name: 'Bağlantı ekle', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
}

test('undoes and redoes meaningful edits with buttons and shortcuts', async ({ page }) => {
  await page.goto('/');
  await expect(undo(page)).toBeDisabled();
  await expect(redo(page)).toBeDisabled();
  await add(page, 'Başlangıç');
  await add(page, 'Bitiş');
  const end = page.locator('.react-flow__node').last();
  const before = await end.getAttribute('style');
  const box = await end.boundingBox();
  if (!box) throw new Error('Node is not rendered');
  await page.mouse.move(box.x + 55, box.y + 35);
  await page.mouse.down();
  await page.mouse.move(box.x + 135, box.y + 95, { steps: 12 });
  await page.mouse.up();
  await expect(end).not.toHaveAttribute('style', before ?? '');

  // One drag is one step; selection changes are not steps.
  await undo(page).click();
  await expect(end).toHaveAttribute('style', before ?? '');
  await expect(steps(page)).toHaveCount(2);
  await undo(page).click();
  await expect(steps(page)).toHaveCount(1);
  await redo(page).click();
  await expect(steps(page)).toHaveCount(2);

  await page.locator('.react-flow__pane').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ControlOrMeta+z');
  await expect(steps(page)).toHaveCount(1);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(steps(page)).toHaveCount(2);

  // Inside a text field the shortcut stays native and leaves the workflow alone.
  await select(page, 'Bitiş');
  const name = page.getByLabel('Adım adı', { exact: true });
  await name.fill('Bitiş 2');
  await name.press('ControlOrMeta+z');
  await expect(name).toHaveValue('Bitiş');
  await expect(steps(page)).toHaveCount(2);
  await name.fill('Bitiş 2');
  await apply(page);
  await expect(steps(page).last()).toContainText('Bitiş 2');
  await undo(page).click();
  await expect(steps(page).last()).toHaveText('BitişBitiş');
  await expect(redo(page)).toBeEnabled();
  await add(page, 'Onay');
  await expect(redo(page)).toBeDisabled();
});

test('phase 2 exit: build, validate, persist, export, import and undo a workflow', async ({
  page,
}) => {
  await page.goto('/');
  const inputs = page.getByRole('region', { name: 'Giriş alanları', exact: true });
  await inputs.getByRole('button', { name: 'Alan ekle', exact: true }).click();
  await inputs.getByLabel('Alan anahtarı', { exact: true }).fill('tutar');
  await inputs.getByLabel('Alan adı', { exact: true }).fill('Tutar');
  await inputs.getByRole('combobox', { name: 'Alan türü', exact: true }).selectOption('number');
  await inputs.getByRole('button', { name: 'Alanı uygula', exact: true }).click();

  for (const kind of ['Başlangıç', 'Koşul', 'Onay', 'Bitiş', 'Bitiş']) await add(page, kind);
  await page.getByLabel('Adım adı', { exact: true }).fill('Ret');
  await page.getByRole('combobox', { name: 'Bitiş sonucu', exact: true }).selectOption('rejected');
  await apply(page);
  await select(page, 'Koşul');
  await page
    .getByRole('combobox', { name: 'Karşılaştırılacak alan', exact: true })
    .selectOption('tutar');
  await page.getByRole('combobox', { name: 'Karşılaştırma', exact: true }).selectOption('gt');
  await page.getByLabel('Karşılaştırma değeri', { exact: true }).fill('10000');
  await page.getByLabel('Adım adı', { exact: true }).fill('Tutar kontrolü');
  await apply(page);
  await expect(page.locator('.react-flow__node').nth(1)).toContainText('Tutar büyüktür 10000');

  await connect(page, 'Başlangıç (1)', 'Sonraki', 'Tutar kontrolü (1)');
  await connect(page, 'Tutar kontrolü (2)', 'Doğru', 'Onay (2)');
  await connect(page, 'Tutar kontrolü (2)', 'Yanlış', 'Bitiş (3)');
  await connect(page, 'Onay (3)', 'Onaylandı', 'Bitiş (3)');
  await expect(validation(page)).not.toContainText('çalıştırılabilir');
  await connect(page, 'Onay (3)', 'Reddedildi', 'Ret (4)');
  await expect(validation(page)).toContainText('Akış çalıştırılabilir');

  await page.reload();
  await expect(steps(page)).toHaveCount(5);
  await expect(page.locator('.react-flow__edge')).toHaveCount(5);
  await expect(validation(page)).toContainText('Akış çalıştırılabilir');
  await expect(undo(page)).toBeDisabled();

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON dışa aktar', exact: true }).click();
  const text = await readFile((await (await downloading).path()) ?? '', 'utf8');

  await select(page, 'Onay');
  await page.getByRole('button', { name: 'Adımı sil', exact: true }).click();
  await expect(validation(page)).not.toContainText('çalıştırılabilir');
  await page
    .getByLabel('JSON içe aktar', { exact: true })
    .setInputFiles({ name: 'akis.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: 'Taslağı değiştir', exact: true }).click();
  await expect(steps(page)).toHaveCount(5);
  await expect(validation(page)).toContainText('Akış çalıştırılabilir');

  await undo(page).click();
  await expect(steps(page)).toHaveCount(4);
  await redo(page).click();
  await expect(steps(page)).toHaveCount(5);
  await page.reload();
  await expect(validation(page)).toContainText('Akış çalıştırılabilir');
});
