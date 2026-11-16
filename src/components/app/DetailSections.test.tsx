import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { fixtureResource } from '@/test/fixtures'
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
