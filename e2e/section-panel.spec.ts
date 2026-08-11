import { expect, openSection, sectionCount, sectionLink, test } from './fixtures'

test.describe('Flow A — section panel', () => {
  test('opens on the student record with every section counted', async ({ app }) => {
    await expect(app.locator('.panel-title')).toHaveText('Student information')
    await expect(sectionCount(app, 'Student information')).toHaveText('✓')
    await expect(sectionCount(app, 'Curriculum used')).toHaveText('6')
    await expect(sectionCount(app, 'Support documents (IEP)')).toHaveText('1')
    await expect(sectionCount(app, 'Language Arts')).toHaveText('4')
    await expect(sectionCount(app, 'Mathematics')).toHaveText('3')
    await expect(sectionCount(app, 'Reading list')).toHaveText('6')
    await expect(sectionCount(app, 'Work samples')).toHaveText('4')
    await expect(app.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  test('marks the open section as current', async ({ app }) => {
    await openSection(app, 'Reading list')
    await expect(sectionLink(app, 'Reading list')).toHaveAttribute('aria-current', 'true')
    await expect(sectionLink(app, 'Curriculum used')).toHaveAttribute('aria-current', 'false')
  })

  test('curriculum: adds a row, counts it, then removes it', async ({ app }) => {
    await openSection(app, 'Curriculum used')

    await app.getByLabel('Curriculum or program').fill('Singapore Math 1A')
    await app.getByLabel('Publisher or author').fill('Marshall Cavendish')
    await app.getByLabel('Subject').selectOption('math')
    await app.getByLabel('How it was used').fill('Second half of the year')
    await app.getByRole('button', { name: 'Add curriculum' }).click()

    const row = app.locator('tbody tr', { hasText: 'Singapore Math 1A' })
    await expect(row).toBeVisible()
    await expect(row).toContainText('Mathematics')
    await expect(sectionCount(app, 'Curriculum used')).toHaveText('7')

    // The form clears but keeps the subject for the next entry.
    await expect(app.getByLabel('Curriculum or program')).toHaveValue('')
    await expect(app.getByLabel('Subject')).toHaveValue('math')

    await row.getByRole('button', { name: 'Remove' }).click()
    await expect(row).toHaveCount(0)
    await expect(sectionCount(app, 'Curriculum used')).toHaveText('6')
  })

  test('reading list: adds a book and shows it newest-first', async ({ app }) => {
    await openSection(app, 'Reading list')

    await app.getByLabel('Title').fill('The Little House')
    await app.getByLabel('Author').fill('Virginia Lee Burton')
    await app.getByLabel('Finished').fill('2026-06-01')
    await app.getByLabel('How it was read').fill('Read independently')
    await app.getByRole('button', { name: 'Add book' }).click()

    await expect(sectionCount(app, 'Reading list')).toHaveText('7')
    // Newest date in the editor list, so it sorts to the top.
    await expect(app.locator('tbody tr').first()).toContainText('The Little House')
  })

  test('subject log: adds an activity and keeps the date sticky', async ({ app }) => {
    await openSection(app, 'Mathematics')

    await app.getByLabel('Date').fill('2026-05-04')
    await app.getByLabel('What was covered').fill('Skip counting by threes')
    await app.getByLabel('Hours').fill('0.5')
    await app.getByLabel('Materials, method, outcome').fill('Number line on the floor.')
    await app.getByRole('button', { name: 'Add to Mathematics' }).click()

    await expect(sectionCount(app, 'Mathematics')).toHaveText('4')
    const row = app.locator('tbody tr', { hasText: 'Skip counting by threes' })
    await expect(row).toContainText('May 4, 2026')
    await expect(row).toContainText('Number line on the floor.')
    await expect(app.getByLabel('Date')).toHaveValue('2026-05-04')
    await expect(app.getByLabel('What was covered')).toHaveValue('')
  })

  test('an add button stays disabled until the title is filled', async ({ app }) => {
    await openSection(app, 'Reading list')
    const add = app.getByRole('button', { name: 'Add book' })
    await expect(add).toBeDisabled()
    await app.getByLabel('Title').fill('Corduroy')
    await expect(add).toBeEnabled()
  })

  test('an emptied section shows its prompt instead of a table', async ({ app }) => {
    await openSection(app, 'Curriculum used')
    const removals = app.getByRole('button', { name: 'Remove' })
    for (let left = await removals.count(); left > 0; left--) {
      await removals.first().click()
    }
    await expect(app.locator('table')).toHaveCount(0)
    await expect(app.locator('.empty-state')).toContainText('No curriculum listed yet')
    await expect(sectionCount(app, 'Curriculum used')).toHaveText('0')
    await expect(app.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow', '100')
  })

  test('reset to sample data restores the year', async ({ app }) => {
    await openSection(app, 'Reading list')
    await app.getByRole('button', { name: 'Remove' }).first().click()
    await expect(sectionCount(app, 'Reading list')).toHaveText('5')

    await app.getByRole('button', { name: 'Reset to sample data' }).click()
    await expect(sectionCount(app, 'Reading list')).toHaveText('6')
  })
})
