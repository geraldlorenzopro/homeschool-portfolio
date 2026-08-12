import { PDF_MIN, PNG_1PX, expect, test } from './fixtures'
import type { Page } from '@playwright/test'

async function openMonthly(page: Page) {
  await page.goto('/monthly')
  await expect(page.getByRole('heading', { name: 'Home Education Portfolio' })).toBeVisible()
}

function page_(page: Page, label: string) {
  return page.locator('.section-link', { hasText: label })
}

const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG_1PX })

test.describe('Curriculums used', () => {
  test('adds, keeps and removes a row', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Curriculums used').click()
    await expect(app.getByText('Nothing listed yet.')).toBeVisible()

    await app.getByRole('button', { name: '+ Add curriculum' }).click()
    await app.getByLabel('Curriculum title').fill('Time4Learning')
    await app.getByLabel('Publisher').fill('Time4Learning Inc.')
    await app.getByLabel('Subject').fill('Language Arts')
    await app.getByLabel('How it was used').fill('Daily lessons and quizzes')
    await expect(page_(app, 'Curriculums used').locator('.section-count')).toHaveText('1')

    await app.reload()
    await page_(app, 'Curriculums used').click()
    await expect(app.getByLabel('Curriculum title')).toHaveValue('Time4Learning')
    await expect(app.getByLabel('How it was used')).toHaveValue('Daily lessons and quizzes')

    await app.getByRole('button', { name: /^Remove Time4Learning$/ }).click()
    await expect(app.getByText('Nothing listed yet.')).toBeVisible()
    await expect(page_(app, 'Curriculums used').locator('.section-count')).toHaveText('0')
  })

  test('rows are independent — a second one does not overwrite the first', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Curriculums used').click()

    await app.getByRole('button', { name: '+ Add curriculum' }).click()
    await app.getByLabel('Curriculum title').fill('Handwriting Without Tears')
    await app.getByRole('button', { name: '+ Add curriculum' }).click()
    await app.getByLabel('Curriculum title').nth(1).fill('Singapore Math')

    await app.reload()
    await page_(app, 'Curriculums used').click()
    await expect(app.getByLabel('Curriculum title').nth(0)).toHaveValue('Handwriting Without Tears')
    await expect(app.getByLabel('Curriculum title').nth(1)).toHaveValue('Singapore Math')
  })
  test('the last thing typed survives leaving the page straight away', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Curriculums used').click()
    await app.getByRole('button', { name: '+ Add curriculum' }).click()

    // No assertion in between on purpose: the 500 ms debounce is still
    // counting when the page goes away, which is where an edit used to die.
    await app.getByLabel('Curriculum title').fill('Explode The Code')
    await app.reload()

    await page_(app, 'Curriculums used').click()
    await expect(app.getByLabel('Curriculum title')).toHaveValue('Explode The Code')
  })
  test('the saving indicator settles instead of sticking on "Saving…"', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Curriculums used').click()
    await app.getByRole('button', { name: '+ Add curriculum' }).click()

    // One count per field, not per keystroke: typing 25 characters used to
    // raise the counter 25 times and lower it once.
    await app
      .getByLabel('Curriculum title')
      .pressSequentially('Handwriting Without Tears', { delay: 25 })

    const state = app.locator('.save-state')
    await expect(state).toContainText('Saved', { timeout: 6000 })
    await expect(state).toHaveAttribute('data-dirty', 'false')
  })
})

test.describe('Work samples', () => {
  test('takes several files in one go, one sample each', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Work samples').click()
    await expect(app.getByText('Nothing uploaded yet.')).toBeVisible()

    await app.getByLabel('Work sample files').setInputFiles([
      png('letter-tiles.png'),
      png('counting_bears.png'),
      { name: 'reading log.pdf', mimeType: 'application/pdf', buffer: PDF_MIN },
    ])

    await expect(app.locator('.sample-card')).toHaveCount(3)
    await expect(page_(app, 'Work samples').locator('.section-count')).toHaveText('3')

    // The file name becomes the title, tidied up, so nothing arrives nameless.
    await expect(app.getByLabel('Title for letter-tiles.png')).toHaveValue('letter tiles')
    await expect(app.getByLabel('Title for counting_bears.png')).toHaveValue('counting bears')
    await expect(app.getByLabel('Title for reading log.pdf')).toHaveValue('reading log')
  })

  test('the images show as images and the PDF renders its first page', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Work samples').click()
    await app
      .getByLabel('Work sample files')
      .setInputFiles([png('drawing.png'), { name: 'story.pdf', mimeType: 'application/pdf', buffer: PDF_MIN }])

    const cards = app.locator('.sample-card')
    await expect(cards.nth(0).locator('img')).toHaveAttribute('src', /^data:image\/jpeg/)
    // pdf.js draws the page onto a canvas; an <embed> would not print.
    await expect(cards.nth(1).locator('canvas')).toBeVisible({ timeout: 20_000 })
  })

  test('a sample can be named, dated and removed, and it all survives a reload', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Work samples').click()
    await app.getByLabel('Work sample files').setInputFiles([png('page1.png'), png('page2.png')])

    await app.getByLabel('Title for page1.png').fill('Her first written sentence')
    await app.getByLabel('Subject for page1.png').fill('Language Arts')
    await app.getByLabel('Date for page1.png').fill('2026-01-14')

    await app.reload()
    await page_(app, 'Work samples').click()
    await expect(app.getByLabel('Title for page1.png')).toHaveValue('Her first written sentence')
    await expect(app.getByLabel('Subject for page1.png')).toHaveValue('Language Arts')
    await expect(app.getByLabel('Date for page1.png')).toHaveValue('2026-01-14')

    await app.getByRole('button', { name: 'Remove Her first written sentence' }).click()
    await expect(app.locator('.sample-card')).toHaveCount(1)
    await app.reload()
    await page_(app, 'Work samples').click()
    await expect(app.locator('.sample-card')).toHaveCount(1)
  })

  test('one bad file in a batch does not take the good ones with it', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Work samples').click()

    await app.getByLabel('Work sample files').setInputFiles([
      png('good-one.png'),
      // A .pdf name over HTML bytes: rejected on its magic number, not its name.
      { name: 'not-really.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html>no</html>') },
      png('good-two.png'),
    ])

    await expect(app.locator('.sample-card')).toHaveCount(2)
    await expect(app.getByText(/not-really\.pdf/)).toBeVisible()
    await expect(app.getByLabel('Title for good-one.png')).toBeVisible()
    await expect(app.getByLabel('Title for good-two.png')).toBeVisible()
  })

  test('the eye opens the sample without leaving the page', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Work samples').click()
    await app.getByLabel('Work sample files').setInputFiles([png('worksheet.png')])

    await app.getByRole('button', { name: 'View worksheet' }).click()
    await expect(app.getByRole('dialog')).toBeVisible()
  })
})
