import { expect, test } from './fixtures'
import { openSection, sectionCount } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The real year that was loaded into the annual record: a Time4Learning
 * Kindergarten report, 01/01/2026 – 07/27/2026, collapsed to one session per
 * area per day. 23 Language Arts days, 12 Mathematics days, and durations that
 * are mostly minutes — which is exactly the shape that broke the hour total.
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

/** 12 h 19 min of recorded work, once every day is rounded to two decimals. */
const TOTAL_HOURS = '12.28'

/**
 * Replaces the sample year with the imported one. Written through the same
 * store the app reads, then reloaded, so nothing here depends on how the rows
 * happened to be inserted.
 */
async function loadImportedYear(page: Page) {
  await page.evaluate(
    ({ ela, math }) => {
      const KEY = 'homeschool-portfolio-fl-v2'
      const data = JSON.parse(window.localStorage.getItem(KEY)!)
      const areaId = (key: string) =>
        data.areas.find((a: { key: string }) => a.key === key).id
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

      // No author: these came off a platform report, not off a cover.
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
      window.localStorage.setItem(KEY, JSON.stringify(data))
    },
    { ela: ELA, math: MATH },
  )
  await page.reload()
}

test.describe('The imported Time4Learning year', () => {
  test.beforeEach(async ({ app }) => {
    await loadImportedYear(app)
  })

  test('totals the hours without floating point noise', async ({ app }) => {
    // 0.43 + 0.2 + 0.35 + … sums to 12.280000000000001 in binary floating
    // point. This number is printed in a legal record; it must read 12.28.
    await openSection(app, 'Student information')
    await app.getByLabel('Record hours').check()

    await app.getByRole('link', { name: 'Finished portfolio' }).click()
    await expect(app.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
    await expect(app.getByText(`${TOTAL_HOURS} hours`)).toBeVisible()
    await expect(app.locator('body')).not.toContainText('12.280000')
  })

  test('files every session under its own area, not in one pile', async ({ app }) => {
    await expect(sectionCount(app, 'Language Arts')).toHaveText(String(ELA.length))
    await expect(sectionCount(app, 'Mathematics')).toHaveText(String(MATH.length))

    await openSection(app, 'Language Arts')
    await expect(app.locator('tbody tr')).toHaveCount(ELA.length)
    await expect(app.getByText('Syllable Explore')).toBeVisible()

    await openSection(app, 'Mathematics')
    await expect(app.locator('tbody tr')).toHaveCount(MATH.length)
    await expect(app.getByText('The number zero')).toBeVisible()
  })

  test('carries every session into the printed document', async ({ app }) => {
    await app.goto('/evaluation/document')
    await expect(app.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()

    for (const [, , title] of [...ELA, ...MATH]) {
      await expect(app.getByText(title, { exact: true })).toHaveCount(1)
    }
  })

  test('shows each curriculum against its own area, the column that once went missing', async ({
    app,
  }) => {
    await openSection(app, 'Curriculum used')
    const ela = app.locator('tbody tr', { hasText: 'Time4Learning — Language Arts, Kindergarten' })
    const math = app.locator('tbody tr', { hasText: 'Time4Learning — Math, Kindergarten' })
    await expect(ela).toContainText('Language Arts')
    await expect(math).toContainText('Mathematics')

    await app.goto('/evaluation/document')
    await expect(app.getByText('Time4Learning — Language Arts, Kindergarten')).toBeVisible()
    await expect(app.getByText('Time4Learning — Math, Kindergarten')).toBeVisible()
  })

  test('keeps apostrophes and dashes intact rather than escaping them', async ({ app }) => {
    await app.goto('/evaluation/document')
    await expect(app.getByText('Print Awareness — Pig’s ABCs: background, story and alphabet quiz')).toBeVisible()
    await expect(app.locator('body')).not.toContainText('&#39;')
    await expect(app.locator('body')).not.toContainText('&amp;')
  })

  test('shows the reading list even though no book has an author', async ({ app }) => {
    await openSection(app, 'Reading list')
    await expect(app.getByText('Pig’s ABCs')).toBeVisible()
    await expect(app.getByText('Sam and Dad: A Decodable Story')).toBeVisible()
  })

  test('runs the log newest first, from June back to January', async ({ app }) => {
    await app.goto('/evaluation/quick-log')
    const first = app.locator('.feed-row, tbody tr').first()
    await expect(first).toContainText('The short sound of e, and rhyming word pairs')
  })

  test('survives a reload with all 35 sessions', async ({ app }) => {
    await app.reload()
    await expect(sectionCount(app, 'Language Arts')).toHaveText(String(ELA.length))
    await expect(sectionCount(app, 'Mathematics')).toHaveText(String(MATH.length))
  })
})
