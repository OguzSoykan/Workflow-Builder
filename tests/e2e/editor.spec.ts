import { expect, test } from '@playwright/test';

test('opens an empty editor, adds all node kinds and preserves IDs on rename and drag', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'İş akışı tasarımı' })).toBeVisible();
  await expect(
    page.getByText('Taslak bu tarayıcıda otomatik kaydedilir', { exact: false }),
  ).toBeVisible();
  for (const kind of ['Başlangıç', 'Onay', 'Koşul', 'Bitiş'])
    await page.getByRole('button', { name: `${kind} ekle`, exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Başlangıç ekle', exact: true })).toBeDisabled();
  const end = page.locator('.react-flow__node').last();
  const id = await end.getAttribute('data-id');
  await page.getByLabel('Adım adı', { exact: true }).fill('Bitiş güncellendi');
  await page.getByRole('button', { name: 'Değişiklikleri uygula', exact: true }).click();
  await expect(end).toContainText('Bitiş güncellendi');
  const before = await end.getAttribute('style');
  const box = await end.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Node is not rendered');
  await page.mouse.move(box.x + 55, box.y + 35);
  await page.mouse.down();
  await page.mouse.move(box.x + 95, box.y + 95, { steps: 12 });
  await page.mouse.up();
  await expect(end).not.toHaveAttribute('style', before ?? '');
  await expect(end).toHaveAttribute('data-id', id ?? '');
  await page.getByRole('button', { name: 'Uzaklaştır', exact: true }).click();
  await page.getByRole('button', { name: 'Tümünü göster', exact: true }).click();
  await expect(end).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('editor-desktop.png'), fullPage: true });
});

test('connects via the keyboard-accessible form, rejects occupied outputs and deletes incident edges', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await page.getByRole('button', { name: 'Bitiş ekle', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Kaynak adım', exact: true })
    .selectOption({ label: 'Başlangıç (1)' });
  await page
    .getByRole('combobox', { name: 'Hedef adım', exact: true })
    .selectOption({ label: 'Bitiş (1)' });
  const connect = page.getByRole('button', { name: 'Bağlantı ekle', exact: true });
  await connect.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  await connect.click();
  await expect(page.getByRole('alert')).toContainText('zaten bağlı');
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  await page
    .getByRole('list', { name: 'Akıştaki adımlar', exact: true })
    .getByRole('button', { name: 'Bitiş', exact: false })
    .click();
  await page.getByRole('button', { name: 'Adımı sil', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
});

test('connects rendered handles and deletes a selected edge with the keyboard', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await page.getByRole('button', { name: 'Bitiş ekle', exact: true }).click();
  const source = await page.locator('.react-flow__handle[data-handleid="next"]').boundingBox();
  const target = await page.locator('.react-flow__handle[data-handleid="input"]').boundingBox();
  if (!source || !target) throw new Error('Handles are missing');
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  const edge = page.locator('.react-flow__edge');
  await edge.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Delete');
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
});

test('renders labels as text and keeps the narrow layout within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  const label = '<img src=x onerror=alert(1)>';
  await page.getByLabel('Adım adı', { exact: true }).fill(label);
  await page.getByRole('button', { name: 'Değişiklikleri uygula', exact: true }).click();
  await expect(page.locator('.react-flow__node')).toContainText(label);
  await expect(page.locator('.react-flow__node img')).toHaveCount(0);
  const canvas = page.locator('.react-flow');
  await expect(canvas).toBeVisible();
  expect((await canvas.boundingBox())?.height).toBeGreaterThanOrEqual(430);
  await expect(page.locator('.react-flow__node')).toBeVisible();
  await expect(page.locator('.react-flow__minimap-node')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: test.info().outputPath('editor-mobile.png'), fullPage: true });
});

test('edits properties atomically and restores saved values when switching nodes', async ({
  page,
}) => {
  await page.goto('/');
  const save = page.getByRole('button', { name: 'Değişiklikleri uygula', exact: true });
  const list = page.getByRole('list', { name: 'Akıştaki adımlar', exact: true });
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  const description = page.getByRole('textbox', {
    name: 'Başlangıç açıklaması (isteğe bağlı)',
    exact: true,
  });
  await description.fill('Başvuru bilgilerini hazırlayın.');
  await save.click();
  await page.getByRole('button', { name: 'Onay ekle', exact: true }).click();
  const approval = page.locator('.react-flow__node').last();
  const id = await approval.getAttribute('data-id');
  await page.getByLabel('Adım adı', { exact: true }).fill('Finans onayı');
  await page.getByLabel('Onaylayan rolü', { exact: true }).fill('   ');
  await save.click();
  await expect(page.getByRole('alert')).toContainText('Değişiklik uygulanmadı');
  await expect(approval).toContainText('Onaylayan');
  await expect(approval).not.toContainText('Finans onayı');
  await page.getByLabel('Onaylayan rolü', { exact: true }).fill('Finans yöneticisi');
  await save.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(approval).toContainText('Finans onayı');
  await expect(approval).toContainText('Finans yöneticisi');
  await expect(approval).toHaveAttribute('data-id', id ?? '');
  await page.getByRole('button', { name: 'Bitiş ekle', exact: true }).click();
  await page.getByRole('combobox', { name: 'Bitiş sonucu', exact: true }).selectOption('rejected');
  await save.click();
  await expect(page.locator('.react-flow__node').last()).toContainText('Akış reddedilir');
  await list.getByRole('button', { name: 'Başlangıç', exact: false }).click();
  await expect(description).toHaveValue('Başvuru bilgilerini hazırlayın.');
  await description.fill('Uygulanmamış değişiklik');
  await list.getByRole('button', { name: 'Finans onayı', exact: false }).click();
  await expect(page.getByLabel('Onaylayan rolü', { exact: true })).toHaveValue('Finans yöneticisi');
  await list.getByRole('button', { name: 'Başlangıç', exact: false }).click();
  await expect(description).toHaveValue('Başvuru bilgilerini hazırlayın.');
  await description.fill('');
  await save.click();
  await list.getByRole('button', { name: 'Bitiş', exact: false }).click();
  await expect(page.getByRole('combobox', { name: 'Bitiş sonucu', exact: true })).toHaveValue(
    'rejected',
  );
  await page.getByRole('combobox', { name: 'Bitiş sonucu', exact: true }).selectOption('completed');
  await save.click();
  await expect(page.locator('.react-flow__node').last()).toContainText('Akış tamamlanır');
  await list.getByRole('button', { name: 'Başlangıç', exact: false }).click();
  await expect(description).toHaveValue('');
  await page.getByRole('button', { name: 'Koşul ekle', exact: true }).click();
  await expect(page.getByText('önce aşağıdaki “Giriş alanları”', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Onaylayan rolü', { exact: true })).toHaveCount(0);
  await page.getByLabel('Adım adı', { exact: true }).fill('Tutar kontrolü');
  await save.click();
  await expect(page.locator('.react-flow__node').last()).toContainText('Tutar kontrolü');
});
