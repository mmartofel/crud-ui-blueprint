# Reference resources

Complete resources from real apps: `persons` and `tasks` from the app this blueprint was extracted from (Person UI,
contract `Person API 3.4.1`), `orders` from `order-management-ui` (contract `Order Management API 2.0.0`, a CQRS /
Event Sourcing API, API-CONTRACT.md section 11). Copy from them, never import them: they reference generated code
(`@/api/generated/...`) that only exists in those apps. Every key and pattern the generic code supports is used in one
of them.

| Example | Shows |
|---|---|
| `persons/` | the simple resource: list with search, sort, paging and filters (select, date, country), a badge column, the detail header's status badge (`detail.status`), a nested object (`address`: its own section card in the form and the detail), a date range rule (`notBefore`), a contract default, related records under the detail (`detail.related`) |
| `orders/` | a command resource (`kind: commands`): UUID ids (`useUuidParam`), a create that returns `{ id, version }` and opens the detail page while the read model catches up, an action with input (`actions: cancel`, `destructive`), a list of objects in the form and on the detail (`lines`), a short display name for a record without one (`display: "#{id:8}"`), a relation input filtered by another field (`filter: { personId: personId }`), references shown and linked on the detail only (`from: person`, `from: address`), no row menu and no edit page |
| `tasks/` | relations: a relation input (`input: relation`, `from`), a relation column linking to the other record, boolean and relation filters, number / textarea / checkbox inputs, a boolean header badge (`detail.status: done`), read-only server fields (`form.readOnly`, `formats`; the detail's metadata card) |

The list and detail pages are thin: they pass the generated hooks to `ResourceList` and `ResourceDetail`, which build
the screens from the manifest; they look like the gallery (`/__gallery`).

Each folder has:

| File | Goes to |
|---|---|
| `manifest.yaml` | the `resources.<key>` entry of `ui-manifest.yaml` |
| `feature/*.tsx` | `src/features/<key>/` (renamed, see `../wiring.md`) |
| `locales/{pl,en}/<key>.json` | `src/locales/{pl,en}/<key>.json`, registered in `src/i18n/resources.ts` |
| `locales/{pl,en}/enums.json` | merged into `src/locales/{pl,en}/enums.json` |
| `<key>.spec.ts` | `e2e/<key>.spec.ts`; the specs use `e2e/support/data.ts` and the e2e users `writer` / `reader` |

The `src/api/sources.ts` lines were:

```ts
persons: { list: listPersons, get: getPerson, listKey: getListPersonsQueryKey, getKey: getGetPersonQueryKey },
tasks: { list: listTasks, get: getTask, listKey: getListTasksQueryKey, getKey: getGetTaskQueryKey },
orders: { list: listOrders, get: getOrder, listKey: getListOrdersQueryKey, getKey: getGetOrderQueryKey },
```

and the routes in `src/router.tsx`: `...personsRoutes, ...tasksRoutes,` before the `*` route.

**Orders** came with five more resources in that app: `payments` and `deliveries` (command resources too) and
`persons`, `addresses` and `items` (CRUD reference data the order points to). The manifest's relations and
`detail.related`, and the spec's full flow (pay, ship, deliver), need them: leave out what is not built yet.
An action without input is a confirmation only; from the deliveries entry:

```yaml
    actions:
      - name: ship
        form:
          groups:
            - [trackingNumber]
      - name: complete            # no form: a confirmation dialog, the body is only { version }
      - name: cancel
        destructive: true
        form:
          groups:
            - [reason]
          fields:
            reason: { input: textarea }
```

Its e2e helpers: `placeOrderViaApi` waits until the read model has a record created through the API (a page opened
by URL does not know which version to wait for), and `pickRelation` waits for the picker's popover to close before
the next one opens.

Persons is built first (tasks points to it), but its manifest names tasks in `detail.related` and one persons test
creates a task: leave both out until tasks is built.

With persons as the first resource, the `HOME` lines of `e2e/shell.spec.ts` became:

```ts
// the writer's home page
await expect(page).toHaveURL(/\/persons/)
await expect(page.getByRole('heading', { level: 1, name: 'Persons' })).toBeVisible()
// the language switch (twice)
await expect(page.getByRole('heading', { level: 1, name: 'Osoby' })).toBeVisible()
// the sign-in callback
await expect(page).toHaveURL('/persons')
// the mobile menu sheet: navigation lists the resources, a link closes the sheet
await expect(dialog.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
await dialog.getByRole('link', { name: 'Persons' }).click()
await expect(dialog).toBeHidden()
await expect(page).toHaveURL('/persons')
```
