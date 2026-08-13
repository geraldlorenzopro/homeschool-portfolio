import { PDF_MIN, PNG_1PX, expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * Printing the folder.
 *
 * The failure this guards against is silent and only shows up on paper: the
 * print dialog opens before pdf.js has painted its canvases, and pages come
 * out blank. So the assertions are about the moment print is called — what
 * was mounted, and what was still working — not about what the screen looks
 * like afterwards.
 */
async function watchPrint(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __print?: { calls: number; sheets: number; pending: number } }
    w.__print = { calls: 0, sheets: 0, pending: 0 }
    window.print = () => {
      w.__print!.calls += 1
      w.__print!.sheets = document.querySelectorAll('.sheet').length
      w.__print!.pending = document.querySelectorAll('[data-print-ready="false"]').length
    }
  })
}

const printState = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __print: { calls: number; sheets: number; pending: number } }).__print,
  )

async function openMonthly(page: Page) {
  await page.goto('/monthly')
  await expect(page.getByRole('heading', { name: 'Home Education Portfolio' })).toBeVisible()
}

test.describe('Printing', () => {
  test('offers one sheet or the whole folder', async ({ app }) => {
    await openMonthly(app)
    await expect(app.getByRole('button', { name: 'Print this sheet' })).toBeVisible()
    await expect(app.getByRole('button', { name: /Print the whole folder — 17 sheets/ })).toBeVisible()
  })

  test('one sheet prints one sheet', async ({ app }) => {
    await openMonthly(app)
    await watchPrint(app)
    await app.getByRole('button', { name: 'Print this sheet' }).click()
    await expect.poll(async () => (await printState(app)).calls).toBe(1)
    expect((await printState(app)).sheets).toBe(1)
  })

  test('the whole folder mounts all seventeen sheets before printing', async ({ app }) => {
    await openMonthly(app)
    await watchPrint(app)
    await app.getByRole('button', { name: /Print the whole folder/ }).click()
    await expect.poll(async () => (await printState(app)).calls, { timeout: 60_000 }).toBe(1)

    const state = await printState(app)
    expect(state.sheets).toBe(17)
    expect(state.pending).toBe(0)
  })

  test('it waits for every attached PDF to finish drawing', async ({ app }) => {
    await openMonthly(app)
    await app.locator('.section-link', { hasText: 'Additional documents' }).click()
    await app.getByLabel('Additional document files').setInputFiles([
      { name: 'intent.pdf', mimeType: 'application/pdf', buffer: PDF_MIN },
      { name: 'evaluation.pdf', mimeType: 'application/pdf', buffer: PDF_MIN },
    ])
    await expect(app.locator('.document-block')).toHaveCount(2)

    await watchPrint(app)
    await app.getByRole('button', { name: /Print the whole folder/ }).click()
    await expect.poll(async () => (await printState(app)).calls, { timeout: 60_000 }).toBe(1)

    // Nothing was still drawing, and the canvases exist: the pages are not blank.
    const state = await printState(app)
    expect(state.pending).toBe(0)
    expect(await app.locator('.pdf-pages canvas').count()).toBeGreaterThan(0)
  })

  test('the folder stays mounted until the browser says it is done', async ({ app }) => {
    await openMonthly(app)
    await watchPrint(app)
    await app.getByRole('button', { name: /Print the whole folder/ }).click()
    await expect.poll(async () => (await printState(app)).calls, { timeout: 60_000 }).toBe(1)

    // Still all there — Safari returns from print() before the dialog closes.
    await expect(app.locator('.sheet')).toHaveCount(17)

    await app.evaluate(() => window.dispatchEvent(new Event('afterprint')))
    await expect(app.locator('.sheet')).toHaveCount(1)
  })

  test('a work sample photograph is printed whole, not cropped to fill a box', async ({ app }) => {
    await openMonthly(app)
    await app.locator('.section-link', { hasText: 'Work samples' }).click()
    await app.getByLabel('Work sample files').setInputFiles([
      { name: 'drawing.png', mimeType: 'image/png', buffer: PNG_1PX },
    ])
    await expect(app.locator('.sample-card')).toHaveCount(1)

    await app.emulateMedia({ media: 'print' })
    const fit = await app
      .locator('.sample-card .plate')
      .evaluate((el) => getComputedStyle(el).objectFit)
    expect(fit).toBe('contain')
  })
})

test.describe('Printing refuses to lose evidence', () => {
  test('a photograph that will not load stops the print and says so', async ({ app }) => {
    await openMonthly(app)
    await app.locator('.section-link', { hasText: 'Work samples' }).click()
    await app.getByLabel('Work sample files').setInputFiles([
      { name: 'drawing.png', mimeType: 'image/png', buffer: PNG_1PX },
    ])
    await expect(app.locator('.sample-card')).toHaveCount(1)

    // What an expired signed URL looks like to the browser: complete, and
    // zero pixels wide. `img.complete` alone would call this ready.
    await app.evaluate(() => {
      const img = document.querySelector('.sample-card img') as HTMLImageElement
      img.src = 'data:image/png;base64,not-a-png'
    })

    await watchPrint(app)
    await app.getByRole('button', { name: /Print the whole folder/ }).click()

    await expect(app.getByRole('alert')).toContainText('could not be loaded', { timeout: 60_000 })
    expect((await printState(app)).calls).toBe(0)
  })
})
