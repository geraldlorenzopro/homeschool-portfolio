import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * What the district gets to see.
 *
 * The Child's information sheet holds a home address, a date of birth and
 * whatever the parent wrote about how her child learns — which in a real
 * portfolio was a diagnosis. s. 1002.41 asks for none of it: it wants a log,
 * the titles of materials, samples of work and evidence of progress. The
 * district already has the address and the birth date from the Letter of
 * Intent, so putting them on a folder that gets handed around adds exposure
 * and no evidence.
 *
 * They stay in the app. They do not go on paper.
 */
/**
 * Everything a reader would see on the sheet.
 *
 * innerText stops at the edge of a form control, and nearly every value on
 * these sheets lives inside one — so a check written against innerText alone
 * passes whether or not the address is printed. This adds the value of every
 * control that is still visible.
 */
async function whatPrints(page: Page): Promise<string> {
  return page.locator('.sheet').evaluate((sheet) => {
    // Not getComputedStyle: for an element inside a display:none ancestor it
    // reports the element's own display, so every hidden field looked visible.
    const visible = (el: Element) => el.getClientRects().length > 0
    const values = [...sheet.querySelectorAll('input, textarea, select')]
      .filter(visible)
      .map((el) => (el as HTMLInputElement).value)
    return [(sheet as HTMLElement).innerText, ...values].join('\n')
  })
}

async function openChildInfo(page: Page) {
  await page.goto('/monthly')
  await page.locator('.section-link', { hasText: 'Child’s information' }).click()
  await expect(page.getByLabel('Child’s full name')).toBeVisible()
}

test.describe('The child’s private details', () => {
  test('are editable on screen', async ({ app }) => {
    await openChildInfo(app)

    await app.getByLabel('Notes anyone reading this record should know').fill(
      'Works with a speech therapist twice a week.',
    )
    await app.waitForTimeout(700)
    await app.reload()
    await app.locator('.section-link', { hasText: 'Child’s information' }).click()

    await expect(app.getByLabel('Notes anyone reading this record should know')).toHaveValue(
      'Works with a speech therapist twice a week.',
    )
  })

  test('the home address is not asked for anywhere', async ({ app }) => {
    await openChildInfo(app)
    // Not hidden on paper — never collected. The district has it from the
    // Letter of Intent, and a folder that never holds it cannot leak it.
    for (const label of ['Address', 'City', 'ZIP']) {
      await expect(app.getByLabel(label)).toHaveCount(0)
    }
  })

  test('never reach the printed sheet', async ({ app }) => {
    await openChildInfo(app)
    await app.getByLabel('Notes anyone reading this record should know').fill(
      'Diagnosed with an intellectual disability and autism.',
    )
    await app.waitForTimeout(700)

    await app.emulateMedia({ media: 'print' })

    await expect(app.getByLabel('Date of birth')).toBeHidden()
    await expect(app.getByLabel('Notes anyone reading this record should know')).toBeHidden()
    // Every node holding it, hidden — the textarea and its printed twin.
    // getByText matches hidden nodes, so counting them would pass whether or
    // not the ink reaches paper.
    const holders = app.getByText('intellectual disability')
    for (let i = 0; i < (await holders.count()); i++) {
      await expect(holders.nth(i)).toBeHidden()
    }
  })

  test('but what the statute does want still prints', async ({ app }) => {
    await openChildInfo(app)
    await app.getByLabel('Parent’s name').fill('Maria Example')
    await app.getByLabel('Date of the Letter of Intent').fill('2025-08-11')
    await app.waitForTimeout(700)

    await app.emulateMedia({ media: 'print' })
    const printed = await whatPrints(app)
    expect(printed).toContain('Sofía Ramírez')
    expect(printed).toContain('Maria Example')
    // The control itself is replaced by its printed value, so assert the value.
    expect(printed).toContain('2025-08-11')
  })
})
