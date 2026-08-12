import { PDF_MIN, PNG_1PX, expect, openSection, test } from './fixtures'

/**
 * Two things a parent noticed: uploads gave no preview, and scans that looked
 * fine on screen came out blank in the printed PDF.
 */
test.describe('Previews', () => {
  test('a picked photo previews before it is saved', async ({ app }) => {
    await openSection(app, 'Work samples')
    await expect(app.locator('.add-card img')).toHaveCount(0)

    await app.getByLabel('Photo or scan').setInputFiles({
      name: 'garden.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })

    const preview = app.locator('.add-card img')
    await expect(preview).toBeVisible()
    await expect(preview).toHaveAttribute('src', /^blob:/)
    await expect(app.locator('.add-card')).toContainText('garden.png')
  })

  test('a picked PDF is labelled rather than shown as a broken image', async ({ app }) => {
    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('File (PDF or image)').setInputFiles({
      name: 'plan.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_MIN,
    })
    await expect(app.locator('.add-card .tag')).toHaveText('PDF')
    await expect(app.locator('.add-card img')).toHaveCount(0)
  })

  test('a saved photo opens full size on click', async ({ app }) => {
    await openSection(app, 'Work samples')
    await app.getByLabel('What the work is').fill('Watercolour')
    await app.getByLabel('Photo or scan').setInputFiles({
      name: 'w.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Add sample' }).click()

    const figure = app.locator('figure', { hasText: 'Watercolour' })
    await figure.locator('.plate').click()

    const zoom = app.getByRole('dialog')
    await expect(zoom).toBeVisible()
    await expect(zoom.locator('img')).toHaveAttribute('src', /^data:image\/jpeg/)

    await zoom.click()
    await expect(zoom).toHaveCount(0)
  })
})

test.describe('Uploads reach the printed document', () => {
  test('a photo is a real <img>, not a background that print would drop', async ({ app }) => {
    await openSection(app, 'Work samples')
    await app.getByLabel('What the work is').fill('Handwriting page')
    await app.getByLabel('Photo or scan').setInputFiles({
      name: 'hand.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Add sample' }).click()

    await app.getByRole('link', { name: 'Finished portfolio' }).click()
    const plate = app.locator('.doc .plate', { has: app.locator('img') }).first()
    await expect(plate).toBeVisible()

    const img = plate.locator('img')
    await expect(img).toHaveAttribute('src', /^data:image\/jpeg/)
    // Loaded, not just present — a broken src would still match the selector.
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
    // Whole scan visible rather than cropped to fill the frame.
    await expect(img).toHaveCSS('object-fit', 'contain')
  })

  test('the plate and its placeholder opt in to printing their backgrounds', async ({ app }) => {
    await app.getByRole('link', { name: 'Finished portfolio' }).click()
    await app.emulateMedia({ media: 'print' })

    const plate = app.locator('.doc .plate').first()
    await expect(plate).toHaveCSS('print-color-adjust', 'exact')
    await expect(app.locator('.doc .hatched').first()).toHaveCSS('print-color-adjust', 'exact')
  })

  test('an uploaded PDF is drawn into the document, page by page', async ({ app }) => {
    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('Document title').fill('IEP 2025–2026')
    await app.getByLabel('File (PDF or image)').setInputFiles({
      name: 'iep.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_MIN,
    })
    await app.getByRole('button', { name: 'Attach document' }).click()

    await app.getByRole('link', { name: 'Finished portfolio' }).click()

    // A canvas per rendered page, with actual pixels behind it.
    const page = app.locator('.doc .pdf-pages canvas').first()
    await expect(page).toBeVisible({ timeout: 15_000 })
    await expect
      .poll(() => page.evaluate((el) => (el as HTMLCanvasElement).width), { timeout: 15_000 })
      .toBeGreaterThan(100)

    // The rendered pages appear under that document's own heading.
    await expect(app.locator('.doc')).toContainText('IEP 2025–2026')
  })
})
