import { fixtureResources } from '@/test/fixtures'
import { resourcePage } from './resourcePage'

const page = (path: string) => {
  const result = resourcePage(path, fixtureResources)
  return result && { key: result.resource.key as string, kind: result.kind, id: result.id }
}

describe('resourcePage', () => {
  it('recognises the list, create, detail and edit routes', () => {
    expect(page('/persons')).toEqual({ key: 'persons', kind: 'list', id: undefined })
    expect(page('/persons/')).toEqual({ key: 'persons', kind: 'list', id: undefined })
    expect(page('/persons/new')).toEqual({ key: 'persons', kind: 'new', id: undefined })
    expect(page('/tasks/42')).toEqual({ key: 'tasks', kind: 'detail', id: 42 })
    expect(page('/tasks/42/edit')).toEqual({ key: 'tasks', kind: 'edit', id: 42 })
  })

  it('reads a UUID id as a string', () => {
    const id = '682c7baf-b7c6-4bec-a728-48bc2d12ee28'
    expect(page(`/tasks/${id}`)).toEqual({ key: 'tasks', kind: 'detail', id })
    expect(page(`/tasks/${id.toUpperCase()}/edit`)).toEqual({ key: 'tasks', kind: 'edit', id })
    expect(page('/tasks/682c7baf-b7c6-4bec')).toBeNull()
  })

  it('is null outside the resource routes', () => {
    expect(page('/')).toBeNull()
    expect(page('/no-such-page')).toBeNull()
    expect(page('/personsx')).toBeNull()
    expect(page('/persons/abc')).toBeNull()
    expect(page('/persons/0')).toBeNull()
    expect(page('/persons/1/delete')).toBeNull()
    expect(page('/persons/1/edit/more')).toBeNull()
    expect(page('/persons/new/edit')).toBeNull()
  })
})
