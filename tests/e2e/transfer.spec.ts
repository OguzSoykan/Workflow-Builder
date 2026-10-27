import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const steps = (page: Page) =>
  page.getByRole('list', { name: 'Akıştaki adımlar', exact: true }).getByRole('button');
const add = (page: Page, kind: string) =>
  page.getByRole('button', { name: `${kind} ekle`, exact: true }).click();
const panel = (page: Page) => page.getByRole('region', { name: 'Dosya işlemleri', exact: true });
const choose = (page: Page, name: string, text: string | Buffer) =>
  panel(page)
    .getByLabel('JSON içe aktar', { exact: true })
    .setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });

test('exports an incomplete draft and imports it back after confirmation', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Başlangıç');
  await add(page, 'Koşul');
  await expect(panel(page)).toContainText('doğrulama sorunu var');
  const downloading = page.waitForEvent('download');
  await panel(page).getByRole('button', { name: 'JSON dışa aktar', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^workflow_[0-9a-f-]+\.workflow\.json$/);
  const text = await readFile((await download.path()) ?? '', 'utf8');
  const exported = JSON.parse(text) as { contentHash: string; nodes: unknown[] };
  expect(exported.contentHash).toMatch(/^[a-f0-9]{64}$/);
  expect(exported.nodes).toHaveLength(2);
  await expect(panel(page).getByRole('status')).toContainText('indirildi');

  await add(page, 'Bitiş');
  await choose(page, 'akis.json', text);
  const confirm = panel(page).getByRole('group', { name: 'İçe aktarma onayı', exact: true });
  await expect(confirm).toContainText('akis.json mevcut taslağın yerine geçecek');
  await expect(confirm).not.toContainText('İçerik özeti eşleşmiyor');
  await confirm.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  await expect(steps(page)).toHaveCount(3);

  await choose(page, 'akis.json', text);
  await confirm.getByRole('button', { name: 'Taslağı değiştir', exact: true }).click();
  await expect(steps(page)).toHaveText(['BaşlangıçBaşlangıç', 'KoşulKoşul']);
  await expect(panel(page).getByRole('status')).toContainText('akis.json içe aktarıldı');
  await page.reload();
  await expect(steps(page)).toHaveCount(2);
});

test('rejects bad files without touching the working copy', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Başlangıç');
  for (const [name, content, message] of [
    ['bozuk.json', '{"schemaVersion":', 'geçerli bir JSON'],
    ['v2.json', '{"schemaVersion":2}', 'schemaVersion 1'],
    ['buyuk.json', ' '.repeat(256 * 1024 + 1), '256 KiB sınırını aşıyor; okunmadı'],
  ] as const) {
    await choose(page, name, content);
    await expect(panel(page).getByRole('alert')).toContainText(message);
    await expect(panel(page).getByRole('group')).toHaveCount(0);
    await expect(steps(page)).toHaveText(['BaşlangıçBaşlangıç']);
  }
  const edited = JSON.stringify({
    schemaVersion: 1,
    workflowId: 'elle',
    title: 'Elle düzenlendi',
    locale: 'tr',
    inputs: [],
    nodes: [
      {
        id: 'n1',
        label: '<b>Bitiş</b>',
        type: 'end',
        position: { x: 0, y: 0 },
        config: { outcome: 'completed' },
      },
    ],
    edges: [],
    contentHash: '0'.repeat(64),
  });
  await choose(page, 'elle.json', edited);
  const confirm = panel(page).getByRole('group', { name: 'İçe aktarma onayı', exact: true });
  await expect(confirm).toContainText('İçerik özeti eşleşmiyor');
  await expect(confirm).toContainText('doğrulama sorunu var');
  await confirm.getByRole('button', { name: 'Taslağı değiştir', exact: true }).click();
  await expect(steps(page)).toHaveText(['<b>Bitiş</b>Bitiş']);
  await expect(page.getByRole('heading', { name: 'Elle düzenlendi', exact: true })).toBeVisible();
});
