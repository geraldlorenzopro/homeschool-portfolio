import { PNG_1PX, editingRow, expect, openSection, row, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The same imported Time4Learning year as e2e/annual-record-import.spec.ts,
 * seeded again here so this file stands on its own. What it proves is the other
 * half of the question: that the imported months reach the finished document
 * the evaluator reads, with their own dates and their own hours.
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

const TOTAL_HOURS = '12.28'

/** The months the user asked about. April onwards is outside the question. */
const isQ1 = ([date]: [string, number, string]) => date < '2026-04-01'
const ELA_Q1 = ELA.filter(isQ1)
const MATH_Q1 = MATH.filter(isQ1)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * "2026-01-08" → "Jan 8, 2026", spelled out here rather than borrowed from the
 * app: a date that shifts by a day is exactly the failure being looked for, so
 * the expected string must not come from the code under test.
 */
function printedDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

/** Minutes as the import stored them: two decimals, e.g. 26 min → "0.43". */
const printedHours = (mins: number) => (Math.round((mins / 60) * 100) / 100).toFixed(2)

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

async function goToDocument(page: Page) {
  await page.getByRole('link', { name: 'Finished portfolio' }).click()
  await expect(page.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
}

/** The block of the document that belongs to one area, headed by its name. */
function areaBlock(page: Page, label: string) {
  return page.locator('.doc > div', {
    has: page.locator('.doc-rule-head h3', { hasText: new RegExp(`^${label}$`) }),
  })
}

/** The printed row for one session, found by its exact title. */
function docRow(page: Page, title: string) {
  return page.locator('.doc tr', { has: page.getByText(title, { exact: true }) })
}

async function setSwitch(page: Page, label: string, on: boolean) {
  await page.getByRole('link', { name: 'A · Section panel' }).click()
  await openSection(page, 'Student information')
  const box = page.getByLabel(label)
  if (on) await box.check()
  else await box.uncheck()
}

test.describe('The imported months in the finished document', () => {
  test.beforeEach(async ({ app }) => {
    await loadImportedYear(app)
  })

  test('prints every January, February and March session under its own area', async ({ app }) => {
    await goToDocument(app)

    const ela = areaBlock(app, 'Language Arts')
    const math = areaBlock(app, 'Mathematics')
    await expect(ela).toHaveCount(1)
    await expect(math).toHaveCount(1)

    for (const [, , title] of ELA_Q1) {
      await expect(app.getByText(title, { exact: true })).toHaveCount(1)
      await expect(ela.getByText(title, { exact: true })).toHaveCount(1)
      await expect(math.getByText(title, { exact: true })).toHaveCount(0)
    }

    for (const [, , title] of MATH_Q1) {
      await expect(app.getByText(title, { exact: true })).toHaveCount(1)
      await expect(math.getByText(title, { exact: true })).toHaveCount(1)
      await expect(ela.getByText(title, { exact: true })).toHaveCount(0)
    }
  })

  test('gives each session the date it was seeded with', async ({ app }) => {
    await goToDocument(app)

    // One month named outright, so a shift of a single day is visible in the
    // failure message rather than hidden inside a loop.
    await expect(docRow(app, ELA_Q1[0][2])).toContainText('Jan 8, 2026')
    await expect(docRow(app, 'Fantasy and reality; over and under; the sound of d')).toContainText(
      'Feb 5, 2026',
    )
    await expect(docRow(app, 'Counting the numbers 0–10')).toContainText('Mar 24, 2026')

    for (const [date, , title] of [...ELA_Q1, ...MATH_Q1]) {
      await expect(docRow(app, title), `${title} should be dated ${date}`).toContainText(
        printedDate(date),
      )
    }
  })

  test('prints the total hours as 12.28, not as binary noise', async ({ app }) => {
    await setSwitch(app, 'Record hours', true)
    await goToDocument(app)

    await expect(app.locator('.doc')).toContainText(`${TOTAL_HOURS} hours`)
    await expect(app.locator('.doc')).not.toContainText('12.280000')
  })

  test('prints the hours recorded against each session', async ({ app }) => {
    // Both tables now render the same row, so a session filed under no goal
    // prints its hours like any other. It used to print none of them.
    await setSwitch(app, 'Record hours', true)
    await goToDocument(app)

    await expect(docRow(app, ELA_Q1[0][2])).toContainText(printedHours(26))
    await expect(docRow(app, 'Counting the numbers 1–5')).toContainText(printedHours(32))
  })

  test('carries a title edited in the panel into the document', async ({ app }) => {
    await openSection(app, 'Language Arts')
    await row(app, 'Syllable Explore').getByRole('button', { name: 'Edit' }).click()
    await editingRow(app)
      .getByLabel('What was covered')
      .fill('Clapping syllables in the child’s own name')
    await app.getByRole('button', { name: 'Save' }).click()

    await goToDocument(app)
    await expect(
      app.getByText('Clapping syllables in the child’s own name', { exact: true }),
    ).toHaveCount(1)
    await expect(app.locator('.doc')).not.toContainText('Syllable Explore')
  })

  test('switching dates off drops the dates but keeps the sessions', async ({ app }) => {
    await goToDocument(app)
    await expect(app.locator('.doc')).toContainText('Jan 8, 2026')

    await setSwitch(app, 'Record dates', false)
    await goToDocument(app)

    for (const date of ['Jan 8, 2026', 'Feb 5, 2026', 'Mar 24, 2026']) {
      await expect(app.locator('.doc')).not.toContainText(date)
    }
    for (const [, , title] of [...ELA_Q1, ...MATH_Q1]) {
      await expect(app.getByText(title, { exact: true })).toHaveCount(1)
    }
  })
  test('prints the method used, on sessions that hang off no goal', async ({ app }) => {
    // These sessions have goal_id = null, which used to send them down a
    // second, poorer branch of the document that printed the title and the
    // outcome and dropped everything else.
    await goToDocument(app)

    await expect(docRow(app, 'Syllable Explore')).toContainText(
      'Method: Time4Learning — online Kindergarten curriculum',
    )
    await expect(docRow(app, 'The number zero')).toContainText(
      'Method: Time4Learning — online Kindergarten curriculum',
    )
  })

  test('prints a photo attached to a session that hangs off no goal', async ({ app }) => {
    await openSection(app, 'Language Arts')
    const session = row(app, 'Syllable Explore')
    await session.getByRole('button', { name: '+ Add photo' }).click()
    await session.locator('input[type="file"]').setInputFiles({
      name: 'sylabbles.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    })
    await expect(session.locator('.plate img')).toHaveCount(1)

    await goToDocument(app)
    await expect(docRow(app, 'Syllable Explore').locator('img')).toHaveCount(1)
  })
})
