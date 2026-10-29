import { expect, test, type Page } from '@playwright/test';
import { openTab } from './ui';

async function addInput(page: Page, key: string, label: string, type: string, options = '') {
  await openTab(page, 'Alanlar');
  const panel = page.getByRole('region', { name: 'Giriş alanları', exact: true });
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alan ekle', exact: true }).click();
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan anahtarı', { exact: true }).fill(key);
  await openTab(page, 'Alanlar');
  await panel.getByLabel('Alan adı', { exact: true }).fill(label);
  await openTab(page, 'Alanlar');
  await panel.getByRole('combobox', { name: 'Alan türü', exact: true }).selectOption(type);
  if (options)
    await panel
      .getByRole('textbox', { name: 'Seçenekler (her satıra bir seçenek)', exact: true })
      .fill(options);
  await openTab(page, 'Alanlar');
  await panel.getByRole('button', { name: 'Alanı uygula', exact: true }).click();
  await openTab(page, 'Alanlar');
  await expect(panel.getByRole('alert')).toHaveCount(0);
}

async function connect(page: Page, source: string, target: string, handle?: string) {
  await openTab(page, 'Özellikler');
  await page
    .getByRole('combobox', { name: 'Kaynak adım', exact: true })
    .selectOption({ label: source });
  await openTab(page, 'Özellikler');
  const handles = page.getByRole('combobox', { name: 'Çıkış', exact: true });
  if (handle) await expect(handles.locator('option:checked')).toHaveText(handle);
  await openTab(page, 'Özellikler');
  await page
    .getByRole('combobox', { name: 'Hedef adım', exact: true })
    .selectOption({ label: target });
  await openTab(page, 'Adımlar');
  await openTab(page, 'Özellikler');
  await page.getByRole('button', { name: 'Bağlantı ekle', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
}

test('configures typed conditions and rejects invalid values without changing the step', async ({
  page,
}) => {
  await page.goto('/');
  await addInput(page, 'tutar', 'Tutar', 'number');
  await addInput(page, 'departman', 'Departman', 'enum', 'IT\nFinans\nSatış');
  await openTab(page, 'Adımlar');
  await page.getByRole('button', { name: 'Koşul ekle', exact: true }).click();
  const card = page.locator('.react-flow__node').first();
  await expect(card).toContainText('Alan ve koşul ayarı bekliyor');
  await expect(
    page.getByText('henüz tanımlı bir alana bağlı değil', { exact: false }),
  ).toBeVisible();

  await openTab(page, 'Özellikler');
  const field = page.getByRole('combobox', { name: 'Karşılaştırılacak alan', exact: true });
  await openTab(page, 'Özellikler');
  const operator = page.getByRole('combobox', { name: 'Karşılaştırma', exact: true });
  await openTab(page, 'Özellikler');
  const save = page.getByRole('button', { name: 'Değişiklikleri uygula', exact: true });
  await field.selectOption('tutar');
  await expect(operator.locator('option')).toHaveText([
    'eşittir',
    'eşit değildir',
    'büyüktür',
    'büyük veya eşittir',
    'küçüktür',
    'küçük veya eşittir',
  ]);
  await operator.selectOption('gte');
  await openTab(page, 'Özellikler');
  await page.getByLabel('Karşılaştırma değeri', { exact: true }).fill('15000');
  await openTab(page, 'Özellikler');
  await page.getByLabel('Adım adı', { exact: true }).fill('Tutar kontrolü');
  await save.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(card).toContainText('Tutar büyük veya eşittir 15000');
  await expect(page.getByText('henüz tanımlı bir alana bağlı değil', { exact: false })).toHaveCount(
    0,
  );

  await field.selectOption('departman');
  await expect(operator.locator('option')).toHaveText([
    'eşittir',
    'eşit değildir',
    'şunlardan biridir',
  ]);
  await operator.selectOption('in');
  await save.click();
  await expect(page.getByRole('alert')).toContainText('en az bir seçenek');
  await expect(card).toContainText('Tutar büyük veya eşittir 15000');
  await page.getByRole('checkbox', { name: 'IT', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Satış', exact: true }).check();
  await save.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(card).toContainText('Departman şunlardan biridir IT, Satış');

  // Reopening the step restores the saved typed value.
  await openTab(page, 'Adımlar');
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await openTab(page, 'Adımlar');
  await page
    .getByRole('list', { name: 'Akıştaki adımlar', exact: true })
    .getByRole('button', { name: 'Tutar kontrolü', exact: false })
    .click();
  await expect(field).toHaveValue('departman');
  await expect(operator).toHaveValue('in');
  await expect(page.getByRole('checkbox', { name: 'Satış', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Finans', exact: true })).not.toBeChecked();
  await openTab(page, 'Alanlar');
  const inputs = page.getByRole('region', { name: 'Giriş alanları', exact: true });
  await openTab(page, 'Alanlar');
  await expect(
    inputs.getByRole('button', { name: 'Departman alanını sil', exact: true }),
  ).toBeDisabled();
  await openTab(page, 'Alanlar');
  await expect(
    inputs.getByRole('button', { name: 'Tutar alanını sil', exact: true }),
  ).toBeEnabled();
});

test('shows branch status and suggests the free condition and approval outputs', async ({
  page,
}) => {
  await page.goto('/');
  await openTab(page, 'Adımlar');
  for (const kind of ['Başlangıç', 'Koşul', 'Onay', 'Bitiş'])
    await page.getByRole('button', { name: `${kind} ekle`, exact: true }).click();
  await openTab(page, 'Adımlar');
  const list = page.getByRole('list', { name: 'Akıştaki adımlar', exact: true });
  await list.getByRole('button', { name: 'Koşul', exact: false }).click();
  await openTab(page, 'Özellikler');
  const outputs = page.getByRole('list', { name: 'Adım çıkışları', exact: true });
  await expect(outputs.getByRole('listitem')).toHaveText([
    'Doğru: bağlı değil. Akışın çalışabilmesi için bu çıkışı bir adıma bağlayın.',
    'Yanlış: bağlı değil. Akışın çalışabilmesi için bu çıkışı bir adıma bağlayın.',
  ]);
  await expect(page.getByText('Koşul sağlanırsa “Doğru”', { exact: false })).toHaveCount(0);

  await connect(page, 'Koşul (2)', 'Onay (2)', 'Doğru');
  await connect(page, 'Koşul (2)', 'Bitiş (3)', 'Yanlış');
  await expect(outputs.getByRole('listitem')).toHaveText(['Doğru → Onay', 'Yanlış → Bitiş']);
  await openTab(page, 'Özellikler');
  await page
    .getByRole('combobox', { name: 'Kaynak adım', exact: true })
    .selectOption({ label: 'Koşul (2)' });
  await openTab(page, 'Özellikler');
  await expect(
    page.getByRole('combobox', { name: 'Çıkış', exact: true }).locator('option'),
  ).toHaveText(['Doğru (bağlı)', 'Yanlış (bağlı)']);
  await openTab(page, 'Adımlar');
  await openTab(page, 'Özellikler');
  await page.getByRole('button', { name: 'Bağlantı ekle', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('zaten bağlı');

  await list.getByRole('button', { name: 'Onay', exact: false }).click();
  await expect(
    page.getByText('reddederse “Reddedildi” çıkışı izlenir', { exact: false }),
  ).toBeVisible();
  await connect(page, 'Onay (3)', 'Bitiş (3)', 'Onaylandı');
  await expect(outputs.getByRole('listitem')).toHaveText([
    'Onaylandı → Bitiş',
    'Reddedildi: bağlı değil. Akışın çalışabilmesi için bu çıkışı bir adıma bağlayın.',
  ]);
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);
  await expect(page.locator('.react-flow__edge-text')).toHaveText(['Doğru', 'Yanlış', 'Onaylandı']);

  await list.getByRole('button', { name: 'Bitiş', exact: false }).click();
  await expect(outputs).toHaveCount(0);
});
