import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { ApiError } from '@/api/fetcher'
import { CancelDeliveryBody, ShipDeliveryBody } from '@/test/fixtures/api/deliveries.zod'
import { fixtureResource } from '@/test/fixtures'
import { CommandActions, type CommandHandlers } from './CommandActions'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const deliveries = fixtureResource('deliveries')
const id = '682c7baf-b7c6-4bec-a728-48bc2d12ee28'

function setup(allowedActions: string[], run: Partial<CommandHandlers['run']> = {}) {
  const handlers = {
    run: {
      ship: vi.fn(async () => ({ id, version: 1 })),
      complete: vi.fn(async () => ({ id, version: 1 })),
      cancel: vi.fn(async () => ({ id, version: 1 })),
      ...run,
    },
    schemas: {
      ship: ShipDeliveryBody.omit({ version: true }),
      cancel: CancelDeliveryBody.omit({ version: true }),
    },
    onChanged: vi.fn(),
  }
  const callbacks = { onSent: vi.fn(), onStale: vi.fn(), onRefresh: vi.fn() }
  render(
    <CommandActions
      resource={deliveries}
      record={{ id, version: 0, allowedActions }}
      commands={handlers as unknown as CommandHandlers}
      {...callbacks}
    />,
  )
  return { handlers, ...callbacks }
}

describe('CommandActions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers the allowed actions the manifest describes, in manifest order', () => {
    setup(['cancel', 'ship', 'refund'])
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Ship', 'Cancel delivery'])
  })

  it('offers nothing to a reader', () => {
    setup([])
    expect(screen.queryAllByRole('button')).toEqual([])
  })

  it('validates the input, then sends it with the version it shows', async () => {
    const { handlers, onSent } = setup(['ship'])
    await userEvent.click(screen.getByRole('button', { name: 'Ship' }))
    const dialog = screen.getByRole('dialog', { name: 'Ship' })
    expect(within(dialog).getByText('Hand the delivery over to the carrier.')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Ship' }))
    expect(await within(dialog).findByText('This field is required.')).toBeInTheDocument()
    expect(handlers.run.ship).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText(/Tracking number/), 'TRACK-1')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ship' }))
    expect(handlers.run.ship).toHaveBeenCalledWith({ trackingNumber: 'TRACK-1', version: 0 })
    expect(handlers.onChanged).toHaveBeenCalledWith({ id, version: 1 })
    expect(onSent).toHaveBeenCalledWith({ id, version: 1 })
    expect(toast.success).toHaveBeenCalledWith('Ship: sent.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('only confirms an action without input', async () => {
    const { handlers } = setup(['complete'])
    await userEvent.click(screen.getByRole('button', { name: 'Mark delivered' }))
    const dialog = screen.getByRole('dialog', { name: 'Mark delivered' })
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark delivered' }))
    expect(handlers.run.complete).toHaveBeenCalledWith({ version: 0 })
  })

  it('hands a stale version over to the reload dialog', async () => {
    const { onStale, onSent } = setup(['complete'], {
      complete: () => Promise.reject(new ApiError(409, 'Conflict', 'changed by someone else')),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Mark delivered' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark delivered' }))
    expect(onStale).toHaveBeenCalled()
    expect(onSent).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('explains a state that no longer allows the action and reads the record again', async () => {
    const { onRefresh, onStale } = setup(['complete'], {
      complete: () =>
        Promise.reject(
          new ApiError(409, 'Conflict', 'Delivery is CANCELLED', [{ code: 'invalid-state', message: 'is CANCELLED' }]),
        ),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Mark delivered' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark delivered' }))
    expect(await within(dialog).findByText('The current state does not allow this.')).toBeInTheDocument()
    expect(onRefresh).toHaveBeenCalled()
    expect(onStale).not.toHaveBeenCalled()
  })

  it('shows a field error of the API on its field', async () => {
    setup(['cancel'], {
      cancel: () =>
        Promise.reject(new ApiError(400, 'Bad Request', undefined, [{ field: 'reason', code: 'invalid', message: 'bad' }])),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Cancel delivery' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'no longer needed')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel delivery' }))
    expect(await within(dialog).findByText('This value is not valid.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Reason/)).toHaveAttribute('aria-invalid', 'true')
  })
})
