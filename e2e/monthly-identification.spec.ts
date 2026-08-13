import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * A folder gets photocopied, stapled, carried between desks and put down.
 * Six of its twenty pages named no child at all, nothing said which folder a
 * loose page belonged to, and nothing said when it was printed — so two
 * versions of the same portfolio were indistinguishable on paper.
 */
const SHEETS = [
  'Cover',
  'Table of contents',
  'Child’s information',
  'August 2025',
  'January 2026',
  'June 2026',
  'Curriculums used',
  'Work samples',
  'Additional documents',
]

async function open(page: Page, sheet: string) {
  await page.goto('/monthly')
  await page.locator('.section-link', { hasText: sheet }).click()
  await expect(page.locator('.sheet')).toBeVisible()
}

test.describe('Every sheet says whose it is', () => {
  for (const sheet of SHEETS) {
    test(`${sheet} carries the child, the folder and its own number`, async ({ app }) => {
      await open(app, sheet)
      const foot = app.locator('.sheet-foot')
      await expect(foot).toBeVisible()
      await expect(foot).toContainText('Sofía Ramírez')
      await expect(foot).toContainText('Home Education Portfolio')
      await expect(foot).toContainText(/sheet \d+ of 17/)
      // No print date: this folder records a school year, not the afternoon
      // somebody pressed print, and two copies of it are the same document.
      await expect(foot).not.toContainText(/printed/i)
    })
  }

  test('the sheets are numbered in the order they print, with none missing', async ({ app }) => {
    await app.goto('/monthly')
    const links = app.locator('.section-link')
    const total = await links.count()
    expect(total).toBe(17)

    const seen: number[] = []
    for (let i = 0; i < total; i++) {
      await links.nth(i).click()
      const foot = await app.locator('.sheet-foot').innerText()
      seen.push(Number(/sheet (\d+) of 17/.exec(foot)![1]))
    }
    expect(seen).toEqual(Array.from({ length: 17 }, (_, i) => i + 1))
  })
})

test.describe('Nothing on the paper is invented', () => {
  test('the county prints only once the parent has entered one', async ({ app }) => {
    await open(app, 'Table of contents')
    await app.getByLabel('County').fill('')
    await app.waitForTimeout(700)

    await expect(app.locator('.sheet-foot')).not.toContainText('County')
    // The cover carries the child's name, not a statute reference and not a
    // district nobody typed.
    await expect(app.locator('.cover-kicker')).toHaveCount(0)

    await app.getByLabel('County').fill('Broward')
    await app.waitForTimeout(700)
    await expect(app.locator('.sheet-foot')).toContainText('Broward County, Florida')
  })

  test('the school year is the parent’s to name, and renaming it keeps the year', async ({
    app,
  }) => {
    await open(app, 'January 2026')
    await app.getByLabel('Language Arts on January 2026 14').check()
    await app.waitForTimeout(700)

    await app.locator('.section-link', { hasText: 'Table of contents' }).click()
    await app.getByLabel('School year').fill('Kindergarten 2025–26')
    await app.waitForTimeout(700)
    await app.reload()

    // The tick survives: the year is found by student, not by its name.
    await app.locator('.section-link', { hasText: 'January 2026' }).click()
    await expect(app.getByLabel('Language Arts on January 2026 14')).toBeChecked()
    await expect(app.locator('.sheet-foot')).toContainText('Kindergarten 2025–26')
  })
})
