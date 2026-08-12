import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The cover, and the one thing about it that cannot be checked by looking at
 * the screen: how many sheets of paper it becomes.
 *
 * It printed as two pages for a while — the app's own padding was part of the
 * flow, and later a single pixel over 11in. Both are invisible in the browser
 * and obvious to whoever picks the folder up.
 */
async function pageCount(pdf: Buffer): Promise<number> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf) }).promise
  return doc.numPages
}

async function openCover(page: Page) {
  await page.goto('/monthly')
  await page.locator('.section-link', { hasText: 'Cover' }).click()
  await expect(page.locator('.cover-title')).toContainText('Home Education')
}

test.describe('The cover', () => {
  test('prints on exactly one sheet of paper', async ({ app }) => {
    await openCover(app)
    expect(await pageCount(await app.pdf({ format: 'Letter', printBackground: true }))).toBe(1)
  })

  test('carries the school supplies in all four corners', async ({ app }) => {
    await openCover(app)
    await expect(app.locator('.cover-corner')).toHaveCount(4)

    // Inline SVG, not an <img>: a bitmap prints soft, and a background image
    // is dropped by the browser at print time altogether.
    for (const at of ['tl', 'tr', 'bl', 'br']) {
      const corner = app.locator(`.cover-corner-${at}`)
      await expect(corner).toBeVisible()
      expect(await corner.evaluate((el) => el.tagName.toLowerCase())).toBe('svg')
      expect(await corner.locator('path, rect, circle').count()).toBeGreaterThan(2)
    }
  })

  test('keeps its colour when printed', async ({ app }) => {
    await openCover(app)
    await app.emulateMedia({ media: 'print' })
    const adjust = await app
      .locator('.cover-supplies')
      .evaluate((el) => getComputedStyle(el).printColorAdjust || getComputedStyle(el).webkitPrintColorAdjust)
    expect(adjust).toBe('exact')
  })

  test('drops the instructions to the parent from the printed page', async ({ app }) => {
    await openCover(app)
    await expect(app.getByText('Drag or click to upload the photograph')).toBeVisible()

    await app.emulateMedia({ media: 'print' })
    await expect(app.getByText('Drag or click to upload the photograph')).toBeHidden()
    // Exact: the hint's own text contains this one as a substring.
    await expect(app.getByText('Click to upload the photograph', { exact: true })).toBeHidden()
  })

  test('the photograph still uploads and shows on the cover', async ({ app }) => {
    await openCover(app)
    await app.locator('.cover-photo input[type=file]').setInputFiles({
      name: 'valerie.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })
    await expect(app.locator('.cover-photo img')).toHaveAttribute('src', /^data:image\/jpeg/)
  })
})
