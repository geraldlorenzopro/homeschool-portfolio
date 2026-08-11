import { expect, openSection, test } from './fixtures'

async function goToPortfolio(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Finished portfolio' }).click()
  await expect(page.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
}

test.describe('Flow C — the printable portfolio', () => {
  test('renders every section of the statutory document', async ({ app }) => {
    await goToPortfolio(app)
    const doc = app.locator('.doc')

    await expect(doc).toContainText('State of Florida · Home Education Program')
    await expect(doc).toContainText('First grade (K-2) · 2025–2026 · Miami-Dade County')

    for (const heading of [
      'Student & program record',
      'Instructor’s statement',
      'Curriculum used',
      'Log of educational activities',
      'Reading list',
      'Samples of work',
      'Support documents',
      'Evaluator’s certification',
    ]) {
      await expect(doc.getByRole('heading', { name: heading })).toBeVisible()
    }

    await expect(doc).toContainText('8 hours logged across Language Arts and Mathematics')
    await expect(doc).toContainText('s. 1002.41(1)(f), Florida Statutes')
    await expect(doc).toContainText('Karen Whitfield, FL cert. #718402')
    await expect(doc).toContainText('Jun 5, 2026')
    await expect(doc.getByText('Evaluator signature')).toBeVisible()
  })

  test('carries the running header and footer', async ({ app }) => {
    await goToPortfolio(app)
    const header = app.locator('[slot="header"]')
    await expect(header).toContainText('Sofía Ramírez — Home Education Portfolio')
    await expect(header).toContainText('2025–2026')

    const footer = app.locator('[slot="footer"]')
    await expect(footer).toContainText('retained two years per s. 1002.41(1)(b), F.S.')
    await expect(footer).toContainText('Marta Ramírez')
  })

  test('groups the activity log by subject, oldest first', async ({ app }) => {
    await goToPortfolio(app)
    const doc = app.locator('.doc')
    await expect(doc.getByRole('heading', { name: 'Language Arts' })).toBeVisible()
    await expect(doc.getByRole('heading', { name: 'Mathematics' })).toBeVisible()
    await expect(doc).toContainText('4 entries  ·  4.5 recorded hours')
    await expect(doc).toContainText('3 entries  ·  3.5 recorded hours')

    // Document order is chronological, the reverse of the editor's.
    const dates = doc.locator('.doc-rule-head').first().locator('..').locator('tbody tr td.num')
    await expect(dates.first()).toHaveText('Sep 8, 2025')
  })

  test('"Group by subject" off switches to one chronological list', async ({ app }) => {
    await goToPortfolio(app)
    await app.getByLabel('Group by subject').uncheck()

    const doc = app.locator('.doc')
    await expect(doc.getByRole('heading', { name: 'Chronological log' })).toBeVisible()
    await expect(doc.getByRole('heading', { name: 'Language Arts' })).toHaveCount(0)
    await expect(doc).toContainText('7 entries  ·  8 recorded hours')
    // Each row now names its own subject.
    await expect(doc).toContainText('Mathematics — Counting and place value to 100')
  })

  test('"Show hours" off drops the hours column and the hour totals', async ({ app }) => {
    await goToPortfolio(app)
    await app.getByLabel('Show hours').uncheck()

    const doc = app.locator('.doc')
    await expect(doc).toContainText('4 entries')
    await expect(doc).not.toContainText('recorded hours')
  })

  test('switching to A4 changes the sheet', async ({ app }) => {
    await goToPortfolio(app)
    const docPage = app.locator('doc-page')
    await expect(docPage).toHaveAttribute('size', 'letter')
    await expect(docPage).toHaveAttribute('margin', '0.8in')

    // The paper itself lives in the component's shadow root; the host element
    // is full-width, so measure the sheet.
    const sheetWidth = () =>
      docPage.evaluate(
        (el) => (el as HTMLElement).shadowRoot!.querySelector('.sheet')!.getBoundingClientRect().width,
      )

    const letterWidth = await sheetWidth()
    await app.getByLabel('Paper size').selectOption('a4')
    await expect(docPage).toHaveAttribute('size', 'a4')

    // A4 is 210 mm against Letter's 8.5 in — narrower, and visibly so.
    await expect.poll(sheetWidth).toBeLessThan(letterWidth)
  })

  test('a section with nothing in it is left out entirely', async ({ app }) => {
    await openSection(app, 'Reading list')
    const removals = app.getByRole('button', { name: 'Remove' })
    for (let left = await removals.count(); left > 0; left--) {
      await removals.first().click()
    }

    await goToPortfolio(app)
    const doc = app.locator('.doc')
    await expect(doc.getByRole('heading', { name: 'Reading list' })).toHaveCount(0)
    // The rest of the document is unaffected.
    await expect(doc.getByRole('heading', { name: 'Samples of work' })).toBeVisible()
  })

  test('print hides the app chrome and keeps the document', async ({ app }) => {
    await goToPortfolio(app)
    await app.emulateMedia({ media: 'print' })

    await expect(app.locator('.app-nav')).toBeHidden()
    await expect(app.locator('.doc-toolbar')).toBeHidden()
    await expect(app.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
    await expect(app.locator('[slot="header"]')).toBeVisible()
  })

  test('edits made in the dashboard show up in the document', async ({ app }) => {
    await app.getByLabel('Student name').fill('Elena Ruiz')
    await app.getByLabel('School year').fill('2026–2027')
    await app.waitForTimeout(700)

    await goToPortfolio(app)
    await expect(app.locator('.doc')).toContainText('Elena Ruiz')
    await expect(app.locator('[slot="header"]')).toContainText('2026–2027')
  })
})
