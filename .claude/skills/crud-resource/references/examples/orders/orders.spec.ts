import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectAccessible } from './support/a11y.ts'
import { appOrigin, authFile, openAs } from './support/auth.ts'
import { callApi, deleteViaApi, unique } from './support/data.ts'

// The command resources end to end: an order placed in the UI, paid, shipped and delivered through actions, the
// read model catching up after each command, a stale version, a state that no longer allows a command, and the
// reader's view. Orders, payments and deliveries cannot be deleted (they end with an event); the reference data
// each test creates is deleted afterwards, addresses before the persons they belong to.

let created: string[] = []

interface Customer {
  personId: number
  addressId: number
  itemId: number
  itemName: string
  lastName: string
}

/** A person with an address and an item, created through the API. */
async function createCustomer(page: Page): Promise<Customer> {
  const id = unique()
  const lastName = `Buyer${id}`
  const person = await callApi(page, 'POST', '/persons', { firstName: 'Ola', lastName, email: `ola.${id}@example.com` })
  created.push(`/persons/${person!.id}`)
  const address = await callApi(page, 'POST', '/addresses', {
    personId: person!.id,
    street: `Prosta ${id}`,
    city: 'Warsaw',
    postalCode: '00-001',
    country: 'PL',
  })
  created.push(`/addresses/${address!.id}`)
  const itemName = `Mug${id}`
  const item = await callApi(page, 'POST', '/items', { sku: `SKU-${id}`, name: itemName, price: 19.99 })
  created.push(`/items/${item!.id}`)
  return { personId: person!.id, addressId: address!.id, itemId: item!.id, itemName, lastName }
}

/**
 * Places an order through the API and waits until the read model has it: reads are eventually consistent, and a
 * page opened by URL (unlike the UI's own create) does not know which version to wait for.
 */
async function placeOrderViaApi(page: Page, customer: Customer, quantity = 2) {
  const result = await callApi(page, 'POST', '/orders', {
    personId: customer.personId,
    addressId: customer.addressId,
    lines: [{ itemId: customer.itemId, quantity }],
  })
  const id = String(result!.id)
  await expect
    .poll(() => callApi(page, 'GET', `/orders/${id}`).then(() => true, () => false), { timeout: 15_000 })
    .toBe(true)
  return id
}

/** Picks a record in a relation combobox by searching for it. */
async function pickRelation(page: Page, combobox: Locator, search: string, option: string | RegExp) {
  await combobox.click()
  await page.getByRole('dialog').getByPlaceholder('Search…').fill(search)
  await page.getByRole('option', { name: option }).click()
  // the popover closes with an animation; the next picker's search box would otherwise match it too
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

/** The status badge in the detail header, once the read model has caught up. */
const expectStatus = (page: Page, status: string) =>
  expect(page.getByRole('heading', { level: 1 }).locator('..')).toContainText(status, { timeout: 15_000 })

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  if (created.length && !page.url().startsWith(appOrigin)) await openAs(page)
  for (const url of created.toReversed()) await deleteViaApi(page, url)
})

test.describe('orders as writer', () => {
  test.use({ storageState: authFile('writer') })

  test('places an order with lines, then pays, ships and delivers it through actions', async ({ page }) => {
    await openAs(page, '/orders')
    const customer = await createCustomer(page)

    // Place the order in the form: customer, an address of that customer only, two lines.
    await page.getByRole('link', { name: 'New', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'New order' })).toBeVisible()
    await pickRelation(page, page.getByRole('combobox', { name: 'Customer' }), customer.lastName, new RegExp(customer.lastName))
    await page.getByRole('combobox', { name: 'Delivery address' }).click()
    // the picker lists only this customer's address
    await expect(page.getByRole('dialog').getByRole('option')).toHaveCount(1)
    await page.getByRole('dialog').getByRole('option', { name: /Prosta/ }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const rows = page.getByRole('group', { name: /^Row \d+$/ })
    await pickRelation(page, rows.nth(0).getByRole('combobox', { name: 'Item' }), customer.itemName, customer.itemName)
    await rows.nth(0).getByLabel('Quantity').fill('2')
    await page.getByRole('button', { name: 'Add a row' }).click()
    await pickRelation(page, rows.nth(1).getByRole('combobox', { name: 'Item' }), customer.itemName, customer.itemName)
    await rows.nth(1).getByLabel('Quantity').fill('1')
    await expectAccessible(page)
    await page.getByRole('button', { name: 'Save' }).click()

    // The detail page waits for the read model: the order appears with its lines merged into one.
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/)
    const orderUrl = new URL(page.url()).pathname
    const orderName = `#${orderUrl.split('/').at(-1)!.slice(0, 8)}`
    await expectStatus(page, 'Placed')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^#[0-9a-f]{8}/)
    const lines = page.getByRole('table')
    await expect(lines.getByRole('row')).toHaveCount(2)
    await expect(lines).toContainText(customer.itemName)
    await expect(lines).toContainText('3')
    await expect(page.getByRole('button', { name: 'Cancel order' })).toBeVisible()
    // the customer and the delivery address are references that link to their records
    await expect(page.getByRole('link', { name: new RegExp(customer.lastName) })).toHaveAttribute('href', `/persons/${customer.personId}`)
    await expect(page.getByRole('link', { name: /Prosta/ })).toHaveAttribute('href', `/addresses/${customer.addressId}`)
    await expectAccessible(page)

    // Pay: a payment for the order, then the Complete action.
    await page.goto('/payments/new')
    await pickRelation(page, page.getByRole('combobox', { name: 'Order' }), customer.itemName, orderName)
    await page.getByLabel('Amount').fill('59.97')
    await page.getByRole('combobox', { name: 'Method' }).click()
    await page.getByRole('option', { name: 'Card' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/\/payments\/[0-9a-f-]{36}$/)
    await expectStatus(page, 'Initiated')
    await page.getByRole('button', { name: 'Complete' }).click()
    const complete = page.getByRole('dialog', { name: 'Complete' })
    await expectAccessible(page, '[role=dialog]')
    // the input is required
    await complete.getByRole('button', { name: 'Complete' }).click()
    await expect(complete.getByText('This field is required.')).toBeVisible()
    await complete.getByLabel('Transaction reference').fill('TX-E2E')
    await complete.getByRole('button', { name: 'Complete' }).click()
    await expect(complete).toBeHidden()
    await expectStatus(page, 'Completed')
    await expect(page.getByRole('button', { name: 'Complete' })).toBeHidden()

    await page.goto(orderUrl)
    await expectStatus(page, 'Paid')

    // Ship and deliver: a delivery for the paid order.
    await page.goto('/deliveries/new')
    await pickRelation(page, page.getByRole('combobox', { name: 'Order' }), customer.itemName, orderName)
    await page.getByLabel('Carrier').fill('DHL')
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    await page.getByLabel('Scheduled for').fill(tomorrow)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/\/deliveries\/[0-9a-f-]{36}$/)
    await expectStatus(page, 'Scheduled')
    await page.getByRole('button', { name: 'Ship' }).click()
    await page.getByRole('dialog', { name: 'Ship' }).getByLabel('Tracking number').fill('TRACK-E2E')
    await page.getByRole('dialog', { name: 'Ship' }).getByRole('button', { name: 'Ship' }).click()
    await expectStatus(page, 'Shipped')
    // an action without input only confirms
    await page.getByRole('button', { name: 'Mark delivered' }).click()
    const delivered = page.getByRole('dialog', { name: 'Mark delivered' })
    await expect(delivered.getByRole('textbox')).toHaveCount(0)
    await delivered.getByRole('button', { name: 'Mark delivered' }).click()
    await expectStatus(page, 'Delivered')

    await page.goto(orderUrl)
    await expectStatus(page, 'Delivered')
    await expect(page.getByRole('button', { name: 'Cancel order' })).toBeHidden()
  })

  test('a stale version offers a reload; the reloaded order no longer offers the action', async ({ page }) => {
    await openAs(page, '/orders')
    const customer = await createCustomer(page)
    const orderId = await placeOrderViaApi(page, customer)
    await page.goto(`/orders/${orderId}`)
    await expectStatus(page, 'Placed')

    // Someone else cancels the order first.
    await callApi(page, 'POST', `/orders/${orderId}/cancel`, { reason: 'cancelled elsewhere', version: 0 })

    await page.getByRole('button', { name: 'Cancel order' }).click()
    const dialog = page.getByRole('dialog', { name: 'Cancel order' })
    await dialog.getByLabel('Reason').fill('changed my mind')
    await dialog.getByRole('button', { name: 'Cancel order' }).click()
    const stale = page.getByRole('alertdialog', { name: 'This record was changed' })
    await expect(stale).toBeVisible()
    await expectAccessible(page, '[role=alertdialog]')
    await stale.getByRole('button', { name: 'Reload' }).click()
    await expectStatus(page, 'Cancelled')
    await expect(page.getByRole('button', { name: 'Cancel order' })).toBeHidden()
    await expect(page.getByText('cancelled elsewhere')).toBeVisible()
  })

  test("a command the order's state does not allow is explained in the form", async ({ page }) => {
    await openAs(page, '/orders')
    const customer = await createCustomer(page)
    const orderId = await placeOrderViaApi(page, customer)

    // A delivery for an order that is not paid yet.
    await page.goto('/deliveries/new')
    await pickRelation(page, page.getByRole('combobox', { name: 'Order' }), customer.itemName, `#${orderId.slice(0, 8)}`)
    await page.getByLabel('Carrier').fill('DHL')
    await page.getByLabel('Scheduled for').fill(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('alert')).toContainText('The current state does not allow this.')
    await expect(page).toHaveURL(/\/deliveries\/new$/)
  })
})

test.describe('orders as reader', () => {
  test.use({ storageState: authFile('reader') })

  test('a reader sees an order without actions and cannot place one', async ({ page, browser }) => {
    // The writer places the order; the reader only reads it.
    const writer = await browser.newPage({ storageState: authFile('writer') })
    await openAs(writer, '/orders')
    const customer = await createCustomer(writer)
    const orderId = await placeOrderViaApi(writer, customer)

    try {
      await openAs(page, `/orders/${orderId}`)
      await expectStatus(page, 'Placed')
      await expect(page.getByRole('button', { name: 'Cancel order' })).toBeHidden()
      await page.goto('/orders')
      await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'New', exact: true })).toBeHidden()
      await expectAccessible(page)
    } finally {
      for (const url of created.toReversed()) await deleteViaApi(writer, url)
      created = []
      await writer.close()
    }
  })
})
