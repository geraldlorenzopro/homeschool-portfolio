import { editingRow, expect, openSection, row, sectionCount, test } from './fixtures'

test.describe('Areas', () => {
  test('ships the ten IEP areas and counts what hangs off each', async ({ app }) => {
    await openSection(app, 'Areas')
    await expect(sectionCount(app, 'Areas')).toHaveText('10')
    for (const label of [
      'Reading',
      'Writing',
      'Mathematics',
      'Speech & Language',
      'Fine Motor',
      'Gross Motor',
      'Social-Emotional',
      'Behavior',
      'Daily Living / Self-Help',
      'Attention & Study Skills',
    ]) {
      await expect(row(app, label).first()).toBeVisible()
    }
    // Reading carries two seeded goals.
    await expect(row(app, 'Reading').first().locator('td').nth(2)).toHaveText('2')
  })

  test('adds a custom area and marks it as one', async ({ app }) => {
    await openSection(app, 'Areas')
    await app.getByLabel('New area').fill('Occupational Therapy')
    await app.getByRole('button', { name: '+ Add area' }).click()

    const added = row(app, 'Occupational Therapy')
    await expect(added).toBeVisible()
    await expect(added.locator('.pill')).toHaveText('Custom')
    await expect(sectionCount(app, 'Areas')).toHaveText('11')
  })

  test('renames an area in place and the change reaches other sections', async ({ app }) => {
    await openSection(app, 'Areas')
    await row(app, 'Gross Motor').getByRole('button', { name: 'Edit' }).click()
    await app.getByLabel('Area name').fill('Movement & Coordination')
    await app.getByRole('button', { name: 'Save' }).click()

    await expect(row(app, 'Movement & Coordination')).toBeVisible()

    await openSection(app, 'Goals')
    await expect(app.getByLabel('Area', { exact: true })).toContainText('Movement & Coordination')
  })

  test('warns before deleting an area that has work under it', async ({ app }) => {
    await openSection(app, 'Areas')
    const messages: string[] = []
    app.on('dialog', (d) => messages.push(d.message()))

    await row(app, 'Reading').first().getByRole('button', { name: 'Remove' }).click()
    await expect.poll(() => messages.join(' ')).toContain('2 goal(s)')

    await expect(sectionCount(app, 'Areas')).toHaveText('9')
    // Its goals went with it.
    await expect(sectionCount(app, 'Goals')).toHaveText('3')
  })
})

test.describe('Goals', () => {
  test('groups goals by area with status and provenance', async ({ app }) => {
    await openSection(app, 'Goals')
    await expect(sectionCount(app, 'Goals')).toHaveText('5')

    await expect(app.getByRole('heading', { name: 'Reading' })).toBeVisible()
    await expect(app.getByRole('heading', { name: 'Fine Motor' })).toBeVisible()

    const met = row(app, 'read CVC words with 80% accuracy')
    await expect(met.locator('.pill[data-status="met"]')).toHaveText('Met')
    await expect(met.locator('.pill[data-source="iep"]')).toHaveText('From the IEP')

    await expect(
      row(app, 'take turns in a two-player game').locator('.pill[data-source="parent"]'),
    ).toHaveText('Parent-written')
  })

  test('adds a goal and counts the sessions recorded against it', async ({ app }) => {
    await openSection(app, 'Goals')
    await app.getByLabel('Goal', { exact: true }).fill('Will write first and last name unaided.')
    await app.getByLabel('Area', { exact: true }).selectOption({ label: 'Writing' })
    await app.getByLabel('Status').selectOption('in_progress')
    await app.getByRole('button', { name: 'Add goal' }).click()

    const added = row(app, 'first and last name unaided')
    await expect(added).toBeVisible()
    await expect(added.locator('td').nth(3)).toHaveText('0')
    await expect(sectionCount(app, 'Goals')).toHaveText('6')
    // The form clears but keeps area and status for the next one.
    await expect(app.getByLabel('Goal', { exact: true })).toHaveValue('')
  })

  test('edits a goal in place, including its status', async ({ app }) => {
    await openSection(app, 'Goals')
    await row(app, 'solve addition facts within 20').getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Status').selectOption('met')
    await app.getByRole('button', { name: 'Save' }).click()

    await expect(
      row(app, 'solve addition facts within 20').locator('.pill[data-status="met"]'),
    ).toHaveText('Met')
  })

  test('deleting a goal keeps its sessions but unlinks them', async ({ app }) => {
    await openSection(app, 'Goals')
    await row(app, 'read CVC words with 80% accuracy')
      .getByRole('button', { name: 'Remove' })
      .click()
    await expect(sectionCount(app, 'Goals')).toHaveText('4')

    // The two sessions that referenced it survive.
    await expect(sectionCount(app, 'Sessions')).toHaveText('5')
    await openSection(app, 'Sessions')
    await expect(row(app, 'Short vowel word families')).toBeVisible()
    await expect(row(app, 'Short vowel word families')).not.toContainText('Goal:')
  })
})

test.describe('Sessions', () => {
  test('records area, goal, method and outcome', async ({ app }) => {
    await openSection(app, 'Sessions')
    await expect(sectionCount(app, 'Sessions')).toHaveText('5')

    const seeded = row(app, 'Short vowel word families')
    await expect(seeded).toContainText('Goal: Given a decodable text')
    await expect(seeded).toContainText('Method: Letter tiles')
    await expect(seeded).toContainText('Outcome: Read 18 of 20 words')
    await expect(seeded.locator('.pill')).toHaveText('Independently')
  })

  test('adds a session against a goal', async ({ app }) => {
    await openSection(app, 'Sessions')
    await app.getByLabel('Area', { exact: true }).selectOption({ label: 'Mathematics' })
    await app
      .getByLabel('Goal worked on')
      .selectOption({ index: 1 })
    await app.getByLabel('What was covered').fill('Doubles facts')
    await app.getByLabel('Method used to work the goal').fill('Ten-frame cards, five minutes.')
    await app.getByLabel('Outcome — how the child responded').fill('Recalled doubles to 10.')
    await app.getByLabel('Level of support').selectOption('partial_support')
    await app.getByRole('button', { name: 'Add entry' }).click()

    const added = row(app, 'Doubles facts')
    await expect(added).toContainText('Method: Ten-frame cards')
    await expect(added).toContainText('Outcome: Recalled doubles to 10.')
    await expect(added.locator('.pill')).toHaveText('With partial support')
    await expect(sectionCount(app, 'Sessions')).toHaveText('6')

    await openSection(app, 'Goals')
    await expect(
      row(app, 'solve addition facts within 20').locator('td').nth(3),
    ).toHaveText('2')
  })

  test('edits a session in place', async ({ app }) => {
    await openSection(app, 'Sessions')
    await row(app, 'Addition within 20').getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Outcome', { exact: true }).fill('Now 20 of 20 with counters.')
    await app.getByRole('button', { name: 'Save' }).click()

    await expect(row(app, 'Addition within 20')).toContainText('Now 20 of 20 with counters.')
  })

  test('changing the area clears a goal that no longer belongs', async ({ app }) => {
    await openSection(app, 'Sessions')
    await app.getByLabel('Area', { exact: true }).selectOption({ label: 'Reading' })
    await app.getByLabel('Goal worked on').selectOption({ index: 2 })
    await app.getByLabel('Area', { exact: true }).selectOption({ label: 'Behavior' })
    await expect(app.getByLabel('Goal worked on')).toHaveValue('')
  })
})

test.describe('Date and hour switches', () => {
  test('hours are off by default and appear once switched on', async ({ app }) => {
    await openSection(app, 'Sessions')
    await expect(app.getByLabel('Hours', { exact: true })).toHaveCount(0)

    await openSection(app, 'Student information')
    await app.getByLabel('Record hours').check()

    await openSection(app, 'Sessions')
    await expect(app.getByLabel('Hours', { exact: true })).toBeVisible()
    await expect(app.getByRole('columnheader', { name: 'Hours' })).toBeVisible()
  })

  test('turning dates off removes the field and the column everywhere', async ({ app }) => {
    await openSection(app, 'Student information')
    await app.getByLabel('Record dates').uncheck()

    await openSection(app, 'Sessions')
    await expect(app.getByLabel('Date', { exact: true })).toHaveCount(0)
    await expect(app.getByRole('columnheader', { name: 'Date' })).toHaveCount(0)

    await openSection(app, 'Reading list')
    await expect(app.getByRole('columnheader', { name: 'Finished' })).toHaveCount(0)
  })
})

test.describe('Child profile', () => {
  test('carries the diagnosis and is kept out of the document by default', async ({ app }) => {
    await openSection(app, 'Child profile')
    await expect(app.getByLabel('Diagnosis', { exact: true })).toHaveValue(/dyslexia/)
    await expect(app.getByLabel('Strengths')).toHaveValue(/listening comprehension/)
  })

  test('"no formal diagnosis" hides the diagnosis fields', async ({ app }) => {
    await openSection(app, 'Child profile')
    await app.getByLabel('No formal diagnosis').check()
    await expect(app.getByLabel('Diagnosis', { exact: true })).toHaveCount(0)
    await expect(app.getByLabel('Diagnosed by')).toHaveCount(0)
    // Strengths and needs still apply without a diagnosis.
    await expect(app.getByLabel('Strengths')).toBeVisible()
  })

  test('the profile only reaches the document when explicitly included', async ({ app }) => {
    await openSection(app, 'Child profile')
    await app.getByLabel(/Include this profile/).uncheck()

    await app.getByRole('link', { name: 'Finished portfolio' }).click()
    await expect(app.locator('.doc')).not.toContainText('Child profile')

    await app.getByRole('link', { name: 'A · Section panel' }).click()
    await openSection(app, 'Child profile')
    await app.getByLabel(/Include this profile/).check()

    await app.getByRole('link', { name: 'Finished portfolio' }).click()
    await expect(app.locator('.doc').getByRole('heading', { name: 'Child profile' })).toBeVisible()
    await expect(app.locator('.doc')).toContainText('dyslexia')
  })
})

test.describe('Evaluations', () => {
  test('records an evaluation with its findings', async ({ app }) => {
    await openSection(app, 'Evaluations')
    await expect(sectionCount(app, 'Evaluations')).toHaveText('1')
    await expect(row(app, 'District psychoeducational evaluation')).toContainText(
      'phonological processing',
    )

    await app.getByLabel('Evaluation title').fill('Speech and language re-evaluation')
    await app.getByLabel('Type').selectOption('Speech & Language')
    await app.getByLabel('Performed by').fill('Coral Way Therapy')
    await app.getByLabel('Summary of results').fill('Articulation within normal limits.')
    await app.getByRole('button', { name: 'Add evaluation' }).click()

    await expect(row(app, 'Speech and language re-evaluation')).toContainText('Coral Way Therapy')
    await expect(sectionCount(app, 'Evaluations')).toHaveText('2')
  })
})
