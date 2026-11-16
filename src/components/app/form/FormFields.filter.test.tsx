import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { sources } from '@/api/sources'
import { resources, type Resource } from '@/manifest'
import { fixtureResource, fixtureResources } from '@/test/fixtures'
import { FormFields } from './FormFields'

const tasksList = vi.fn(async (params: Record<string, unknown>) => {
  void params
  return { content: [{ id: 3, title: 'Write the report' }] }
})

beforeAll(() => {
  // The picker names records by their resource's `display` (getResource) and lists them through `sources`.
  resources.push(...fixtureResources.filter((fixture) => !resources.some((r) => r.key === fixture.key)))
  Object.assign(sources, {
    tasks: {
      list: tasksList,
      get: async (id: number) => ({ id, title: 'Write the report' }),
      listKey: (params: Record<string, unknown>) => ['tasks', params],
      getKey: (id: number) => ['tasks', id],
    },
  })
  // jsdom lacks what the popover (ResizeObserver) and cmdk (scrollIntoView) use
  Element.prototype.scrollIntoView = vi.fn()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

// A person's form with a task picker that lists only the tasks of the assignee typed above it.
const persons = fixtureResource('persons')
const resource = {
  ...persons,
  form: {
    groups: [['assigneeId'], ['taskId']],
    fields: {
      assigneeId: { input: 'number' },
      taskId: { input: 'relation', resource: 'tasks', filter: { assigneeId: 'assigneeId' } },
    },
  },
} as unknown as Resource

function Harness() {
  const form = useForm({ defaultValues: { assigneeId: '', taskId: '' } })
  return <FormFields resource={resource} control={form.control} required={[]} bare />
}

describe('a relation input with a filter', () => {
  it('lists the related records filtered by another field of the form', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Harness />
      </QueryClientProvider>,
    )
    await userEvent.click(screen.getByRole('combobox'))
    expect(tasksList).toHaveBeenLastCalledWith(expect.not.objectContaining({ assigneeId: expect.anything() }))
    await userEvent.keyboard('{Escape}')

    await userEvent.type(screen.getAllByRole('spinbutton')[0], '7')
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('Write the report')).toBeInTheDocument()
    expect(tasksList).toHaveBeenLastCalledWith(expect.objectContaining({ assigneeId: 7 }))
  })
})
