import type { Page } from '@playwright/test';

// The workspace keeps panels behind tabs; tests open the tab that owns a region first.
export async function openTab(page: Page, name: string) {
  const tab = page.getByRole('tab', { name, exact: true });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
}
