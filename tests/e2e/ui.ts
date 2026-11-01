import { expect, type Page } from '@playwright/test';
import { PASSWORD } from './fake-firebase';

// The workspace keeps panels behind tabs; tests open the tab that owns a region first.
export async function openTab(page: Page, name: string) {
  const tab = page.getByRole('tab', { name, exact: true });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
}

export const authDialog = (page: Page) => page.getByRole('dialog');
export const headerButton = (page: Page, name: string) =>
  page.getByRole('banner').getByRole('button', { name, exact: true });
/** The signed-in account chip; its name may end with “Doğrulanmadı”. */
export const accountChip = (page: Page, email = 'ayse@example.com') =>
  page
    .getByRole('banner')
    .getByRole('button', { name: new RegExp(`^Hesap: ${email.replace(/[.]/g, '\\.')}`) });

/** Signs in through the account dialog and leaves it closed (verified or not). */
export async function signIn(page: Page, email = 'ayse@example.com') {
  await headerButton(page, 'Giriş yap').click();
  const dialog = authDialog(page);
  await dialog.getByLabel('E-posta', { exact: true }).fill(email);
  await dialog.getByLabel('Şifre', { exact: true }).fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  const verifyStep = dialog.getByRole('heading', { name: 'E-postanı doğrula' });
  // A verified member's dialog closes by itself; an unverified one stops at the verification step.
  await expect
    .poll(async () => (await dialog.isHidden()) || (await verifyStep.isVisible()))
    .toBe(true);
  if (await verifyStep.isVisible())
    await dialog.getByRole('button', { name: 'Sonra yaparım' }).click();
  await expect(dialog).toBeHidden();
  await expect(accountChip(page, email)).toBeVisible();
}
