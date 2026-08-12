import { expect, test } from './fixtures'

async function openMonthly(page: import('@playwright/test').Page) {
  await page.goto('/monthly')
  await expect(page.getByRole('heading', { name: 'Home Education Portfolio' })).toBeVisible()
}

function page_(page: import('@playwright/test').Page, label: string) {
  return page.locator('.section-link', { hasText: label })
}

test.describe('One link, two portfolios', () => {
  test('the root asks which portfolio, and both open', async ({ app }) => {
    await app.goto('/')
    await expect(app.getByRole('heading', { name: /Which portfolio/ })).toBeVisible()

    await app.getByRole('link', { name: /Home Education Portfolio/ }).click()
    await expect(app.getByRole('heading', { name: 'January 2026' })).toHaveCount(0)
    await expect(app.locator('.cover-title')).toContainText('Home Education')

    await app.getByRole('link', { name: 'Switch portfolio' }).click()
    await app.getByRole('link', { name: /Annual Evaluation Portfolio/ }).click()
    await expect(app.getByRole('heading', { name: 'Student information' })).toBeVisible()
  })

  test('the old evaluation links still work', async ({ app }) => {
    await app.goto('/quick-log')
    await expect(app.getByRole('heading', { name: 'One running log' })).toBeVisible()
    await app.goto('/portfolio')
    await expect(app.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
  })

  test('the two portfolios keep separate records but share the student', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Child’s information').click()
    // The child's name comes from the shared student record.
    await expect(app.getByLabel('Child’s full name')).toHaveValue('Sofía Ramírez')

    await app.getByLabel('Address').fill('123 Palm Avenue')
    await app.waitForTimeout(600)

    // Nothing of this leaks into the evaluation portfolio.
    await app.goto('/evaluation')
    await expect(app.getByLabel('Student name')).toHaveValue('Sofía Ramírez')
    await expect(app.getByText('123 Palm Avenue')).toHaveCount(0)
  })
})

test.describe('The monthly log', () => {
  test('runs August 2025 to July 2026', async ({ app }) => {
    await openMonthly(app)
    await expect(page_(app, 'August 2025')).toBeVisible()
    await expect(page_(app, 'July 2026')).toBeVisible()
    await expect(app.locator('.section-link')).toHaveCount(15) // cover + record + child + 12
  })

  test('a ticked day saves and survives a reload', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'January 2026').click()

    const box = app.getByLabel('Language Arts on January 2026 14')
    await box.check()
    await expect(box).toBeChecked()
    // The sidebar counts the marks for that month.
    await expect(page_(app, 'January 2026').locator('.section-count')).toHaveText('1')
    await expect(app.locator('.save-state')).toContainText('Saved', { timeout: 4000 })

    await app.reload()
    await page_(app, 'January 2026').click()
    await expect(app.getByLabel('Language Arts on January 2026 14')).toBeChecked()
  })

  test('days a month does not have are struck through and cannot be ticked', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'February 2026').click()

    // 2026 is not a leap year: February has 28 days.
    await expect(app.getByLabel('Language Arts on February 2026 28')).toBeVisible()
    await expect(app.getByLabel('Language Arts on February 2026 29')).toHaveCount(0)
    await expect(app.locator('.log-cell[data-missing]').first()).toBeVisible()

    await page_(app, 'April 2026').click()
    await expect(app.getByLabel('Language Arts on April 2026 30')).toBeVisible()
    await expect(app.getByLabel('Language Arts on April 2026 31')).toHaveCount(0)
  })

  test('the two free subject rows can be named', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'January 2026').click()

    await app.getByLabel('Name of subject row 4').fill('Science')
    await app.waitForTimeout(600)

    // A subject belongs to the year, so it shows on every month.
    await page_(app, 'March 2026').click()
    await expect(app.getByLabel('Name of subject row 4')).toHaveValue('Science')
    await expect(app.getByLabel('Science on March 2026 3', { exact: true })).toBeVisible()
  })

  test('the statutory checklist ticks and persists', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'Portfolio record').click()

    await expect(app.getByText('A complete Florida portfolio must contain')).toBeVisible()
    const samples = app.getByRole('checkbox').nth(2)
    await samples.check()
    await app.waitForTimeout(600)

    await app.reload()
    await page_(app, 'Portfolio record').click()
    await expect(app.getByRole('checkbox').nth(2)).toBeChecked()
  })

  test('monthly notes are kept per month', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'January 2026').click()
    await app.getByLabel('Titles of Reading Materials').fill('Frog and Toad')
    await app.getByLabel('Accomplishments this month').fill('Read her first chapter book.')
    await app.waitForTimeout(600)

    await page_(app, 'February 2026').click()
    await expect(app.getByLabel('Titles of Reading Materials')).toHaveValue('')

    await page_(app, 'January 2026').click()
    await expect(app.getByLabel('Titles of Reading Materials')).toHaveValue('Frog and Toad')
    await expect(app.getByLabel('Accomplishments this month')).toHaveValue(
      'Read her first chapter book.',
    )
  })
  test('heads each day with its weekday, and greys the weekends', async ({ app }) => {
    await openMonthly(app)
    await page_(app, 'January 2026').click()

    // 1 January 2026 was a Thursday. Written out rather than computed, so a
    // calendar that drifts by a day fails here instead of printing quietly.
    const heads = app.locator('.log-head .log-day')
    await expect(heads.nth(0)).toContainText('Thu')
    await expect(heads.nth(0)).toContainText('1')
    await expect(heads.nth(4)).toContainText('Mon')
    await expect(heads.nth(30)).toContainText('Sat')

    // Nine weekend days in January 2026: the 3rd, 4th, 10th, 11th, 17th, 18th,
    // 24th, 25th and 31st.
    await expect(app.locator('.log-head .log-day[data-weekend]')).toHaveCount(9)
    await expect(app.locator('.log-row:not(.log-head) .log-cell[data-weekend]')).toHaveCount(45)

    // February starts on a Sunday and stops at 28 — no weekday on a day the
    // month does not have.
    await page_(app, 'February 2026').click()
    const feb = app.locator('.log-head .log-day')
    await expect(feb.nth(0)).toContainText('Sun')
    await expect(feb.nth(27)).toContainText('Sat')
    await expect(feb.nth(28)).toHaveAttribute('data-missing', 'true')
    await expect(feb.nth(28)).not.toContainText(/[A-Za-z]/)
  })
})
