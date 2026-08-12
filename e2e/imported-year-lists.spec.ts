import { editingRow, expect, openSection, row, sectionCount, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The two lists that arrived with the Time4Learning import: the curriculum rows
 * and the reading list. annual-record-import.spec.ts proves they are displayed;
 * what is unproven is whether a row written by SQL behaves like one typed into
 * the form — editable, removable, reorderable, and still right after a reload.
 */

const T4L_ELA = 'Time4Learning — Language Arts, Kindergarten'
const T4L_MATH = 'Time4Learning — Math, Kindergarten'

/** No author on any of them: these came off a platform report, not off a cover. */
const BOOKS = [
  { title: 'Pig’s ABCs', finished_on: '2026-01-08' },
  { title: 'Mary Had a Little Lamb', finished_on: '2026-01-29' },
  { title: 'Sam and Dad: A Decodable Story', finished_on: '2026-03-18' },
]

/**
 * Replaces the sample lists with the imported ones. Written through the same
 * store the app reads, then reloaded, so nothing here depends on how the rows
 * happened to be inserted. The sessions are left alone — they are covered in
 * annual-record-import.spec.ts and none of these tests reads them.
 */
async function loadImportedLists(page: Page) {
  await page.evaluate(
    ({ ela, math, books }) => {
      const KEY = 'homeschool-portfolio-fl-v2'
      const data = JSON.parse(window.localStorage.getItem(KEY)!)
      const areaId = (key: string) => data.areas.find((a: { key: string }) => a.key === key).id

      data.curriculums = [
        {
          id: 't4l-ela',
          title: ela,
          publisher: 'Time4Learning',
          area_id: areaId('ela'),
          usage: 'Overall average 98%.',
          sort: 1,
        },
        {
          id: 't4l-math',
          title: math,
          publisher: 'Time4Learning',
          area_id: areaId('math'),
          usage: 'Overall average 88%.',
          sort: 2,
        },
      ]

      data.books = books.map((b, i) => ({
        id: `t4l-book-${i}`,
        author: '',
        how_read: 'Read online with Time4Learning.',
        sort: i + 1,
        ...b,
      }))

      window.localStorage.setItem(KEY, JSON.stringify(data))
    },
    { ela: T4L_ELA, math: T4L_MATH, books: BOOKS },
  )
  await page.reload()
}

/** The area column of a curriculum row: handle, curriculum, publisher, area. */
function areaCell(page: Page, title: string) {
  return row(page, title).locator('td:nth-child(4)')
}

/** The author column of a book row: handle, title, author, how read, finished. */
function authorCell(page: Page, title: string) {
  return row(page, title).locator('td:nth-child(3)')
}

/** Native drag-and-drop, driven through the mouse so the events are real. */
async function dragOnto(page: Page, fromText: string, ontoText: string) {
  const from = row(page, fromText).first()
  const onto = row(page, ontoText).first()
  await from.hover()
  await page.mouse.down()
  await onto.hover()
  await onto.hover()
  await page.mouse.up()
}

/** First column of visible text in the open list, top row first. */
function firstRowText(page: Page) {
  return page.locator('tbody tr td:nth-child(2)').allTextContents()
}

test.describe('The imported curriculum rows', () => {
  test.beforeEach(async ({ app }) => {
    await loadImportedLists(app)
  })

  test('take a new title and new usage text, and keep them through a reload', async ({ app }) => {
    const title = 'Time4Learning Language Arts (Kindergarten)'
    const usage = 'Overall average 98%. Finished through the short vowels unit.'

    await openSection(app, 'Curriculum used')
    await row(app, T4L_ELA).getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Curriculum or program').fill(title)
    await editingRow(app).getByLabel('How it was used').fill(usage)
    await app.getByRole('button', { name: 'Save' }).click()

    await expect(row(app, title)).toContainText(usage)
    await expect(row(app, T4L_ELA)).toHaveCount(0)

    await app.reload()
    await openSection(app, 'Curriculum used')
    await expect(row(app, title)).toContainText(usage)

    // The edit is worth nothing if the evaluator still reads the old wording.
    await app.goto('/evaluation/document')
    await expect(app.getByText(title)).toBeVisible()
    await expect(app.getByText(usage)).toBeVisible()
    await expect(app.locator('body')).not.toContainText(T4L_ELA)
  })

  test('move to another area and back, and the area column follows', async ({ app }) => {
    await openSection(app, 'Curriculum used')
    await expect(areaCell(app, T4L_ELA)).toHaveText('Language Arts')
    await expect(areaCell(app, T4L_MATH)).toHaveText('Mathematics')

    await row(app, T4L_ELA).getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Area', { exact: true }).selectOption({ label: 'Mathematics' })
    await app.getByRole('button', { name: 'Save' }).click()
    await expect(areaCell(app, T4L_ELA)).toHaveText('Mathematics')

    await app.reload()
    await openSection(app, 'Curriculum used')
    await expect(areaCell(app, T4L_ELA)).toHaveText('Mathematics')

    await row(app, T4L_ELA).getByRole('button', { name: 'Edit' }).click()
    await editingRow(app)
      .getByLabel('Area', { exact: true })
      .selectOption({ label: 'Language Arts' })
    await app.getByRole('button', { name: 'Save' }).click()
    await expect(areaCell(app, T4L_ELA)).toHaveText('Language Arts')

    await app.reload()
    await openSection(app, 'Curriculum used')
    await expect(areaCell(app, T4L_ELA)).toHaveText('Language Arts')
  })

  test('keep a dragged position through a reload', async ({ app }) => {
    await openSection(app, 'Curriculum used')
    expect((await firstRowText(app))[0]).toContain('Language Arts, Kindergarten')

    await dragOnto(app, T4L_MATH, T4L_ELA)
    await expect.poll(async () => (await firstRowText(app))[0]).toContain('Math, Kindergarten')

    await app.reload()
    await openSection(app, 'Curriculum used')
    await expect.poll(async () => (await firstRowText(app))[0]).toContain('Math, Kindergarten')
  })
})

test.describe('The imported reading list', () => {
  test.beforeEach(async ({ app }) => {
    await loadImportedLists(app)
  })

  test('takes an author on a title that had none, and keeps it through a reload', async ({
    app,
  }) => {
    await openSection(app, 'Reading list')
    await expect(authorCell(app, 'Mary Had a Little Lamb')).toHaveText('')

    await row(app, 'Mary Had a Little Lamb').getByRole('button', { name: 'Edit' }).click()
    await editingRow(app).getByLabel('Author').fill('Sarah Josepha Hale')
    await app.getByRole('button', { name: 'Save' }).click()
    await expect(authorCell(app, 'Mary Had a Little Lamb')).toHaveText('Sarah Josepha Hale')

    await app.reload()
    await openSection(app, 'Reading list')
    await expect(authorCell(app, 'Mary Had a Little Lamb')).toHaveText('Sarah Josepha Hale')

    await app.goto('/evaluation/document')
    await expect(app.getByText('Sarah Josepha Hale')).toBeVisible()
  })

  test('drops a title, and the count and the document drop it too', async ({ app }) => {
    await openSection(app, 'Reading list')
    await expect(sectionCount(app, 'Reading list')).toHaveText(String(BOOKS.length))

    await row(app, 'Pig’s ABCs').getByRole('button', { name: 'Remove' }).click()
    await expect(row(app, 'Pig’s ABCs')).toHaveCount(0)
    await expect(sectionCount(app, 'Reading list')).toHaveText(String(BOOKS.length - 1))

    await app.reload()
    await openSection(app, 'Reading list')
    await expect(sectionCount(app, 'Reading list')).toHaveText(String(BOOKS.length - 1))
    await expect(row(app, 'Pig’s ABCs')).toHaveCount(0)

    await app.goto('/evaluation/document')
    await expect(app.getByText('Sam and Dad: A Decodable Story')).toBeVisible()
    await expect(app.locator('body')).not.toContainText('Pig’s ABCs')
    await expect(app.getByText(`${BOOKS.length - 1} titles read`)).toBeVisible()
  })

  test('takes a new title alongside the imported ones', async ({ app }) => {
    await openSection(app, 'Reading list')
    await app.getByLabel('Title').fill('Are You My Mother?')
    await app.getByLabel('Author').fill('P. D. Eastman')
    await app.getByRole('button', { name: 'Add book' }).click()

    await expect(authorCell(app, 'Are You My Mother?')).toHaveText('P. D. Eastman')
    await expect(sectionCount(app, 'Reading list')).toHaveText(String(BOOKS.length + 1))

    await app.reload()
    await openSection(app, 'Reading list')
    await expect(row(app, 'Are You My Mother?')).toHaveCount(1)
    for (const book of BOOKS) await expect(row(app, book.title)).toHaveCount(1)
  })

  test('keeps a dragged position through a reload', async ({ app }) => {
    await openSection(app, 'Reading list')
    expect((await firstRowText(app))[0]).toContain('Pig’s ABCs')

    await dragOnto(app, 'Sam and Dad: A Decodable Story', 'Pig’s ABCs')
    await expect.poll(async () => (await firstRowText(app))[0]).toContain('Sam and Dad')

    await app.reload()
    await openSection(app, 'Reading list')
    await expect.poll(async () => (await firstRowText(app))[0]).toContain('Sam and Dad')
  })
})
