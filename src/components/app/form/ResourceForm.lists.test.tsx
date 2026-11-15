import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ApiError } from '@/api/fetcher'
import { CreateOrderBody } from '@/test/fixtures/api/orders.zod'
import { fixtureResource } from '@/test/fixtures'
import { ResourceForm } from './ResourceForm'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const orders = fixtureResource('orders')
const result = { id: '682c7baf-b7c6-4bec-a728-48bc2d12ee28', version: 0 }

function renderForm(save: (body: unknown) => Promise<typeof result>) {
  render(
    <MemoryRouter>
      <ResourceForm
        resource={orders}
        schema={CreateOrderBody}
        save={save}
        onSaved={vi.fn()}
        cancelHref="/orders"
        confirmLeave={false}
      />
    </MemoryRouter>,
  )
}

// jsdom has no matchMedia; the form asks it on focus (scrolling a field clear of the sticky actions on mobile).
beforeAll(() => {
  window.matchMedia = vi.fn(() => ({ matches: false }) as unknown as MediaQueryList)
})

const lines = () => screen.getAllByRole('group', { name: /^Row \d+$/ })

describe('ResourceForm with a list of objects', () => {
  it('starts with one row, adds and removes rows, and sends the list as numbers', async () => {
    const save = vi.fn(async () => result)
    renderForm(save)
    expect(screen.getByRole('group', { name: 'Lines' })).toBeInTheDocument()
    expect(lines()).toHaveLength(1)
    // the only row cannot be removed
    expect(screen.getByRole('button', { name: 'Remove row 1' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/Customer/), '1')
    await userEvent.type(screen.getByLabelText(/Address/), '2')
    await userEvent.type(within(lines()[0]).getByLabelText(/Item/), '10')
    await userEvent.type(within(lines()[0]).getByLabelText(/Quantity/), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Add a row' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add a row' }))
    expect(lines()).toHaveLength(3)
    await userEvent.type(within(lines()[1]).getByLabelText(/Item/), '11')
    await userEvent.type(within(lines()[1]).getByLabelText(/Quantity/), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Remove row 3' }))
    expect(lines()).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save).toHaveBeenCalledWith(
      {
        personId: 1,
        addressId: 2,
        lines: [
          { itemId: 10, quantity: 2 },
          { itemId: 11, quantity: 1 },
        ],
      },
      undefined,
    )
  })

  it('reports a required field of a row on that row', async () => {
    const save = vi.fn(async () => result)
    renderForm(save)
    await userEvent.type(screen.getByLabelText(/Customer/), '1')
    await userEvent.type(screen.getByLabelText(/Address/), '2')
    await userEvent.type(within(lines()[0]).getByLabelText(/Item/), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await within(lines()[0]).findByText('This field is required.')).toBeInTheDocument()
    expect(within(lines()[0]).getByLabelText(/Quantity/)).toHaveAttribute('aria-invalid', 'true')
    expect(save).not.toHaveBeenCalled()
  })

  it("shows the API's error for one row's field on that row", async () => {
    renderForm(() =>
      Promise.reject(
        new ApiError(400, 'Bad Request', 'Item 99 does not exist', [
          { field: 'lines[1].itemId', code: 'not-found', message: 'does not exist' },
        ]),
      ),
    )
    await userEvent.type(screen.getByLabelText(/Customer/), '1')
    await userEvent.type(screen.getByLabelText(/Address/), '2')
    await userEvent.type(within(lines()[0]).getByLabelText(/Item/), '10')
    await userEvent.type(within(lines()[0]).getByLabelText(/Quantity/), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Add a row' }))
    await userEvent.type(within(lines()[1]).getByLabelText(/Item/), '99')
    await userEvent.type(within(lines()[1]).getByLabelText(/Quantity/), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await within(lines()[1]).findByText(/does not exist|not found/i)).toBeInTheDocument()
    expect(within(lines()[1]).getByLabelText(/Item/)).toHaveAttribute('aria-invalid', 'true')
    expect(within(lines()[0]).getByLabelText(/Item/)).not.toHaveAttribute('aria-invalid')
  })
})
