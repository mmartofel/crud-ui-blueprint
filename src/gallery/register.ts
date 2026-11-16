// Gives the gallery the persons and tasks resources of the test fixtures, as if they were in ui-manifest.yaml and
// src/api/sources.ts. Imported before any component, because some read the manifest when their module loads.
import i18n from '@/i18n'
import { sources } from '@/api/sources'
import { apiStatusSource } from '@/api/status'
import { resources, type Resource } from '@/manifest'
import { fixtureResource, fixtureResources, installFixtureLocales } from '@/test/fixtures'
import { memorySource, persons, tasks } from './data'

// In front of a project's own resources: a fixture's route (/persons) may be a project resource's route too, and the
// gallery's pages and breadcrumbs must resolve to the fixture (resourcePage takes the first match).
resources.unshift(...fixtureResources.filter((fixture) => !resources.some((r) => r.key === fixture.key)))

Object.assign(sources, {
  fxPersons: memorySource(fixtureResource('persons'), persons),
  fxTasks: memorySource(fixtureResource('tasks'), tasks),
})

// No API in the gallery: the footer shows a fixed, available status.
apiStatusSource.check = async () => ({ state: 'available', version: '3.4.2', versionSource: 'api' })

installFixtureLocales()
i18n.addResourceBundle('en', 'translation', { common: { roles: { 'person-viewer': 'Viewer', 'person-editor': 'Editor' } } }, true, false)
i18n.addResourceBundle('pl', 'translation', { common: { roles: { 'person-viewer': 'Odczyt', 'person-editor': 'Edycja' } } }, true, false)

export const personsResource: Resource = fixtureResource('persons')
export const tasksResource: Resource = fixtureResource('tasks')
