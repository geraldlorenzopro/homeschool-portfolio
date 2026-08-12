import { expect, test } from './fixtures'

test.describe('Routing, responsiveness and resilience', () => {
  test('deep links work and unknown routes fall back to the dashboard', async ({ app }) => {
    await app.goto('/portfolio')
    await expect(app.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()

    await app.goto('/quick-log')
    await expect(app.getByRole('heading', { name: 'One running log' })).toBeVisible()

    await app.goto('/nothing-here')
    await expect(app.getByRole('heading', { name: 'Student information' })).toBeVisible()
  })

  test('the back button moves between the flows', async ({ app }) => {
    await app.getByRole('link', { name: 'B · Quick log' }).click()
    await expect(app.getByRole('heading', { name: 'One running log' })).toBeVisible()
    await app.goBack()
    await expect(app.getByRole('heading', { name: 'Student information' })).toBeVisible()
  })

  test('below 900 px the sidebar list becomes a single select', async ({ app }) => {
    await app.setViewportSize({ width: 720, height: 900 })

    await expect(app.locator('.section-list')).toBeHidden()
    const picker = app.getByLabel('Section')
    await expect(picker).toBeVisible()

    await picker.selectOption({ label: 'Work samples (3)' })
    await expect(app.locator('.panel-title')).toHaveText('Work samples')
  })

  test('the year completeness meter tracks what is filled in', async ({ app }) => {
    await app.setViewportSize({ width: 1280, height: 900 })
    const meter = app.getByRole('progressbar')
    await expect(meter).toHaveAttribute('aria-valuenow', '100')

    // Empty the reading list: 9 of 10 sections remain filled.
    await app.locator('.section-link', { hasText: 'Reading list' }).click()
    const removals = app.getByRole('button', { name: 'Remove' })
    for (let left = await removals.count(); left > 0; left--) {
      await removals.first().click()
    }
    await expect(meter).toHaveAttribute('aria-valuenow', '90')
  })

  test('the page loads without console errors', async ({ app }) => {
    const errors: string[] = []
    app.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    app.on('pageerror', (e) => errors.push(e.message))

    await app.getByRole('link', { name: 'B · Quick log' }).click()
    await app.getByRole('link', { name: 'Finished portfolio' }).click()
    await expect(app.getByRole('heading', { name: 'Annual Evaluation Portfolio' })).toBeVisible()
    await app.getByRole('link', { name: 'A · Section panel' }).click()

    expect(errors).toEqual([])
  })

  test('a failed write surfaces a toast and keeps what was typed', async ({ app }) => {
    // Make the demo backend's next persist fail, the way a full quota would.
    await app.evaluate(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.startsWith('homeschool-portfolio')) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        }
        return original.call(this, key, value)
      }
    })

    await app.locator('.section-link', { hasText: 'Reading list' }).click()
    await app.getByLabel('Title').fill('A book that cannot be saved')
    await app.getByRole('button', { name: 'Add book' }).click()

    await expect(app.getByRole('status')).toContainText('ran out of local storage')
    // The entry is still on screen to retry with, not silently swallowed.
    await expect(app.getByLabel('Title')).toHaveValue('A book that cannot be saved')
  })
})
