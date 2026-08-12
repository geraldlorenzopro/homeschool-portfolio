import { editingRow, expect, openSection, row, test } from './fixtures'

async function goToPortfolio(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Finished portfolio' }).click()
  await expect(page.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
}

test.describe('The printed portfolio', () => {
  test('organises the year by area, then goal, then session', async ({ app }) => {
    await goToPortfolio(app)
    const doc = app.locator('.doc')

    await expect(doc.getByRole('heading', { name: 'Goals and instruction by area' })).toBeVisible()
    await expect(doc.getByRole('heading', { name: 'Reading', exact: true })).toBeVisible()
    await expect(doc.getByRole('heading', { name: 'Fine Motor' })).toBeVisible()

    // A goal carries its status, its provenance, and the sessions beneath it.
    await expect(doc).toContainText('Met · From the official IEP')
    await expect(doc).toContainText('Method: Letter tiles')
    await expect(doc).toContainText('Outcome: Read 18 of 20 words')
    await expect(doc).toContainText('(Independently)')
  })

  test('shows every statutory section', async ({ app }) => {
    await goToPortfolio(app)
    const doc = app.locator('.doc')
    for (const heading of [
      'Student & program record',
      'Child profile',
      'Instructor’s statement',
      'Recent evaluations',
      'Goals and instruction by area',
      'Curriculum used',
      'Reading list',
      'Support documents',
      'Evaluator’s certification',
    ]) {
      await expect(doc.getByRole('heading', { name: heading })).toBeVisible()
    }
    await expect(doc).toContainText('s. 1002.41(1)(f), Florida Statutes')
    await expect(doc).toContainText('Goals recorded')
  })

  test('places a work sample beside the goal it evidences', async ({ app }) => {
    await goToPortfolio(app)
    const doc = app.locator('.doc')
    // The seeded samples all carry a goal, so the standalone gallery is absent.
    await expect(doc.getByRole('heading', { name: 'Samples of work' })).toHaveCount(0)
    await expect(doc).toContainText('Word family sort')
  })

  test('an unlinked sample falls back to the gallery', async ({ app }) => {
    await openSection(app, 'Work samples')
    await app.getByLabel('What the work is').fill('Free drawing')
    await app.getByRole('button', { name: 'Add sample' }).click()

    await goToPortfolio(app)
    await expect(
      app.locator('.doc').getByRole('heading', { name: 'Samples of work' }),
    ).toBeVisible()
    await expect(app.locator('.doc')).toContainText('Free drawing')
  })

  test('hours stay out unless switched on', async ({ app }) => {
    await goToPortfolio(app)
    await expect(app.locator('.doc')).not.toContainText('Recorded instructional hours')

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await openSection(app, 'Student information')
    await app.getByLabel('Record hours').check()

    await goToPortfolio(app)
    await expect(app.locator('.doc')).toContainText('Recorded instructional hours')
  })

  test('the plain activity log is opt-in', async ({ app }) => {
    await goToPortfolio(app)
    await expect(
      app.locator('.doc').getByRole('heading', { name: 'Log of educational activities' }),
    ).toHaveCount(0)

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await openSection(app, 'Student information')
    await app.getByLabel(/Include the plain activity log/).check()

    await goToPortfolio(app)
    await expect(
      app.locator('.doc').getByRole('heading', { name: 'Log of educational activities' }),
    ).toBeVisible()
  })

  test('a goal with no sessions says so rather than looking empty', async ({ app }) => {
    await goToPortfolio(app)
    await expect(app.locator('.doc')).toContainText('No sessions recorded against this goal.')
  })

  test('carries the running header and footer, and prints without app chrome', async ({ app }) => {
    await goToPortfolio(app)
    await expect(app.locator('[slot="header"]')).toContainText('Sofía Ramírez')
    await expect(app.locator('[slot="footer"]')).toContainText('s. 1002.41(1)(b), F.S.')

    await app.emulateMedia({ media: 'print' })
    await expect(app.locator('.app-nav')).toBeHidden()
    await expect(app.locator('.doc-toolbar')).toBeHidden()
    await expect(app.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
  })

  test('switching to A4 narrows the sheet', async ({ app }) => {
    await goToPortfolio(app)
    const docPage = app.locator('doc-page')
    const sheetWidth = () =>
      docPage.evaluate(
        (el) =>
          (el as HTMLElement).shadowRoot!.querySelector('.sheet')!.getBoundingClientRect().width,
      )
    const letter = await sheetWidth()
    await app.getByLabel('Paper size').selectOption('a4')
    await expect.poll(sheetWidth).toBeLessThan(letter)
  })

  test('dashboard edits reach the document', async ({ app }) => {
    await openSection(app, 'Goals')
    await row(app, 'take turns in a two-player game')
      .getByRole('button', { name: 'Edit' })
      .click()
    await editingRow(app).getByLabel('Status').selectOption('met')
    await app.getByRole('button', { name: 'Save' }).click()

    await goToPortfolio(app)
    await expect(app.locator('.doc')).toContainText('Met · Parent-written')
  })
})

test.describe('Quick log', () => {
  async function goToQuickLog(page: import('@playwright/test').Page) {
    await page.getByRole('link', { name: 'B · Quick log' }).click()
    await expect(page.getByRole('heading', { name: 'One running log' })).toBeVisible()
  }

  test('files a session into its area and goal', async ({ app }) => {
    await goToQuickLog(app)
    await app.getByLabel('What was covered').fill('Rhyming pairs')
    await app.getByLabel('Area', { exact: true }).selectOption({ label: 'Reading' })
    await app.getByLabel('Goal worked on').selectOption({ index: 2 })
    await app.getByLabel('Method used').fill('Picture cards.')
    await app.getByLabel('Outcome — how the child responded').fill('Matched 8 of 10.')
    await app.getByRole('button', { name: 'Save to portfolio' }).click()

    await expect(app.locator('.feed-row', { hasText: 'Rhyming pairs' })).toContainText(
      'Matched 8 of 10.',
    )

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await openSection(app, 'Sessions')
    await expect(row(app, 'Rhyming pairs')).toContainText('Method: Picture cards.')
  })

  test('the form adapts to the kind of entry', async ({ app }) => {
    await goToQuickLog(app)
    await expect(app.getByLabel('Method used')).toBeVisible()

    await app.getByRole('button', { name: 'Book finished' }).click()
    await expect(app.getByLabel('Author')).toBeVisible()
    await expect(app.getByLabel('Goal worked on')).toHaveCount(0)
    await expect(app.getByText('Files into: Reading list')).toBeVisible()

    await app.getByRole('button', { name: 'Work sample' }).click()
    await expect(app.getByLabel('Photo or scan')).toBeVisible()
    await expect(app.getByText('Files into: Work samples')).toBeVisible()
  })

  test('a book from the quick log lands in the reading list', async ({ app }) => {
    await goToQuickLog(app)
    await app.getByRole('button', { name: 'Book finished' }).click()
    await app.getByLabel('Book title').fill('Corduroy')
    await app.getByLabel('Author').fill('Don Freeman')
    await app.getByLabel('How it was read').fill('Read independently')
    await app.getByRole('button', { name: 'Save to portfolio' }).click()

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await openSection(app, 'Reading list')
    await expect(row(app, 'Corduroy')).toContainText('Don Freeman')
  })
})
