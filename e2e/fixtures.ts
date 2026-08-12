import { test as base, expect, type Page } from '@playwright/test'

/**
 * Every test starts from the sample year: the demo backend re-seeds whenever
 * localStorage is empty, so clearing before the app boots gives each test an
 * identical starting point without any server setup.
 */
export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    // Clear once per test, not on every navigation — several tests reload the
    // page precisely to prove the data outlived the session.
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem('e2e-seeded')) {
        window.localStorage.clear()
        window.sessionStorage.setItem('e2e-seeded', '1')
      }
    })
    page.on('dialog', (dialog) => dialog.accept())
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Student information' })).toBeVisible()
    await use(page)
  },
})

export { expect }

/** A real 1×1 PNG — the app decodes uploads through a canvas, so it must be valid. */
export const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/** A minimal but structurally valid PDF. The app stores it without parsing. */
export const PDF_MIN = Buffer.from(
  `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`,
  'utf8',
)

export function sectionLink(page: Page, label: string) {
  return page.locator('.section-link', { hasText: label })
}

export async function openSection(page: Page, label: string) {
  await sectionLink(page, label).click()
  await expect(page.locator('.panel-title')).toBeVisible()
}

export function sectionCount(page: Page, label: string) {
  return sectionLink(page, label).locator('.section-count')
}

/** The table row (or figure) containing the given text. */
export function row(page: Page, text: string) {
  return page.locator('tbody tr', { hasText: text })
}

/**
 * The row currently in edit mode. Once a row opens for editing its text moves
 * into input values, where `hasText` cannot see it — so anchor on the state.
 */
export function editingRow(page: Page) {
  return page.locator('tr[data-editing="true"]')
}
