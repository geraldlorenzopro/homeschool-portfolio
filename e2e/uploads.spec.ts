import { PDF_MIN, PNG_1PX, expect, openSection, sectionCount, test } from './fixtures'

test.describe('Uploads', () => {
  test('work sample: attaches a photo, shows the plate, then removes it', async ({ app }) => {
    await openSection(app, 'Work samples')

    await app.getByLabel('What the work is').fill('Watercolour of the garden')
    await app.getByLabel('Area', { exact: true }).selectOption({ label: 'Language Arts' })
    await app.getByLabel('Date').fill('2026-04-02')
    await app.getByLabel('Photo or scan').setInputFiles({
      name: 'garden.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Add sample' }).click()

    const figure = app.locator('figure', { hasText: 'Watercolour of the garden' })
    await expect(figure).toBeVisible()
    await expect(sectionCount(app, 'Work samples')).toHaveText('4')

    // Downscaled to a JPEG and matted in a .plate — as a real <img>, so it
    // survives printing.
    await expect(figure.locator('.plate img')).toHaveAttribute('src', /^data:image\/jpeg/)

    await figure.getByRole('button', { name: 'Remove' }).click()
    await expect(figure).toHaveCount(0)
    await expect(sectionCount(app, 'Work samples')).toHaveText('3')
  })

  test('a sample with no photo keeps the hatched placeholder', async ({ app }) => {
    await openSection(app, 'Work samples')
    await app.getByLabel('What the work is').fill('Clay map of Florida')
    await app.getByRole('button', { name: 'Add sample' }).click()

    const figure = app.locator('figure', { hasText: 'Clay map of Florida' })
    await expect(figure).toContainText('drop photo or scan')
  })

  test('support document: attaches a PDF and tags it', async ({ app }) => {
    await openSection(app, 'Support documents (IEP)')

    await app.getByLabel('Document title').fill('504 Plan 2025–2026')
    await app.getByLabel('Type').selectOption('504 Plan')
    await app.getByLabel('Document date').fill('2025-09-01')
    await app.getByLabel('Why it is included').fill('Extended time and seating.')
    await app.getByLabel('File (PDF or image)').setInputFiles({
      name: 'plan.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_MIN,
    })
    await expect(app.locator('.file-hint')).toContainText('plan.pdf')

    await app.getByRole('button', { name: 'Attach document' }).click()

    const figure = app.locator('figure', { hasText: '504 Plan 2025–2026' })
    await expect(figure).toBeVisible()
    await expect(figure.locator('.tag')).toHaveText('PDF')
    await expect(figure).toContainText('504 Plan')
    await expect(figure).toContainText('Sep 1, 2025')
    await expect(figure).toContainText('plan.pdf')
    await expect(figure.getByRole('button', { name: /^View / })).toBeVisible()
    await expect(sectionCount(app, 'Support documents (IEP)')).toHaveText('2')

    // The picker resets so the next document does not inherit this file.
    await expect(app.locator('.file-hint')).toHaveText('No file chosen yet')
  })

  test('an image support document renders as a preview rather than a placeholder', async ({
    app,
  }) => {
    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('Document title').fill('Therapist letter')
    await app.getByLabel('Type').selectOption('Medical letter')
    await app.getByLabel('File (PDF or image)').setInputFiles({
      name: 'letter.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Attach document' }).click()

    const figure = app.locator('figure', { hasText: 'Therapist letter' })
    await expect(figure.locator('.tag')).toHaveText('Image')
    await expect(figure.locator('.plate img')).toHaveAttribute('src', /^data:image\/jpeg/)
  })

  test('a file that only claims to be a PDF is rejected', async ({ app }) => {
    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('Document title').fill('Not really a plan')
    await app.getByLabel('File (PDF or image)').setInputFiles({
      name: 'evil.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('<script>alert(1)</script>', 'utf8'),
    })
    await app.getByRole('button', { name: 'Attach document' }).click()

    await expect(app.getByRole('status')).toContainText('not a valid PDF')
    await expect(app.locator('figure', { hasText: 'Not really a plan' })).toHaveCount(0)
    await expect(sectionCount(app, 'Support documents (IEP)')).toHaveText('1')
  })

  test('an oversized file is refused before anything is stored', async ({ app }) => {
    await openSection(app, 'Work samples')
    await app.getByLabel('What the work is').fill('Huge scan')
    await app.getByLabel('Photo or scan').setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(16 * 1024 * 1024, 1),
    })
    await app.getByRole('button', { name: 'Add sample' }).click()

    await expect(app.getByRole('status')).toContainText('over the 15 MB limit')
    await expect(sectionCount(app, 'Work samples')).toHaveText('3')
  })

  test('a document with only a file takes the file name as its title', async ({ app }) => {
    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('File (PDF or image)').setInputFiles({
      name: 'untitled-iep.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_MIN,
    })
    await app.getByRole('button', { name: 'Attach document' }).click()
    await expect(app.locator('figure', { hasText: 'untitled-iep.pdf' })).toBeVisible()
  })
})
