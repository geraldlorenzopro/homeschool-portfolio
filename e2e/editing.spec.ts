import { editingRow, expect, openSection, row, sectionCount, test } from './fixtures'

test.describe('Editing in place', () => {
  test('cancelling an edit leaves the row untouched', async ({ app }) => {
    await openSection(app, 'Reading list')
    await row(app, 'Owl Moon').getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Title').fill('Something else entirely')
    await app.getByRole('button', { name: 'Cancel' }).click()

    await expect(row(app, 'Owl Moon')).toBeVisible()
    await expect(row(app, 'Something else entirely')).toHaveCount(0)
  })

  test('an edit survives a reload', async ({ app }) => {
    await openSection(app, 'Curriculum used')
    await row(app, 'Math-U-See Alpha').getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Publisher or author').fill('Demme Learning (2nd ed.)')
    await app.getByRole('button', { name: 'Save' }).click()
    await expect(row(app, 'Math-U-See Alpha')).toContainText('2nd ed.')

    await app.reload()
    await openSection(app, 'Curriculum used')
    await expect(row(app, 'Math-U-See Alpha')).toContainText('2nd ed.')
  })

  test('only one row edits at a time', async ({ app }) => {
    await openSection(app, 'Reading list')
    await row(app, 'Owl Moon').getByRole('button', { name: 'Edit' }).click()
    await expect(app.getByRole('button', { name: 'Save' })).toHaveCount(1)

    await row(app, 'Corduroy').count()
    await row(app, 'Blueberries for Sal').getByRole('button', { name: 'Edit' }).click()
    await expect(app.getByRole('button', { name: 'Save' })).toHaveCount(1)
  })

  test('every list offers an edit control', async ({ app }) => {
    for (const section of [
      'Areas',
      'Goals',
      'Language Arts',
      'Evaluations',
      'Curriculum used',
      'Reading list',
      'Work samples',
      'Support documents (IEP)',
    ]) {
      await openSection(app, section)
      await expect(
        app.getByRole('button', { name: 'Edit' }).first(),
        `${section} should offer inline editing`,
      ).toBeVisible()
    }
  })
})

test.describe('Reordering', () => {
  /** Native drag-and-drop, driven through the mouse so the events are real. */
  async function dragOnto(
    page: import('@playwright/test').Page,
    fromText: string,
    ontoText: string,
  ) {
    const from = row(page, fromText).first()
    const onto = row(page, ontoText).first()
    await from.hover()
    await page.mouse.down()
    await onto.hover()
    await onto.hover()
    await page.mouse.up()
  }

  test('a dragged row keeps its new position after a reload', async ({ app }) => {
    await openSection(app, 'Reading list')
    const titles = () => app.locator('tbody tr td:nth-child(2)').allTextContents()
    expect((await titles())[0]).toContain('Frog and Toad')

    await dragOnto(app, 'Owl Moon', 'Frog and Toad Together')
    await expect.poll(async () => (await titles())[0]).toContain('Owl Moon')

    await app.reload()
    await openSection(app, 'Reading list')
    await expect.poll(async () => (await titles())[0]).toContain('Owl Moon')
  })
})

test.describe('Counts and completeness', () => {
  test('the sidebar counts every section', async ({ app }) => {
    await expect(sectionCount(app, 'Student information')).toHaveText('✓')
    await expect(sectionCount(app, 'Child profile')).toHaveText('✓')
    await expect(sectionCount(app, 'Areas')).toHaveText('10')
    await expect(sectionCount(app, 'Goals')).toHaveText('5')
    await expect(sectionCount(app, 'Language Arts')).toHaveText('3')
    await expect(sectionCount(app, 'Mathematics')).toHaveText('1')
    await expect(sectionCount(app, 'Evaluations')).toHaveText('1')
    await expect(sectionCount(app, 'Curriculum used')).toHaveText('4')
    await expect(sectionCount(app, 'Reading list')).toHaveText('4')
    await expect(sectionCount(app, 'Work samples')).toHaveText('3')
    await expect(sectionCount(app, 'Support documents (IEP)')).toHaveText('1')
    // Areas count as one item, so a full year still reads 100%.
    await expect(app.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  test('reset to sample data restores the year', async ({ app }) => {
    await openSection(app, 'Goals')
    await app.getByRole('button', { name: 'Remove' }).first().click()
    await expect(sectionCount(app, 'Goals')).toHaveText('4')

    await app.getByRole('button', { name: 'Reset to sample data' }).click()
    await expect(sectionCount(app, 'Goals')).toHaveText('5')
  })
})

test.describe('Adding rows', () => {
  /**
   * Every add button, end to end. The curriculum case shipped broken because
   * nothing exercised it — the row silently failed to save.
   */
  test('curriculum adds, persists and keeps its area', async ({ app }) => {
    await openSection(app, 'Curriculum used')
    await app.getByLabel('Curriculum or program').fill('Singapore Math 1A')
    await app.getByLabel('Publisher or author').fill('Marshall Cavendish')
    await app.getByLabel('Area', { exact: true }).selectOption({ label: 'Mathematics' })
    await app.getByLabel('How it was used').fill('Second half of the year')
    await app.getByRole('button', { name: 'Add curriculum' }).click()

    const added = row(app, 'Singapore Math 1A')
    await expect(added).toBeVisible()
    await expect(added).toContainText('Marshall Cavendish')
    await expect(added).toContainText('Mathematics')
    await expect(sectionCount(app, 'Curriculum used')).toHaveText('5')

    await app.reload()
    await openSection(app, 'Curriculum used')
    await expect(row(app, 'Singapore Math 1A')).toContainText('Mathematics')
  })

  test('every add button saves and survives a reload', async ({ app }) => {
    const added: [string, string][] = []

    await openSection(app, 'Areas')
    await app.getByLabel('New area').fill('Music')
    await app.getByRole('button', { name: '+ Add area' }).click()
    added.push(['Areas', 'Music'])

    await openSection(app, 'Goals')
    await app.getByLabel('Goal', { exact: true }).fill('Will keep a steady beat.')
    await app.getByRole('button', { name: 'Add goal' }).click()
    added.push(['Goals', 'steady beat'])

    await openSection(app, 'Language Arts')
    await app.getByLabel('What was covered').fill('Blending practice')
    await app.getByRole('button', { name: 'Add entry' }).click()
    added.push(['Language Arts', 'Blending practice'])

    await openSection(app, 'Evaluations')
    await app.getByLabel('Evaluation title').fill('Annual OT review')
    await app.getByRole('button', { name: 'Add evaluation' }).click()
    added.push(['Evaluations', 'Annual OT review'])

    await openSection(app, 'Reading list')
    await app.getByLabel('Title').fill('Make Way for Ducklings')
    await app.getByRole('button', { name: 'Add book' }).click()
    added.push(['Reading list', 'Make Way for Ducklings'])

    await openSection(app, 'Work samples')
    await app.getByLabel('What the work is').fill('Rhythm chart')
    await app.getByRole('button', { name: 'Add sample' }).click()
    added.push(['Work samples', 'Rhythm chart'])

    await openSection(app, 'Support documents (IEP)')
    await app.getByLabel('Document title').fill('Service log')
    await app.getByRole('button', { name: 'Attach document' }).click()
    added.push(['Support documents (IEP)', 'Service log'])

    await app.reload()
    for (const [section, text] of added) {
      await openSection(app, section)
      await expect(app.getByText(text, { exact: false }).first(), `${section} lost "${text}"`).toBeVisible()
    }
  })
})
