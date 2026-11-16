// Test fixtures: the persons and tasks resources of the reference app (Person UI) and the deliveries and orders command
// resources of the order management API, so the generic code keeps its
// unit tests in a project without resources. `api/` holds their generated Zod schemas, frozen; `locales/` their
// labels. The app never imports this folder; the dev-only component gallery (src/gallery) does.
import i18n from 'i18next'
import enDeliveries from './locales/en/deliveries.json'
import enEnums from './locales/en/enums.json'
import enOrders from './locales/en/orders.json'
import enPersons from './locales/en/persons.json'
import enTasks from './locales/en/tasks.json'
import plDeliveries from './locales/pl/deliveries.json'
import plEnums from './locales/pl/enums.json'
import plOrders from './locales/pl/orders.json'
import plPersons from './locales/pl/persons.json'
import plTasks from './locales/pl/tasks.json'
import fixtureManifest from './ui-manifest.yaml'
import { buildResources, type Resource, type ResourceManifest } from '@/manifest'

export type FixtureKey = 'persons' | 'tasks' | 'deliveries' | 'orders'

/**
 * The fixtures' resource keys: prefixed, so they never clash with a project's own resources of the same name (their
 * labels and manifests would win). Labels live under these keys (`fxPersons.fields.*`), sources are registered by them.
 */
export const fixtureKeys: Record<FixtureKey, string> = {
  persons: 'fxPersons',
  tasks: 'fxTasks',
  deliveries: 'fxDeliveries',
  orders: 'fxOrders',
}

export const fixtureResources = buildResources(
  (fixtureManifest as { resources: Record<FixtureKey, ResourceManifest> }).resources,
)

/** A fixture resource, as `getResource` returns a real one. */
export function fixtureResource(key: FixtureKey): Resource {
  const resource = fixtureResources.find((r) => (r.key as string) === fixtureKeys[key])
  if (!resource) throw new Error(`Unknown fixture resource: ${key}`)
  return resource
}

/** Adds the fixture labels (`fxPersons.*`, `fxTasks.*`, `fxDeliveries.*`, `fxOrders.*`, their enums) to i18n; run once from src/test/setup.ts. */
export function installFixtureLocales() {
  i18n.addResourceBundle('en', 'translation', {
      fxPersons: enPersons,
      fxTasks: enTasks,
      fxDeliveries: enDeliveries,
      fxOrders: enOrders,
      enums: enEnums,
    }, true, false)
  i18n.addResourceBundle('pl', 'translation', {
      fxPersons: plPersons,
      fxTasks: plTasks,
      fxDeliveries: plDeliveries,
      fxOrders: plOrders,
      enums: plEnums,
    }, true, false)
}
