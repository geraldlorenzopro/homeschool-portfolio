import { expect, openSection, row, sectionCount, test } from './fixtures'

/** Deliberate attempts to break the new model. */
test.describe('Adversarial', () => {
  test('deleting every area leaves the dependent sections usable', async ({ app }) => {
    await openSection(app, 'Areas')
    const removals = app.getByRole('button', { name: 'Remove' })
    for (let left = await removals.count(); left > 0; left--) await removals.first().click()

    await expect(sectionCount(app, 'Areas')).toHaveText('0')
    await expect(sectionCount(app, 'Goals')).toHaveText('0')
    // The per-area sections disappear with their areas.
    await expect(app.locator('.section-link', { hasText: 'Language Arts' })).toHaveCount(0)

    await openSection(app, 'Goals')
    await expect(app.locator('.empty-state')).toContainText('Add an area first')

    // And the document still renders rather than crashing.
    await app.getByRole('link', { name: 'Finished portfolio' }).click()
    await expect(app.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
  })

  test('a goal deleted while its area is open does not strand the session form', async ({ app }) => {
    await openSection(app, 'Goals')
    await row(app, 'read CVC words with 80% accuracy').getByRole('button', { name: 'Remove' }).click()
    await openSection(app, 'Language Arts')
    await app.getByLabel('What was covered').fill('After the goal vanished')
    await app.getByRole('button', { name: 'Add entry' }).click()
    await expect(row(app, 'After the goal vanished')).toBeVisible()
  })

  test('empty and whitespace-only titles are refused', async ({ app }) => {
    await openSection(app, 'Goals')
    await expect(app.getByRole('button', { name: 'Add goal' })).toBeDisabled()
    await app.getByLabel('Goal', { exact: true }).fill('    ')
    await expect(app.getByRole('button', { name: 'Add goal' })).toBeDisabled()
  })

  test('text with angle brackets is rendered, never executed', async ({ app }) => {
    const errors: string[] = []
    app.on('pageerror', (e) => errors.push(e.message))
    await openSection(app, 'Goals')
    await app.getByLabel('Goal', { exact: true }).fill('<img src=x onerror=alert(1)> & "quoted"')
    await app.getByRole('button', { name: 'Add goal' }).click()

    const added = row(app, 'onerror=alert(1)')
    await expect(added).toBeVisible()
    await expect(added.locator('img')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('a very long goal does not break the table or the document', async ({ app }) => {
    const long = 'Sofía will '.repeat(60)
    await openSection(app, 'Goals')
    await app.getByLabel('Goal', { exact: true }).fill(long)
    await app.getByRole('button', { name: 'Add goal' }).click()
    await expect(row(app, 'Sofía will Sofía will')).toBeVisible()

    const overflow = await app.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('switches survive a reload', async ({ app }) => {
    await openSection(app, 'Student information')
    await app.getByLabel('Record hours').check()
    await app.getByLabel('Record dates').uncheck()
    await app.reload()
    await openSection(app, 'Student information')
    await expect(app.getByLabel('Record hours')).toBeChecked()
    await expect(app.getByLabel('Record dates')).not.toBeChecked()
  })

  test('the config switches are actually visible, not hidden by the design system', async ({ app }) => {
    await openSection(app, 'Student information')
    for (const label of ['Record dates', 'Record hours']) {
      const box = app.getByLabel(label)
      await expect(box).toBeVisible()
      const size = await box.boundingBox()
      expect(size!.width).toBeGreaterThan(8)
      expect(size!.height).toBeGreaterThan(8)
    }
  })

  test('reset recovers from a completely emptied portfolio', async ({ app }) => {
    await openSection(app, 'Areas')
    const removals = app.getByRole('button', { name: 'Remove' })
    for (let left = await removals.count(); left > 0; left--) await removals.first().click()
    await expect(sectionCount(app, 'Areas')).toHaveText('0')

    await app.getByRole('button', { name: 'Reset to sample data' }).click()
    await expect(sectionCount(app, 'Areas')).toHaveText('10')
    await expect(sectionCount(app, 'Goals')).toHaveText('5')
    await expect(sectionCount(app, 'Language Arts')).toHaveText('3')
  })
})
