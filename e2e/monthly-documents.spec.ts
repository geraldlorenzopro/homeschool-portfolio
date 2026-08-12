import { PDF_MIN, PNG_1PX, expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The last sheet of the monthly portfolio: the Letter of Intent, the annual
 * evaluation, anything else the folder has to carry. Unlike a work sample,
 * these print in full — a portfolio that only references its documents is not
 * a portfolio anyone can inspect.
 */
async function openDocuments(page: Page) {
  await page.goto('/monthly')
  await expect(page.getByRole('heading', { name: 'Home Education Portfolio' })).toBeVisible()
  await page.locator('.section-link', { hasText: 'Additional documents' }).click()
  await expect(page.getByRole('heading', { name: 'Additional documents' })).toBeVisible()
}

const count = (page: Page) =>
  page.locator('.section-link', { hasText: 'Additional documents' }).locator('.section-count')

const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: PDF_MIN })
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG_1PX })

test.describe('Additional documents', () => {
  test('sits at the very end of the portfolio', async ({ app }) => {
    await app.goto('/monthly')
    const links = app.locator('.section-link')
    await expect(links).toHaveCount(17)
    await expect(links.last()).toContainText('Additional documents')
  })

  test('takes several files at once, one document each', async ({ app }) => {
    await openDocuments(app)
    await expect(app.getByText('Nothing attached yet.')).toBeVisible()

    await app
      .getByLabel('Additional document files')
      .setInputFiles([pdf('letter of intent.pdf'), pdf('annual-evaluation.pdf'), png('shots.png')])

    await expect(app.locator('.document-block')).toHaveCount(3)
    await expect(count(app)).toHaveText('3')

    await expect(app.getByLabel('Title for letter of intent.pdf')).toHaveValue('letter of intent')
    await expect(app.getByLabel('Title for annual-evaluation.pdf')).toHaveValue('annual evaluation')
    await expect(app.getByLabel('Title for shots.png')).toHaveValue('shots')
  })

  test('a document is named, typed, dated and noted, and it all survives a reload', async ({
    app,
  }) => {
    await openDocuments(app)
    await app.getByLabel('Additional document files').setInputFiles([pdf('intent.pdf')])

    await app.getByLabel('Title for intent.pdf').fill('Notice of Intent to establish a home education program')
    await app.getByLabel('Type of intent.pdf').selectOption('Letter of Intent')
    await app.getByLabel('Date of intent.pdf').fill('2025-08-11')
    await app.getByLabel('Note on intent.pdf').fill('Filed with Broward County Public Schools.')

    await app.reload()
    await app.locator('.section-link', { hasText: 'Additional documents' }).click()

    await expect(app.getByLabel('Title for intent.pdf')).toHaveValue(
      'Notice of Intent to establish a home education program',
    )
    await expect(app.getByLabel('Type of intent.pdf')).toHaveValue('Letter of Intent')
    await expect(app.getByLabel('Date of intent.pdf')).toHaveValue('2025-08-11')
    await expect(app.getByLabel('Note on intent.pdf')).toHaveValue(
      'Filed with Broward County Public Schools.',
    )
  })

  test('a PDF prints its pages, not a note saying a file is attached', async ({ app }) => {
    await openDocuments(app)
    await app.getByLabel('Additional document files').setInputFiles([pdf('evaluation.pdf')])

    // pdf.js draws each page onto a canvas. An <embed> or an <iframe> shows on
    // screen and prints as an empty box.
    const block = app.locator('.document-block').first()
    await expect(block.locator('canvas')).toHaveCount(1, { timeout: 20_000 })
    await expect(block.locator('canvas')).toBeVisible()
  })

  test('an image document shows as an image', async ({ app }) => {
    await openDocuments(app)
    await app.getByLabel('Additional document files').setInputFiles([png('certificate.png')])

    const block = app.locator('.document-block').first()
    await expect(block.locator('img')).toHaveAttribute('src', /^data:image\/jpeg/)
  })

  test('one unreadable file does not take the rest of the batch with it', async ({ app }) => {
    await openDocuments(app)

    await app.getByLabel('Additional document files').setInputFiles([
      pdf('good.pdf'),
      // Named .pdf, but the bytes are HTML — rejected on its magic number.
      { name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html>no</html>') },
      png('also-good.png'),
    ])

    await expect(app.locator('.document-block')).toHaveCount(2)
    await expect(app.getByText(/fake\.pdf/)).toBeVisible()
    await expect(app.getByLabel('Title for good.pdf')).toBeVisible()
    await expect(app.getByLabel('Title for also-good.png')).toBeVisible()
  })

  test('a document can be removed, and stays removed', async ({ app }) => {
    await openDocuments(app)
    await app.getByLabel('Additional document files').setInputFiles([pdf('one.pdf'), pdf('two.pdf')])
    await expect(app.locator('.document-block')).toHaveCount(2)

    await app.getByRole('button', { name: 'Remove one' }).click()
    await expect(app.locator('.document-block')).toHaveCount(1)
    await expect(count(app)).toHaveText('1')

    await app.reload()
    await app.locator('.section-link', { hasText: 'Additional documents' }).click()
    await expect(app.locator('.document-block')).toHaveCount(1)
    await expect(app.getByLabel('Title for two.pdf')).toBeVisible()
  })

  test('the eye opens the document without leaving the page', async ({ app }) => {
    await openDocuments(app)
    await app.getByLabel('Additional document files').setInputFiles([png('award.png')])

    await app.getByRole('button', { name: 'View award' }).click()
    await expect(app.getByRole('dialog')).toBeVisible()
  })

  test('the documents are not confused with the work samples', async ({ app }) => {
    await openDocuments(app)
    await app.getByLabel('Additional document files').setInputFiles([pdf('evaluation.pdf')])
    await expect(count(app)).toHaveText('1')

    await app.locator('.section-link', { hasText: 'Work samples' }).click()
    await expect(app.getByText('Nothing uploaded yet.')).toBeVisible()
    await expect(
      app.locator('.section-link', { hasText: 'Work samples' }).locator('.section-count'),
    ).toHaveText('0')
  })
})
