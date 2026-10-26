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

[Unreleased]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.1.2...HEAD
[1.1.2]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/mmartofel/crud-ui-blueprint/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/mmartofel/crud-ui-blueprint/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/mmartofel/crud-ui-blueprint/releases/tag/v0.9.0
