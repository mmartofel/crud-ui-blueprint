import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ApiError } from '@/api/fetcher'
import { fixtureResource } from '@/test/fixtures'
import { AWAIT_DELAYS_MS } from './commands/useAwaitVersion'
import { ResourceDetail, type RecordQuery } from './ResourceDetail'

vi.mock('@/auth', () => ({ useRoles: () => ['orders-editor'] }))

const deliveries = fixtureResource('deliveries')
const id = '682c7baf-b7c6-4bec-a728-48bc2d12ee28'
const delivery = {
  id,
  carrier: 'DHL',
  scheduledFor: '2026-11-20',
  status: 'SCHEDULED',
  updatedAt: '2026-11-15T10:00:00Z',
  allowedActions: ['ship', 'cancel'],
  version: 0,
}
type Delivery = typeof delivery

const commands = { run: { ship: vi.fn(), cancel: vi.fn(), complete: vi.fn() }, onChanged: vi.fn() }

function renderDetail(query: Partial<RecordQuery<Delivery>>, state?: object) {
  const full: RecordQuery<Delivery> = { error: null, isPending: false, isError: false, refetch: vi.fn(), ...query }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: `/deliveries/${id}`, state }]}>
        <ResourceDetail resource={deliveries} query={full} commands={commands} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return full
}

describe('ResourceDetail of a command resource', () => {
  it('offers the allowed actions instead of Edit and Delete', () => {
    renderDetail({ data: delivery })
    expect(screen.getByRole('heading', { name: /DHL/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ship' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel delivery' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows "processing", not the not-found page, right after a create', () => {
    vi.useFakeTimers()
    try {
      const query = renderDetail(
        { error: new ApiError(404, 'Not Found'), isError: true, isPending: false },
        { awaitVersion: 0 },
      )
      expect(screen.getByRole('status')).toHaveTextContent('Processing…')
      expect(screen.queryByText(/not found/i)).not.toBeInTheDocument()
      act(() => void vi.advanceTimersByTime(AWAIT_DELAYS_MS[0]))
      expect(query.refetch).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the not-found page when nothing is awaited', () => {
    renderDetail({ error: new ApiError(404, 'Not Found'), isError: true })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ship' })).not.toBeInTheDocument()
  })
})
