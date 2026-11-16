import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { resources } from '@/manifest'
import { fixtureResource, fixtureResources } from '@/test/fixtures'
import { DetailSections } from './DetailSections'

const orders = fixtureResource('orders')

describe('DetailSections', () => {
  it('shows a list of objects (detail.lists) as a table in its own card', () => {
    render(
      <MemoryRouter>
        <DetailSections
          resource={orders}
          record={{
            total: 59.97,
            placedAt: '2026-11-15',
            lines: [
              { name: 'Mug', quantity: 2, unitPrice: 19.99 },
              { name: 'Teapot', quantity: 1, unitPrice: 19.99 },
            ],
          }}
        />
      </MemoryRouter>,
    )
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Item',
      'Quantity',
      'Unit price',
    ])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual(['Mug', 'Teapot'])
    expect(screen.getByText('Lines')).toBeInTheDocument()
  })

  it('says so when the list is empty', () => {
    render(
      <MemoryRouter>
        <DetailSections resource={orders} record={{ total: 0, placedAt: '2026-11-15', lines: [] }} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('DetailSections references', () => {
  const persons = fixtureResource('persons')

  // The link goes to the related resource's route (getResource).
  beforeAll(() => {
    resources.push(...fixtureResources.filter((fixture) => !resources.some((r) => r.key === fixture.key)))
  })

  it('links a reference that a relation input is filled from, and shows any other reference by its label', () => {
    const resource = {
      ...persons,
      detail: { fields: ['manager', 'mentor'] },
      form: { ...persons.form, fields: { managerId: { input: 'relation' as const, resource: persons.key, from: 'manager' } } },
    }
    render(
      <MemoryRouter>
        <DetailSections resource={resource} record={{ manager: { id: 7, label: 'Ola Nowak' }, mentor: { id: 8, label: 'Jan Kos' } }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ola Nowak' })).toHaveAttribute('href', `${persons.route}/7`)
    expect(screen.getByText('Jan Kos')).toBeInTheDocument()
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument()
  })
})
