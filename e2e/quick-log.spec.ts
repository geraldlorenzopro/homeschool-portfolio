import { PNG_1PX, expect, openSection, sectionCount, test } from './fixtures'

async function goToQuickLog(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'B · Quick log' }).click()
  await expect(page.getByRole('heading', { name: 'One running log' })).toBeVisible()
}

test.describe('Flow B — quick log', () => {
  test('summarises the year and lists everything chronologically', async ({ app }) => {
    await goToQuickLog(app)
    await expect(app.getByText('17 entries · 6 books · 8 hours')).toBeVisible()
    // Newest first: the May 2026 work sample leads the feed.
    await expect(app.locator('.feed-row').first()).toContainText('Owl Moon retelling')
  })

  test('a lesson files into its subject section', async ({ app }) => {
    await goToQuickLog(app)
    await app.getByLabel('What was covered').fill('Telling time to the half hour')
    await app.getByLabel('Subject').selectOption('math')
    await app.getByLabel('Notes').fill('Paper clock faces.')
    await app.getByLabel('Hours').fill('1.5')
    await expect(app.getByText('Files into: Log of educational activities')).toBeVisible()
    await app.getByRole('button', { name: 'Save to portfolio' }).click()

    await expect(app.getByText('18 entries · 6 books · 9.5 hours')).toBeVisible()

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await expect(sectionCount(app, 'Mathematics')).toHaveText('4')
    await openSection(app, 'Mathematics')
    await expect(
      app.locator('tbody tr', { hasText: 'Telling time to the half hour' }),
    ).toContainText('1.5')
  })

  test('a finished book files into the reading list', async ({ app }) => {
    await goToQuickLog(app)
    await app.getByRole('button', { name: 'Book finished' }).click()
    await expect(app.getByText('Files into: Reading list')).toBeVisible()

    await app.getByLabel('Book title').fill('Make Way for Ducklings')
    await app.getByLabel('Author').fill('Robert McCloskey')
    await app.getByLabel('Notes').fill('Read independently')
    await app.getByRole('button', { name: 'Save to portfolio' }).click()

    await expect(app.getByText('18 entries · 7 books · 8 hours')).toBeVisible()

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await openSection(app, 'Reading list')
    const row = app.locator('tbody tr', { hasText: 'Make Way for Ducklings' })
    await expect(row).toContainText('Robert McCloskey')
    await expect(row).toContainText('Read independently')
  })

  test('a work sample files into samples, with its photo', async ({ app }) => {
    await goToQuickLog(app)
    await app.getByRole('button', { name: 'Work sample' }).click()
    await expect(app.getByText('Files into: Samples of work')).toBeVisible()

    await app.getByLabel('What the work is').fill('Story map poster')
    await app.getByLabel('Photo or scan').setInputFiles({
      name: 'poster.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await app.getByRole('button', { name: 'Save to portfolio' }).click()

    await expect(app.locator('.feed-row', { hasText: 'Story map poster' })).toContainText(
      'photo attached',
    )

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await expect(sectionCount(app, 'Work samples')).toHaveText('5')
  })

  test('the side field swaps between Author and Subject', async ({ app }) => {
    await goToQuickLog(app)
    await expect(app.getByLabel('Subject')).toBeVisible()

    await app.getByRole('button', { name: 'Book finished' }).click()
    await expect(app.getByLabel('Author')).toBeVisible()
    await expect(app.getByLabel('Subject')).toHaveCount(0)
    // Hours belong to lessons only.
    await expect(app.getByLabel('Hours')).toHaveCount(0)
  })

  test('removing from the feed removes it from its section', async ({ app }) => {
    await goToQuickLog(app)
    const row = app.locator('.feed-row', { hasText: 'Frog and Toad Together' })
    await row.getByRole('button', { name: 'Remove' }).click()
    await expect(row).toHaveCount(0)

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await expect(sectionCount(app, 'Reading list')).toHaveText('5')
  })
})
