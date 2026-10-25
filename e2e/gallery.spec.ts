import { expect, test, type Page } from '@playwright/test'

// The dev-only component gallery (/__gallery): no login, no API. Runs in the `gallery` project (playwright.config.ts).

const sections = [
  'Colour tokens',
  'Typography',
  'Buttons and badges',
  'List',
  'Detail',
  'Form',
  'States',
  'Confirm dialog and toasts',
]

/** Opens the gallery in English and collects console errors. */
async function openGallery(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => localStorage.setItem('lang', 'en'))
  await page.goto('/__gallery')
  await expect(page.getByRole('heading', { level: 1, name: 'Component gallery' })).toBeVisible()
  return errors
}

test('renders every section without console errors', async ({ page }) => {
  const errors = await openGallery(page)

  for (const name of sections) await expect(page.getByRole('heading', { level: 2, name })).toBeVisible()
  await expect(page.locator('#list')).toContainText('Available')
  await expect(page.getByRole('heading', { name: /^Tasks \(\d+\)$/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('the person form shows field errors from the API, then the stale-version dialog', async ({ page }) => {
  await openGallery(page)
  const form = page.locator('form').first()

  await form.getByRole('button', { name: 'Save' }).click()
  await expect(form.getByText('This value is already in use.')).toBeVisible()

  await page.getByLabel('Next save').click()
  await page.getByRole('option', { name: 'Stale version (409)' }).click()
  await form.getByRole('button', { name: 'Save' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'This record was changed' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Reload' }).click()
  await expect(dialog).toBeHidden()
})

test('the reader sees no write actions', async ({ page }) => {
  await openGallery(page)
  const detail = page.locator('#detail')
  await expect(detail.getByRole('button', { name: 'Delete' })).toBeVisible()

  await page.getByLabel('Role').click()
  await page.getByRole('option', { name: 'Reader (read only)' }).click()

  await expect(detail.getByRole('button', { name: 'Delete' })).toHaveCount(0)
  await expect(page.locator('#list').getByRole('button', { name: 'New' })).toHaveCount(0)
})

test('delete asks for confirmation and toasts; the theme switches to dark', async ({ page }) => {
  await openGallery(page)
  const dialogs = page.locator('#dialogs')

  await dialogs.getByRole('button', { name: 'Delete' }).click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('Anna Kowalska')
  await confirm.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('region', { name: /Notifications/ })).toContainText('deleted')

  await page.getByRole('button', { name: /user menu/ }).click()
  await page.getByRole('menuitem', { name: /^Theme/ }).click()
  await page.getByRole('menuitemradio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('the breadcrumbs name the opened record and lead back to the list', async ({ page }) => {
  await openGallery(page)
  const breadcrumbs = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(breadcrumbs.getByText('Persons')).toHaveAttribute('aria-current', 'page')

  await page.locator('#list').getByRole('link', { name: 'Prepare the quarterly report' }).click()
  await expect(breadcrumbs.getByText('Prepare the quarterly report')).toHaveAttribute('aria-current', 'page')
  await breadcrumbs.getByRole('link', { name: 'Tasks' }).click()
  await expect(breadcrumbs.getByText('Tasks')).toHaveAttribute('aria-current', 'page')
})

test('the sidebar collapses to icons and the active item is marked', async ({ page }) => {
  await openGallery(page)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(nav.getByRole('link', { name: 'Persons' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('button', { name: 'Collapse navigation' }).click()
  await expect(page.locator('[data-slot=sidebar]')).toHaveAttribute('data-state', 'collapsed')
  await expect(nav.getByRole('link', { name: 'Persons' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('sidebar'))).toBe('collapsed')
})
