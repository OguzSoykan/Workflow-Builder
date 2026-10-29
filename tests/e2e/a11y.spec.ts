import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { fakeFirebase, PASSWORD } from './fake-firebase';
import { openTab } from './ui';

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
  await openTab(page, 'Oluştur');
  await page
    .getByRole('region', { name: 'Örnekten başla' })
    .getByRole('button', { name: 'Satın alma talebi' })
    .click();
  await openTab(page, 'Oluştur');
  await page.getByRole('button', { name: 'Örneği yükle' }).click();
  await openTab(page, 'Adımlar');
  await page.getByRole('list', { name: 'Akıştaki adımlar' }).getByRole('button').nth(1).click();
  await expectNoViolations(page, 'example with selected condition');
  await openTab(page, 'Simülasyon');
  const simulation = page.getByRole('region', { name: 'Simülasyon' });
  await openTab(page, 'Simülasyon');
  await simulation.getByLabel('Tutar (Sayı, gerekli)').fill('15000');
  await openTab(page, 'Simülasyon');
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
  await openTab(page, 'Oluştur');
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
  // Tabs are reached and activated with the keyboard too.
  await tabTo(page, 'Adımlar');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Oluştur', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
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

  await tabTo(page, 'Özellikler');
  await page.keyboard.press('ArrowRight');
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
  await openTab(page, 'Adımlar');
  await expect(
    page.getByRole('list', { name: 'Akıştaki adımlar' }).getByRole('button'),
  ).toHaveCount(0);
});

test('dark theme passes axe and the theme choice persists', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'tr-TR', colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await openTab(page, 'Oluştur');
  await page
    .getByRole('region', { name: 'Örnekten başla' })
    .getByRole('button', { name: 'Satın alma talebi' })
    .click();
  await page.getByRole('button', { name: 'Örneği yükle' }).click();
  await openTab(page, 'Adımlar');
  await page.getByRole('list', { name: 'Akıştaki adımlar' }).getByRole('button').nth(1).click();
  await expectNoViolations(page, 'dark example');
  await openTab(page, 'Simülasyon');
  await page.getByLabel('Tutar (Sayı, gerekli)').fill('15000');
  await page.getByRole('button', { name: 'Simülasyonu başlat' }).click();
  await expectNoViolations(page, 'dark simulation');

  // System → light → dark → system; an explicit choice survives a reload.
  const toggle = page.getByRole('button', { name: /^Tema: / });
  await expect(toggle).toHaveAccessibleName('Tema: Sistem');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAccessibleName('Tema: Açık');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Tema: Açık' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Tema: Koyu' }).click();
  await expect(page.getByRole('button', { name: 'Tema: Sistem' })).toBeVisible();
  await context.close();
});
