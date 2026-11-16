import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { fixtureResource } from '@/test/fixtures'
import { useListState } from './listState'
import { ResourceList } from './ResourceList'

const roles = { current: [] as string[] }
vi.mock('@/auth', () => ({ useRoles: () => roles.current }))

beforeAll(() => {
  // jsdom has no matchMedia; the list switches between table and cards with it.
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList)
})

const deliveries = fixtureResource('deliveries')
const persons = fixtureResource('persons')

function List({ resource, rows }: { resource: typeof persons; rows: object[] }) {
  const list = useListState(resource)
  return (
    <ResourceList
      resource={resource}
      list={list}
      query={{
        data: { content: rows as never, page: { totalElements: rows.length, totalPages: 1 } },
        isPending: false,
        isError: false,
        isPlaceholderData: false,
        refetch: vi.fn(),
      }}
      remove={async () => {}}
      onDeleted={() => {}}
    />
  )
}

const renderList = (resource: typeof persons, rows: object[]) =>
  render(
    <MemoryRouter initialEntries={[resource.route]}>
      <List resource={resource} rows={rows} />
    </MemoryRouter>,
  )

describe('ResourceList', () => {
  it('offers a writer New and the row menu of a CRUD resource', () => {
    roles.current = ['person-editor']
    renderList(persons, [{ id: 7, firstName: 'Anna', lastName: 'Nowak', status: 'AVAILABLE', version: 0 }])
    expect(screen.getAllByRole('link', { name: 'New' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Actions for Anna Nowak' }).length).toBeGreaterThan(0)
  })

  it('offers a writer New but no row menu for a command resource', () => {
    roles.current = ['orders-editor']
    renderList(deliveries, [
      { id: '682c7baf-b7c6-4bec-a728-48bc2d12ee28', carrier: 'DHL', scheduledFor: '2026-11-20', status: 'SCHEDULED', version: 0 },
    ])
    expect(screen.getAllByRole('link', { name: 'New' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^Actions for/ })).not.toBeInTheDocument()
  })

  it('offers a reader neither', () => {
    roles.current = ['orders-viewer']
    renderList(deliveries, [])
    expect(screen.queryByRole('link', { name: 'New' })).not.toBeInTheDocument()
  })
})
