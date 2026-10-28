import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { fakeFirebase, PASSWORD } from './fake-firebase';

// WB-022B: automated WCAG 2.1 A/AA checks plus a keyboard-only main scenario (FR-11).
async function expectNoViolations(page: Page, state: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = result.violations.map(
    (violation) => `${state}: ${violation.id} ×${violation.nodes.length}`,
  );
  expect(summary).toEqual([]);
}

test('editor states pass axe in Turkish and English', async ({ page }) => {
  await page.goto('/');
  await expectNoViolations(page, 'empty');
  await page
    .getByRole('region', { name: 'Örnekten başla' })
    .getByRole('button', { name: 'Satın alma talebi' })
    .click();
  await page.getByRole('button', { name: 'Örneği yükle' }).click();
  await page.getByRole('list', { name: 'Akıştaki adımlar' }).getByRole('button').nth(1).click();
  await expectNoViolations(page, 'example with selected condition');
  const simulation = page.getByRole('region', { name: 'Simülasyon' });
  await simulation.getByLabel('Tutar (Sayı, gerekli)').fill('15000');
  await simulation.getByRole('button', { name: 'Simülasyonu başlat' }).click();
  await expectNoViolations(page, 'simulation waiting');
  await page.getByRole('combobox', { name: 'Dil' }).selectOption('en');
  await expectNoViolations(page, 'english');
});

test('account and AI panels pass axe', async ({ page }) => {
  await fakeFirebase(page, { verified: true });
  await page.route('**/api/v1/ai/limits', (route) =>
    route.fulfill({
      json: {
        data: { aiEnabled: true, memberRemaining: 1, budgetState: 'ok' },
        meta: { requestId: 'r' },
      },
    }),
  );
  await page.goto('/');
  await page.locator('summary', { hasText: 'Giriş yap' }).click();
  await expectNoViolations(page, 'sign-in form');
  const account = page.getByRole('region', { name: 'Hesap' });
  await account.getByLabel('E-posta', { exact: true }).fill('ayse@example.com');
  await account.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await account.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('region', { name: 'AI ile oluştur' })).toContainText(
    'Bugün kalan AI hakkı: 1.',
  );
  await expectNoViolations(page, 'signed in with AI panel');
});

async function tabTo(page: Page, name: string | RegExp) {
  for (let step = 0; step < 120; step += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLInputElement | null;
      if (!element) return '';
      const label = element.tagName === 'BUTTON' ? undefined : element.labels?.[0]?.innerText;
      return (element.getAttribute('aria-label') ?? label ?? element.innerText ?? '').trim();
    });
    if (typeof name === 'string' ? focused === name : name.test(focused)) return;
  }
  throw new Error(`Could not reach ${String(name)} with Tab`);
}

test('the main scenario works with the keyboard only and focus is visible', async ({ page }) => {
  await page.goto('/');
  await tabTo(page, 'Satın alma talebi');
  const outline = await page.evaluate(
    () => getComputedStyle(document.activeElement as Element).outlineStyle,
  );
  expect(outline).not.toBe('none');
  await page.keyboard.press('Enter');
  await tabTo(page, 'Örneği yükle');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Doğrulama' })).toContainText(
    'Akış çalıştırılabilir',
  );

  await tabTo(page, /^Tutar \(Sayı, gerekli\)/);
  await page.keyboard.type('15000');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Simülasyon' }).getByRole('status')).toHaveText(
    'Onay bekleniyor',
  );
  await tabTo(page, 'Onayla');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Simülasyon' }).getByRole('status')).toHaveText(
    'Sonuç: akış tamamlandı',
  );

  // Undo works from the keyboard outside text fields.
  await page.locator('body').focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(
    page.getByRole('list', { name: 'Akıştaki adımlar' }).getByRole('button'),
  ).toHaveCount(0);
});
