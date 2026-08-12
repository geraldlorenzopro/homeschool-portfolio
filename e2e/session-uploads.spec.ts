import { PDF_MIN, PNG_1PX, expect, openSection, row, sectionCount, test } from './fixtures'

test.describe('Uploading from inside a session', () => {
  test('a photo added with the session becomes a work sample filed against it', async ({
    app,
  }) => {
    await openSection(app, 'Language Arts')
    await app.getByLabel('What was covered').fill('Letter tile sort')
    await app.getByLabel('Photo or scan of the work').setInputFiles({
      name: 'tiles.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await expect(app.locator('.add-card img')).toBeVisible()
    await app.getByRole('button', { name: 'Add entry' }).click()

    // Shown on the session row itself…
    const session = row(app, 'Letter tile sort')
    await expect(session.locator('.plate img')).toHaveAttribute('src', /^data:image\/jpeg/)

    // …and it is a real work sample, not a private attachment.
    await expect(sectionCount(app, 'Work samples')).toHaveText('4')
    await openSection(app, 'Work samples')
    await expect(app.locator('figure', { hasText: 'Letter tile sort' })).toBeVisible()
  })

  test('more photos can be added to a session that already exists', async ({ app }) => {
    await openSection(app, 'Language Arts')
    const session = row(app, 'Short vowel word families')

    await session.getByRole('button', { name: '+ Add photo' }).click()
    await session.locator('input[type="file"]').setInputFiles({
      name: 'one.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await expect(session.locator('.plate img')).toHaveCount(1)

    await session.locator('input[type="file"]').setInputFiles({
      name: 'two.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await expect(session.locator('.plate img')).toHaveCount(2)
    await expect(session.getByRole('button', { name: '+ Add another photo' })).toBeVisible()
  })

  test('a session photo prints under its session, not twice', async ({ app }) => {
    await openSection(app, 'Language Arts')
    await app.getByLabel('What was covered').fill('Sand tray writing')
    await app.getByLabel('Goal worked on').selectOption({ index: 1 })
    await app.getByLabel('Photo or scan of the work').setInputFiles({
      name: 'sand.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Add entry' }).click()

    await app.getByRole('link', { name: 'Finished portfolio' }).click()
    const doc = app.locator('.doc')
    await expect(doc).toContainText('Sand tray writing')
    // One copy: under the session, not also in the standalone gallery.
    await expect(doc.locator('img[alt="Sand tray writing"]')).toHaveCount(1)
  })

  test('deleting the session leaves the photograph in Work samples', async ({ app }) => {
    await openSection(app, 'Language Arts')
    await app.getByLabel('What was covered').fill('Temporary session')
    await app.getByLabel('Photo or scan of the work').setInputFiles({
      name: 'keep.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Add entry' }).click()
    await expect(sectionCount(app, 'Work samples')).toHaveText('4')

    await row(app, 'Temporary session').getByRole('button', { name: 'Remove' }).click()
    await expect(row(app, 'Temporary session')).toHaveCount(0)

    // The evidence survives — the statute asks for it independently.
    await expect(sectionCount(app, 'Work samples')).toHaveText('4')
  })
})

test.describe('The eye button', () => {
  test('opens a photograph without leaving the page', async ({ app }) => {
    await openSection(app, 'Work samples')
    await app.getByLabel('What the work is').fill('Zoomable sample')
    await app.getByLabel('Photo or scan').setInputFiles({
      name: 'z.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Add sample' }).click()

    const figure = app.locator('figure', { hasText: 'Zoomable sample' })
    await figure.getByRole('button', { name: /^View / }).click()

    const zoom = app.getByRole('dialog')
    await expect(zoom).toBeVisible()
    await expect(zoom.locator('img')).toHaveAttribute('src', /^data:image\/jpeg/)
  })

  test('opens a PDF in the viewer, without leaving the page', async ({ app }) => {
    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('Document title').fill('Plan as PDF')
    await app.getByLabel('File (PDF or image)').setInputFiles({
      name: 'plan.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_MIN,
    })
    await app.getByRole('button', { name: 'Attach document' }).click()

    const figure = app.locator('figure', { hasText: 'Plan as PDF' })
    await figure.getByRole('button', { name: /^View / }).click()
    await expect(app.getByRole('dialog').locator('.pdf-pages canvas').first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('is absent where there is no file to view', async ({ app }) => {
    await openSection(app, 'Work samples')
    await app.getByLabel('What the work is').fill('No photo yet')
    await app.getByRole('button', { name: 'Add sample' }).click()

    const figure = app.locator('figure', { hasText: 'No photo yet' })
    await expect(figure.getByRole('button', { name: /^View / })).toHaveCount(0)
  })
})

test.describe('Files on curriculum and reading list rows', () => {
  test('a curriculum row takes a document', async ({ app }) => {
    await openSection(app, 'Curriculum used')
    const target = row(app, 'Math-U-See Alpha')

    await target.getByRole('button', { name: '+ Add document' }).click()
    await target.locator('input[type="file"]').setInputFiles({
      name: 'scope.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_MIN,
    })

    await expect(target.getByRole('button', { name: /^View / })).toBeVisible()
    await expect(target.getByRole('button', { name: '+ Add another document' })).toBeVisible()
  })

  test('a book row takes a page photograph, and loses it with the book', async ({ app }) => {
    await openSection(app, 'Reading list')
    const target = row(app, 'Owl Moon')

    await target.getByRole('button', { name: '+ Add page' }).click()
    await target.locator('input[type="file"]').setInputFiles({
      name: 'page.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await expect(target.locator('.plate img')).toHaveCount(1)

    await target.getByRole('button', { name: 'Remove' }).click()
    await expect(row(app, 'Owl Moon')).toHaveCount(0)
    // No orphan left behind pointing at a book that is gone.
    await expect(app.locator('.plate img')).toHaveCount(0)
  })
})
