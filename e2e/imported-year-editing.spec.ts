import { editingRow, expect, openSection, row, sectionCount, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The same imported year as annual-record-import.spec.ts — the Time4Learning
 * Kindergarten report, one session per area per day. Copied rather than shared
 * so the two files can never drift apart silently; these tests ask a different
 * question of it: rows that arrived by SQL have to behave like rows that were
 * typed.
 */
const ELA: [string, number, string][] = [
  ['2026-01-08', 26, 'Print Awareness — Pig’s ABCs: background, story and alphabet quiz'],
  ['2026-01-14', 12, 'Sounds, letters and words — identifying lowercase letters'],
  ['2026-01-18', 21, 'Uppercase letters, and matching lowercase to uppercase'],
  ['2026-01-19', 34, 'Matching uppercase to lowercase; counting the words in a sentence'],
  ['2026-01-22', 5, 'Syllable Explore'],
  ['2026-01-26', 24, 'Active listening and sound — rhymes, patterns and the five senses'],
  ['2026-01-28', 26, 'Background for Mary Had a Little Lamb'],
  ['2026-01-29', 14, 'Mary Had a Little Lamb; alliteration with the sound of s'],
  ['2026-02-02', 30, 'Recalling details from Mary Had a Little Lamb; identifying colors'],
  ['2026-02-04', 12, 'The sound of m — exploration and alliteration'],
  ['2026-02-05', 39, 'Fantasy and reality; over and under; the sound of d'],
  ['2026-02-13', 18, 'Phonics s and the decodable story I am; Hey Diddle Diddle'],
  ['2026-02-18', 38, 'The sounds of d and short a — alliteration, phonics and rhyming'],
  ['2026-02-19', 8, 'Background for Pease Pudding'],
  ['2026-02-23', 27, 'Pease Pudding, and sentence completion'],
  ['2026-03-02', 8, 'Understanding common opposite words'],
  ['2026-03-03', 38, 'The sound of p; background for The Little Red Hen'],
  ['2026-03-18', 20, 'Phonics: short a; the decodable story Sam and Dad'],
  ['2026-03-23', 14, 'Phonics review l and n; background for Busy Baby Animals: Tiger'],
  ['2026-03-24', 4, 'Busy Baby Animals: Tiger — story and supporting ideas'],
  ['2026-04-20', 15, 'Prepositions: in and out; the short sound of o'],
  ['2026-05-04', 38, 'It’s Raining, It’s Pouring — recalling details and verb tense'],
  ['2026-06-02', 16, 'The short sound of e, and rhyming word pairs'],
]

const MATH: [string, number, string][] = [
  ['2026-01-14', 18, 'Describing the position of objects — supported and independent practice'],
  ['2026-01-18', 23, 'Describing flat shapes; quiz on the position of objects'],
  ['2026-01-22', 35, 'Shapes, shapes, everywhere — flats and solids'],
  ['2026-01-26', 4, 'Quiz: flats and solids'],
  ['2026-01-29', 32, 'Comparing flats and solids; geoboard shapes; solid shapes quiz'],
  ['2026-02-02', 6, 'Quiz: comparing flats and solids'],
  ['2026-02-13', 33, 'Making models and composing shapes'],
  ['2026-03-02', 32, 'Counting the numbers 1–5'],
  ['2026-03-03', 27, 'Counting 1–5 — supported and independent practice; matching numbers'],
  ['2026-03-18', 8, 'The number zero'],
  ['2026-03-24', 24, 'Counting the numbers 0–10'],
  ['2026-05-04', 10, 'Comparing two numbers (numerals)'],
]

const STORE_KEY = 'homeschool-portfolio-fl-v2'

async function loadImportedYear(page: Page) {
  await page.evaluate(
    ({ ela, math, key }) => {
      const data = JSON.parse(window.localStorage.getItem(key)!)
      const areaId = (areaKey: string) =>
        data.areas.find((a: { key: string }) => a.key === areaKey).id
      const hours = (mins: number) => (Math.round((mins / 60) * 100) / 100).toFixed(2)

      let sort = 0
      const session = (area: string, [date, mins, title]: [string, number, string]) => ({
        id: `t4l-${area}-${date}`,
        area_id: areaId(area),
        goal_id: null,
        title,
        method: 'Time4Learning — online Kindergarten curriculum',
        outcome: 'Recorded from the platform report.',
        outcome_level: null,
        date,
        hours: hours(mins),
        sort: (sort += 1),
      })

      data.entries = [
        ...ela.map((r) => session('ela', r as [string, number, string])),
        ...math.map((r) => session('math', r as [string, number, string])),
      ].sort((a, b) => (a.date < b.date ? -1 : 1))

      data.curriculums = [
        {
          id: 't4l-ela',
          title: 'Time4Learning — Language Arts, Kindergarten',
          publisher: 'Time4Learning',
          area_id: areaId('ela'),
          usage: 'Overall average 98%.',
          sort: 1,
        },
        {
          id: 't4l-math',
          title: 'Time4Learning — Math, Kindergarten',
          publisher: 'Time4Learning',
          area_id: areaId('math'),
          usage: 'Overall average 88%.',
          sort: 2,
        },
      ]

      data.books = [
        { title: 'Pig’s ABCs', finished_on: '2026-01-08' },
        { title: 'Mary Had a Little Lamb', finished_on: '2026-01-29' },
        { title: 'Sam and Dad: A Decodable Story', finished_on: '2026-03-18' },
      ].map((b, i) => ({
        id: `t4l-book-${i}`,
        author: '',
        how_read: 'Read online with Time4Learning.',
        sort: i + 1,
        ...b,
      }))

      data.workSamples = []
      window.localStorage.setItem(key, JSON.stringify(data))
    },
    { ela: ELA, math: MATH, key: STORE_KEY },
  )
  await page.reload()
}

/** The date an imported row holds at rest — a display check cannot see a shift here. */
async function storedDate(page: Page, titlePrefix: string) {
  return page.evaluate(
    ({ key, prefix }) => {
      const data = JSON.parse(window.localStorage.getItem(key)!)
      const entry = data.entries.find((e: { title: string }) => e.title.startsWith(prefix))
      return entry?.date ?? null
    },
    { key: STORE_KEY, prefix: titlePrefix },
  )
}

test.describe('Editing the imported year', () => {
  test.beforeEach(async ({ app }) => {
    await loadImportedYear(app)
    // The import carried hours, but the portfolio keeps them switched off by
    // default — and with the switch off there is no hours field to edit.
    await openSection(app, 'Student information')
    await app.getByLabel('Record hours').check()
    await expect(app.getByLabel('Record hours')).toBeChecked()
  })

  test('a January session takes a new title and keeps it through a reload', async ({ app }) => {
    await openSection(app, 'Language Arts')
    await row(app, 'Syllable Explore').getByRole('button', { name: 'Edit' }).click()
    await editingRow(app)
      .getByLabel('What was covered')
      .fill('Syllables — clapping out two-syllable words')
    await app.getByRole('button', { name: 'Save' }).click()

    await expect(row(app, 'clapping out two-syllable words')).toBeVisible()
    await expect(row(app, 'Syllable Explore')).toHaveCount(0)

    await app.reload()
    await openSection(app, 'Language Arts')
    await expect(row(app, 'clapping out two-syllable words')).toBeVisible()
  })

  test('a January session takes a new outcome and new hours', async ({ app }) => {
    await openSection(app, 'Language Arts')
    const session = row(app, 'Print Awareness')
    await expect(session.locator('td.num')).toHaveText('0.43')

    await session.getByRole('button', { name: 'Edit' }).click()
    await editingRow(app)
      .getByLabel('Outcome', { exact: true })
      .fill('Named all 26 letters unprompted; missed two lowercase.')
    await editingRow(app).getByLabel('Hours', { exact: true }).fill('1.25')
    await app.getByRole('button', { name: 'Save' }).click()

    await expect(session).toContainText('Named all 26 letters unprompted')
    await expect(session.locator('td.num')).toHaveText('1.25')

    await app.reload()
    await openSection(app, 'Language Arts')
    await expect(row(app, 'Print Awareness')).toContainText('Named all 26 letters unprompted')
    await expect(row(app, 'Print Awareness').locator('td.num')).toHaveText('1.25')
  })

  test('a February session gives up its hours without printing NaN', async ({ app }) => {
    await openSection(app, 'Language Arts')
    const session = row(app, 'The sound of m')
    await expect(session.locator('td.num')).toHaveText('0.20')

    await session.getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Hours', { exact: true }).fill('')
    await app.getByRole('button', { name: 'Save' }).click()

    await expect(session.locator('td.num')).toBeEmpty()
    await expect(app.locator('table')).not.toContainText('NaN')

    await app.reload()
    await openSection(app, 'Language Arts')
    await expect(row(app, 'The sound of m').locator('td.num')).toBeEmpty()

    // 12.28 with those 0.20 h taken out — the figure the evaluator reads.
    await app.goto('/evaluation/document')
    await expect(app.getByText('12.08 hours')).toBeVisible()
    await expect(app.locator('body')).not.toContainText('NaN')
  })

  test('a February session moves to another February day, and lands on that day', async ({
    app,
  }) => {
    await openSection(app, 'Language Arts')
    const session = row(app, 'Background for Pease Pudding')
    await expect(session).toContainText('Feb 19, 2026')

    await session.getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Date', { exact: true }).fill('2026-02-24')
    await app.getByRole('button', { name: 'Save' }).click()
    await expect(session).toContainText('Feb 24, 2026')

    await app.reload()
    await openSection(app, 'Language Arts')
    const moved = row(app, 'Background for Pease Pudding')
    await expect(moved).toContainText('Feb 24, 2026')
    await expect(moved).not.toContainText('Feb 23, 2026')
    await expect(moved).not.toContainText('Feb 25, 2026')
    expect(await storedDate(app, 'Background for Pease Pudding')).toBe('2026-02-24')
  })

  test('a March session can be deleted, and the sidebar drops exactly one', async ({ app }) => {
    await expect(sectionCount(app, 'Language Arts')).toHaveText(String(ELA.length))
    await openSection(app, 'Language Arts')
    await row(app, 'Understanding common opposite words')
      .getByRole('button', { name: 'Remove' })
      .click()

    await expect(row(app, 'Understanding common opposite words')).toHaveCount(0)
    await expect(app.locator('tbody tr')).toHaveCount(ELA.length - 1)
    await expect(sectionCount(app, 'Language Arts')).toHaveText(String(ELA.length - 1))
    await expect(sectionCount(app, 'Mathematics')).toHaveText(String(MATH.length))

    await app.reload()
    await expect(sectionCount(app, 'Language Arts')).toHaveText(String(ELA.length - 1))
  })

  test('a brand new March session sits alongside the imported Mathematics ones', async ({
    app,
  }) => {
    await openSection(app, 'Mathematics')
    await app.getByLabel('What was covered').fill('Counting on from a given number, to 20')
    await app.getByLabel('Date', { exact: true }).fill('2026-03-26')
    await app.getByLabel('Hours', { exact: true }).fill('0.75')
    await app.getByRole('button', { name: 'Add entry' }).click()

    const added = row(app, 'Counting on from a given number')
    await expect(added).toContainText('Mar 26, 2026')
    await expect(added.locator('td.num')).toHaveText('0.75')
    await expect(app.locator('tbody tr')).toHaveCount(MATH.length + 1)
    await expect(sectionCount(app, 'Mathematics')).toHaveText(String(MATH.length + 1))

    await app.reload()
    await openSection(app, 'Mathematics')
    await expect(row(app, 'Counting on from a given number')).toContainText('Mar 26, 2026')
    await expect(row(app, 'The number zero')).toBeVisible()
    await expect(row(app, 'Counting the numbers 1–5')).toBeVisible()
  })
})
