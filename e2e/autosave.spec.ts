import { expect, openSection, test } from './fixtures'

/**
 * The promise the app makes is "stop mid-year, come back, nothing is lost".
 * These are the tests that hold it to that.
 */
test.describe('Autosave and persistence', () => {
  test('a typed field survives a full page reload', async ({ app }) => {
    await app.getByLabel('Student name').fill('Mateo Álvarez')
    await app.getByLabel('County of registration').fill('Broward')

    // Give the 500 ms debounce room to commit, then reload from scratch.
    await app.waitForTimeout(700)
    await app.reload()

    await expect(app.getByLabel('Student name')).toHaveValue('Mateo Álvarez')
    await expect(app.getByLabel('County of registration')).toHaveValue('Broward')
  })

  test('leaving the section before the debounce fires still saves', async ({ app }) => {
    await app.getByLabel("Instructor's statement of the year").fill('A short but complete year.')
    // No wait: switch away immediately, inside the debounce window.
    await openSection(app, 'Reading list')
    await openSection(app, 'Student information')

    await expect(app.getByLabel("Instructor's statement of the year")).toHaveValue(
      'A short but complete year.',
    )

    await app.reload()
    await expect(app.getByLabel("Instructor's statement of the year")).toHaveValue(
      'A short but complete year.',
    )
  })

  test('a date field commits immediately', async ({ app }) => {
    await app.getByLabel('Evaluation date').fill('2026-07-15')
    await app.reload()
    await expect(app.getByLabel('Evaluation date')).toHaveValue('2026-07-15')
  })

  test('entries added in one session are there in the next', async ({ app }) => {
    await openSection(app, 'Language Arts')
    await app.getByLabel('What was covered').fill('Dictation practice')
    await app.getByLabel('Hours').fill('1')
    await app.getByRole('button', { name: 'Add to Language Arts' }).click()
    await expect(app.locator('tbody tr', { hasText: 'Dictation practice' })).toBeVisible()

    await app.reload()
    await openSection(app, 'Language Arts')
    await expect(app.locator('tbody tr', { hasText: 'Dictation practice' })).toBeVisible()
  })

  test('reset to sample data refreshes the open form, not just the tables', async ({ app }) => {
    await app.getByLabel('Student name').fill('Someone Else')
    await app.waitForTimeout(700)

    await app.getByRole('button', { name: 'Reset to sample data' }).click()

    await expect(app.getByLabel('Student name')).toHaveValue('Sofía Ramírez')
  })
})
