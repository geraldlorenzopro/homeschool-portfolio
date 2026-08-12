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
    // The root is now the fork between the two portfolios; these tests are
    // about the evaluation one, so they start inside it.
    await page.goto('/evaluation')
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

/**
 * A real one-page PDF, with the byte offsets in its cross-reference table
 * computed here rather than guessed. The app now renders uploaded PDFs with
 * pdf.js, so a hand-waved stub would fail to parse for the wrong reason.
 */
function buildPdf(text: string): Buffer {
  const stream = `BT /F1 24 Tf 20 100 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R ' +
      '/Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${obj}\nendobj\n`
  })

  const startxref = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`

  return Buffer.from(
    `${body}${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
      `startxref\n${startxref}\n%%EOF\n`,
    'latin1',
  )
}

export const PDF_MIN = buildPdf('Individualized Education Program')

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
