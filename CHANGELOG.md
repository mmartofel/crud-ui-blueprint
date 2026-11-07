# Changelog

Changes to the blueprint that projects created from it can take over with the `blueprint-upgrade` skill
(`docs/UPGRADE.md`). The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/):

- **MAJOR**: a project must adapt by hand: a manifest key renamed or removed, a generic component or helper removed
  or changed in a way feature code notices, a new contract rule an API must meet. Each such change has a line under
  "Migration".
- **MINOR**: a new generic feature, manifest key or rule that existing projects need not act on.
- **PATCH**: fixes, dependency updates and docs.

Every change to `.claude/`, `docs/API-*.md` or generic code gets a line under `[Unreleased]`. A release renames that
section to the version and date and tags the commit `v<version>`.

## [Unreleased]

### Fixed
- The setup line of the crud-resource eval `contract-change-new-field` creates `src/features/` before copying the
  reference feature into it. The blueprint has no such folder, so the copy failed.
- `docs/API-CONTRACT.md` and `docs/API-CLAUDE.md` no longer ask for a nullable `<relation>Id`. The reference API
  doesn't type it nullable, and a field left out of a `PUT` is cleared anyway (section 6). Section 8 now accepts
  optional fields that aren't typed nullable, so the contract-auditor stops warning about them.

## [2.0.2] - 2026-11-07

Fixes the upgrade script for projects that already made part of a change themselves. No migration needed.

### Fixed
- `scripts/blueprint-upgrade.sh` no longer refuses the whole patch when the project already removed a file the
  blueprint deletes or renames away, as happened with `k8s/` on the way to 2.0.0. It leaves those files out, and a
  rename target the project already has, and lists them under "Left out" (`docs/UPGRADE.md`).

## [2.0.1] - 2026-11-07

Fixes the reference spec after the 10-row default of 2.0.0. No migration needed.

### Fixed
- The persons reference spec "search, page size, sorting and paging are kept in the URL" picked 10 rows, the new
  default of 2.0.0, which the URL leaves out, so it always failed. It picks 20 and creates 21 records now.

## [2.0.0] - 2026-11-07

Deployment taken back from person-ui-v2, the first project built from this template: one method for the UI and its
API repo (`docs/DEPLOY-CONVENTION.md`), Skaffold profiles over kustomize overlays, and sign-in served on the UI's own
host, so no file names a cluster, host, registry or namespace. MAJOR because `k8s/` is replaced by `deploy/`.

### Added
- `deploy/`: `base/` (Deployment, Service, ConfigMap, the `app.kubernetes.io/*` labels), `overlays/local` (the
  default, forwarded to `localhost:5173`), `overlays/openshift` (Route without a host, Topology labels and arrows),
  `overlays/kubernetes` (Ingress without a host) and `environments/example` (git-ignored `environments/<env>/`).
- `skaffold.yaml`: profiles `openshift` and `kubernetes`, `DEPLOY_OVERLAY` for an environment overlay, `gitCommit`
  tags, and `deploy/build-image.sh`, a custom builder that uses docker or podman for the cluster's platform.
- `docs/DEPLOY-CONVENTION.md`: the deployment rules shared with the API repo, which gets it as a third file from the
  kickstart.
- `OIDC_UPSTREAM`: the image's nginx proxies the realm's public paths (`/realms/<realm>/` and `/resources/`, never the
  master realm or `/admin`) to Keycloak, and `OIDC_AUTHORITY` may be a path (`/realms/<realm>`) resolved against the
  page's origin (`src/config.ts`). A full-URL authority without `OIDC_UPSTREAM` works as before.
- CI renders every overlay and the example environment with kustomize.
- `.gitignore` and `.dockerignore` keep local registry logins (`registry-login.sh`, `quay.sh`) and tarballs out of git
  and the image.

### Changed
- Security headers are included per nginx location instead of per server, so Keycloak's login page keeps its own CSP
  through the proxy. `X-Forwarded-Proto` is the scheme the router or Ingress forwarded, else nginx's own.
- The footer reads "Blueprint version used to generate UI: x" and "API version connected: x" (Polish too). The
  gallery screenshots do not show the footer text, so their baselines are unchanged.
- The reference resources' lists default to 10 rows (`pageSize: 10`).
- `docs/API-CLAUDE.md`, `docs/API-KICKSTART.md`, `CLAUDE.md` "Starting a new API": a new API deploys from `deploy/`
  with `deploy/ensure-secrets.sh` as a Skaffold hook. Its Keycloak runs with `KC_PROXY_HEADERS=xforwarded` and no
  hostname, and the UI client has `rootUrl ${authBaseUrl}` with relative redirect URIs and no secret values in the
  realm file. The reference for `deploy/` is Person API 3.6.1 (`6a795fe`). `docs/API-CONTRACT.md` section 10 adds the
  sign-in pitfall.
- `blueprint-upgrade` skill: commit a subset of the staged upgrade only with `git commit -- <paths>`.

### Removed
- `k8s/` (`app.yaml`, `configmap.yaml`, `ingress.example.yaml`, `kustomization.yaml`).

### Migration
- Move the project's `k8s/` into `deploy/`: names and image into `deploy/base/app.yaml`, `skaffold.yaml` and the
  overlays (Route, Ingress, `topology-ui.yaml`), values into `deploy/base/configmap.yaml`, a host or TLS into
  `deploy/environments/<env>/`. Then delete `k8s/` and check with `kubectl kustomize deploy/overlays/<x>`.
- For sign-in on the UI's host, set `OIDC_AUTHORITY: /realms/<realm>` and `OIDC_UPSTREAM` (the Keycloak Service). The
  API's Keycloak then needs `KC_PROXY_HEADERS=xforwarded` and the UI client with `rootUrl ${authBaseUrl}` and relative
  redirect URIs. Otherwise keep the full-URL authority.
- Copy `docs/DEPLOY-CONVENTION.md` into the API repo and keep both copies identical.
- A project that kept its own footer wording keeps it (shared `common.json`); `e2e/shell.spec.ts` checks the text.
- A resource's `pageSize` stays as it is in the project's manifest; nothing to do.

## [1.2.3] - 2026-10-27

Completes the focus and scroll handling of 1.2.2, found in review of the first project on it. No migration needed.

### Fixed
- Keyboard paging no longer leaves focus on a pagination button that has scrolled off screen (a regression in 1.2.2):
  another page of a list scrolls the list card to the top and focuses it (`ResourceList`; the card is a region named
  after the resource). All list state changes keep the scroll position (`listState.ts`).
- Below `md`, a filter or search no longer jumps the page: the mobile cards opt out of scroll anchoring (`DataTable`).
- The skip link moves focus to the content without adding a `#main` history entry, which on a form with unsaved
  changes made React Router warn about a blocked unknown navigation (`AppShell`).
- Below `md`, a focused form field scrolls clear of the action bar with its label and error message, not only the
  control (`data-form-field` in `FormFields`, `ResourceForm`).
- The gallery test "the reader sees no write actions" matched the task "Renew the office lease" as a "New" link and
  failed whenever the tasks list loaded first; its locators are exact now and it checks the writer sees "New" first.

## [1.2.2] - 2026-10-27

Keyboard focus and scroll position with the sticky footer of 1.2.1. No migration needed.

### Fixed
- A focused element no longer ends up under the sticky header or footer from `md` (the document's scroll padding in
  `src/index.css`), nor, below `md`, under the form's sticky action bar, also when the field is already on screen
  (`ResourceForm` scrolls it clear on focus; the bar is marked `data-form-actions`).
- A new page opens at the top instead of at the previous page's scroll position (`ScrollRestoration` in `AppShell`);
  back and forward restore the position. A list's search, sort, filters and page size keep it; another page of the
  list starts at the top.
- The footer's status popover keeps a gap above the footer.

## [1.2.1] - 2026-10-27

Footer fixes after the first project took over 1.2.0. No migration needed; projects regenerate their screenshot
baselines (`npm run test:visual:update`).

### Changed
- The app footer sticks to the bottom of the screen, so the API status is always in view on long pages. Its height is
  `--app-footer-height` (`src/index.css`); the form's mobile action bar and the toasts sit above it.

### Fixed
- The footer's status popover keeps the 16 px page gutter at 375 px (it was 4 px from the right edge).
- The gallery's open status details show a fixed contract version, so a project's footer screenshots no longer
  change with every contract pull.

## [1.2.0] - 2026-10-27

Adds the app footer with the blueprint release and the API's status (#5). No migration needed.

### Added
- App footer (#5): the blueprint release the app was built from, the API's running version and its status (available,
  degraded with the reason, unavailable), checked every 30 s from the public Actuator endpoint `/actuator/health`;
  the version is read from `/actuator/info` when the API becomes reachable. The dev server and the image's nginx
  proxy only these two paths. Recommended for APIs in `docs/API-CONTRACT.md` "Status endpoints" and
  `docs/API-CLAUDE.md`; an API without them still works (the footer shows the contract version and only whether the
  API answers).

## [1.1.3] - 2026-10-26

Corrects a 1.1.2 fix (#3). No migration needed.

### Fixed
- Deleting from a detail page no longer shows the deleted record on the list's first render (1.1.2 said it did not,
  but the list read its cached rows while rendering): `ResourceDetail` drops the resource's cached lists before it
  navigates. The list still loads once, and the reference persons spec now fails if the record is ever drawn.
- The list's "focus the search box" navigation state is cleared after use, so a reload does not move focus again.

## [1.1.2] - 2026-10-26

Fixes from reviewing the 1.1.1 upgrade of person-ui-v2 (#3). No migration needed.

### Fixed
- Relation and country pickers look like the other inputs: input border in the light theme, no hover fill, and a
  filter's "Any" in the normal text colour (only a placeholder is muted); shared `pickerTriggerClass`.
- Deleting from a detail page puts focus in the list's search box (was the page body), and the list loads once
  without showing the deleted record (the resource's cached lists are dropped as the detail page unmounts).
- `ResourceForm` `confirmLeave` (default true): the gallery's second form does not ask, so two dirty forms no longer
  make react-router warn.

## [1.1.1] - 2026-10-26

Fixes from validating 1.1.0 on a new project (person-ui-v2, #3). No migration needed.

### Fixed
- Deleting from a detail page no longer fetches the deleted record again (404): `ResourceDetail` calls `onDeleted`
  once the page has unmounted.
- After deleting the last row from the row menu, focus goes to the search box instead of the page body
  (`ConfirmDialog` `fallbackFocus`, passed through `useDeleteRecord`).
- A form registers its unsaved-changes blocker only while it has unsaved changes, so a page with two forms (the
  gallery) no longer makes react-router warn.
- Relation and country pickers have a transparent background like the other inputs (they looked disabled in the
  light theme).
- E2E support: `openAs` waits up to 15 s for the OIDC round trip; `expectAccessible` waits for dialog animations; the
  desktop and mobile projects allow 10 s per assertion and 60 s per test.
- Reference specs (`crud-resource` examples): mobile card assertions match the D3 card; waits for the rendered list
  state between quick filter, chip and sort changes.

### Changed
- `crud-ui-init`: also sets the ingress example's API backend, regenerates the app shell screenshots after naming the
  app, and says where the README intro ends.
- `crud-resource`: a related list or test that needs a resource not built yet waits for it; `wiring.md` explains the
  URL-before-render race; the examples README shows the `HOME` lines of `e2e/shell.spec.ts` for a first resource,
  and the sign-in callback test is marked `HOME`.

## [1.1.0] - 2026-10-26

Claude Code tooling (issue #1, step P3). No migration needed.

### Added
- Context7 MCP server in `.mcp.json` (current docs of the stack's libraries); `CLAUDE.md` asks to check it before
  using a library API not yet used in the repo.
- Hook `.claude/hooks/lint.sh`: ESLint on each edited TypeScript file, next to the typecheck.
- Evals in the skill-creator format for the `crud-resource` skill (`.claude/skills/crud-resource/evals/`) and the
  `contract-auditor` agent (`.claude/agents/evals/contract-auditor/`), on fixture contracts in
  `src/test/fixtures/contract/`; README "Skill evals" says how to run them after editing a skill.
- README "Claude Code setup" with the recommended plugins (`frontend-design`, `pr-review-toolkit`, `skill-creator`,
  `spring-boot-template` for API repos).
- `.claude/worktrees/` (Claude Code worktrees, e.g. eval runs) is ignored by git and ESLint; `eslint .` failed on them.

### Changed
- Renovate raises the ranges in `package.json` with each update (`rangeStrategy: bump`), so they name the tested
  minimum instead of moving only the lockfile.

### Fixed
- `contract-auditor` puts the per-resource verdict lines first, with nothing before them (found by its evals).

## [1.0.0] - 2026-10-26

The modern look, the production image and the upgrade path (issue #1, steps D1-P2).

### Added
- Theme tokens in `src/styles/theme.css`: one brand colour (calm blue) with tinted neutrals, layered surfaces in
  light and dark, `success`/`warning`/`info` status colours, radius, shadow and type scales; Inter Variable,
  self-hosted, with tabular numbers in tables and number inputs. Visual rules in `docs/DESIGN.md`.
- Dev-only component gallery at `/__gallery` on the persons/tasks fixtures (no env, API or login; not in the build).
- App shell on the shadcn Sidebar (collapsible to icons, sheet below `lg`, Cmd/Ctrl+B), app mark, breadcrumbs from
  the route and the manifest's `display`, user menu holding language, theme and logout.
- `ResourceList` and `ResourceDetail`: list card with toolbar, record count, active-filter chips, sticky header and a
  row menu for writers; detail with section cards and related lists in cards. `EmptyState` and layout-shaped
  skeletons. Form groups as section cards with a sticky action bar below `md`.
- Manifest: `detail.status` (a badge next to the record name); badge variants `success`, `warning`, `info`.
- `useDeleteRecord`: delete with confirmation shared by list and detail.
- Screenshot tests of every gallery section (`npm run test:visual`, Playwright image, docker or podman) and axe on
  the gallery and every e2e page (`expectAccessible`); CircleCI job `gallery`.
- `ui-reviewer` checks visual quality against `docs/DESIGN.md` and the gallery.
- Production image (`Dockerfile`, unprivileged nginx): runtime configuration in `/config.js` written from container
  environment variables, `/api` proxied to `API_UPSTREAM`, CSP and security headers; `k8s/`, `skaffold.yaml`,
  CircleCI job `image`.
- Blueprint versioning: this changelog, `.blueprint-version` written by `crud-ui-init`, `docs/UPGRADE.md`, the
  `blueprint-upgrade` skill and `scripts/blueprint-upgrade.sh`.
- Renovate (`renovate.json`): grouped weekly updates, automerge of dev dependency patches with green CI;
  `npm audit --audit-level=high` in the CircleCI job `build`.

### Changed
- OIDC settings are read through `src/config.ts` (`/config.js` in the image, `.env.local` in dev).
- `src/api/sources.ts`: every resource is registered and each line also carries `getKey` (the breadcrumbs use it).
- `crud-ui-init` asks for a brand colour, project name and image name.
- orval 8.45 (security fix in its dependencies).

### Removed
- `DetailList`, `LanguageSwitcher` and `ThemeToggle` (replaced by `ResourceDetail` and the user menu).

### Migration
- Rebuild each feature's list and detail pages on `ResourceList` / `ResourceDetail`, following
  `.claude/skills/crud-resource/references/examples/` (a list or detail page is about 35 lines).
- Add `getKey` to every line of `src/api/sources.ts` and register every resource there.
- Read OIDC settings only through `src/config.ts`; set `OIDC_*` and `API_UPSTREAM` for the image (README "Deploy").
- Regenerate the screenshot baselines (`npm run test:visual:update`) and add `expectAccessible` to resource specs.

## [0.9.0] - 2026-10-24

The blueprint before the modern look (also tagged `stable-1.0`): manifest-driven CRUD screens, OIDC login, Polish
and English, the `crud-ui-init` and `crud-resource` skills and the API kickstart. Projects created before versioning
record this version.

[Unreleased]: https://github.com/mmartofel/crud-ui-blueprint/compare/v2.0.2...HEAD
[2.0.2]: https://github.com/mmartofel/crud-ui-blueprint/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/mmartofel/crud-ui-blueprint/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.2.3...v2.0.0
[1.2.3]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.1.3...v1.2.0
[1.1.3]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/mmartofel/crud-ui-blueprint/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/mmartofel/crud-ui-blueprint/releases/tag/v0.9.0
