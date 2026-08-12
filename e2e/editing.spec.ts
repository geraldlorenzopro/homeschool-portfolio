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
      'Sessions',
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
    await expect(sectionCount(app, 'Sessions')).toHaveText('5')
    await expect(sectionCount(app, 'Evaluations')).toHaveText('1')
    await expect(sectionCount(app, 'Curriculum used')).toHaveText('4')
    await expect(sectionCount(app, 'Reading list')).toHaveText('4')
    await expect(sectionCount(app, 'Work samples')).toHaveText('3')
    await expect(sectionCount(app, 'Support documents (IEP)')).toHaveText('1')
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
