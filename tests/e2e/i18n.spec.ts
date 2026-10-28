import { expect, test } from '@playwright/test';

test('switches the whole editor to English and back without losing the draft', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await page.getByRole('button', { name: 'Başlangıç ekle', exact: true }).click();
  await page.getByRole('combobox', { name: 'Dil', exact: true }).selectOption('en');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Workflow design', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Approval', exact: true })).toBeVisible();
  await expect(page.getByText('1 / 50 steps · 0 / 100 connections', { exact: true })).toBeVisible();
  await expect(page.locator('.react-flow__node').first()).toContainText('Start');
  await expect(page.locator('.react-flow__node').first()).toContainText('The workflow starts here');
  const validation = page.getByRole('region', { name: 'Validation', exact: true });
  await expect(validation).toContainText(
    'The workflow has no end step; add at least one end step.',
  );
  await expect(validation).toContainText('The “Next” output of step “Başlangıç” is not connected.');
  await expect(page.getByRole('region', { name: 'Simulation', exact: true })).toContainText(
    'Fix the validation issues before simulating.',
  );

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('list', { name: 'Steps in the workflow', exact: true }).getByRole('button'),
  ).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('tr');
  await expect(page.getByRole('heading', { name: 'İş akışı tasarımı', exact: true })).toBeVisible();
});

test('uses English for a browser in English by default', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Add Start', exact: true })).toBeVisible();
  await context.close();
});
