import { PDF_MIN, PNG_1PX, expect, openSection, test } from './fixtures'

async function attachIep(app: import('@playwright/test').Page, title = 'IEP 2025–2026') {
  await openSection(app, 'Support documents (IEP)')
  await app.getByLabel('Document title').fill(title)
  await app.getByLabel('File (PDF or image)').setInputFiles({
    name: 'iep.pdf',
    mimeType: 'application/pdf',
    buffer: PDF_MIN,
  })
  await app.getByRole('button', { name: 'Attach document' }).click()
  return app.locator('figure', { hasText: title })
}

test.describe('A PDF card shows the document, not a note about it', () => {
  test('the IEP card renders its first page', async ({ app }) => {
    const figure = await attachIep(app)

    const canvas = figure.locator('.pdf-thumb canvas')
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    await expect
      .poll(() => canvas.evaluate((el) => (el as HTMLCanvasElement).width), { timeout: 15_000 })
      .toBeGreaterThan(100)

    // The old placeholder is gone from that card.
    await expect(figure).not.toContainText('PDF document attached')
  })

  test('clicking the card opens the whole document, like an image', async ({ app }) => {
    const figure = await attachIep(app)
    await expect(figure.locator('.pdf-thumb canvas')).toBeVisible({ timeout: 15_000 })

    await figure.locator('.plate').click()

    const viewer = app.getByRole('dialog')
    await expect(viewer).toBeVisible()
    await expect(viewer.locator('.pdf-pages canvas').first()).toBeVisible({ timeout: 15_000 })
    await expect(viewer).toContainText('IEP 2025–2026')

    await viewer.getByRole('button', { name: 'Close' }).click()
    await expect(viewer).toHaveCount(0)
  })

  test('scrolling inside the open document does not dismiss it', async ({ app }) => {
    const figure = await attachIep(app)
    await figure.locator('.plate').click()

    const viewer = app.getByRole('dialog')
    await expect(viewer).toBeVisible()
    // A click on the pages themselves must not close the viewer.
    await viewer.locator('.lightbox-doc').click({ position: { x: 10, y: 10 } })
    await expect(viewer).toBeVisible()
  })

  test('the eye opens the same viewer rather than a new tab', async ({ app }) => {
    const figure = await attachIep(app)
    // No longer a link — a PDF stays inside the app now.
    await expect(figure.getByRole('link', { name: /^View / })).toHaveCount(0)

    await figure.getByRole('button', { name: /^View / }).click()
    await expect(app.getByRole('dialog').locator('.pdf-pages canvas').first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('an image card still behaves as before', async ({ app }) => {
    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('Document title').fill('Therapist letter')
    await app.getByLabel('File (PDF or image)').setInputFiles({
      name: 'letter.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Attach document' }).click()

    const figure = app.locator('figure', { hasText: 'Therapist letter' })
    await expect(figure.locator('.plate img')).toHaveAttribute('src', /^data:image\/jpeg/)
    await figure.locator('.plate').click()
    await expect(app.getByRole('dialog').locator('img')).toBeVisible()
  })

  test('a document with no file still shows the empty slot', async ({ app }) => {
    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('Document title').fill('Waiting on the district')
    await app.getByRole('button', { name: 'Attach document' }).click()

    const figure = app.locator('figure', { hasText: 'Waiting on the district' })
    await expect(figure).toContainText('no file attached')
    await expect(figure.locator('canvas')).toHaveCount(0)
  })
})
