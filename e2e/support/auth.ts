import { expect, type Page } from '@playwright/test'

// The two e2e users come from .env.local (see .env.example): one with the write role, one with only the read role.
export type TestUser = 'writer' | 'reader'

function credentials(user: TestUser) {
  const prefix = user === 'writer' ? 'E2E_WRITER' : 'E2E_READER'
  const username = process.env[`${prefix}_USER`]
  const password = process.env[`${prefix}_PASSWORD`]
  if (!username || !password) throw new Error(`Set ${prefix}_USER and ${prefix}_PASSWORD in .env.local`)
  return { username, password }
}

/**
 * Where the app runs: the dev server by default, or a deployed UI (`E2E_BASE_URL=https://ui.example.com`); the
 * config's `baseURL` is the same value.
 */
export const appOrigin = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:5173').origin

/**
 * The OIDC realm as the browser sees it: `E2E_OIDC_AUTHORITY`, else `VITE_OIDC_AUTHORITY`. A path (`/realms/orders`,
 * a realm proxied on the UI's own host) is taken relative to the app.
 */
const authority = new URL(process.env.E2E_OIDC_AUTHORITY ?? process.env.VITE_OIDC_AUTHORITY ?? '/\0', appOrigin).href

/** The OIDC provider's login page (Keycloak: `/realms/<realm>/protocol/openid-connect/auth`). */
export const isLoginPage = (url: URL) => url.href.startsWith(authority)

/** A page of the app after sign-in: not the provider's (which may share the app's host) and not the callback. */
export const isAppPage = (url: URL) => url.origin === appOrigin && !isLoginPage(url) && !url.searchParams.has('code')

/** Fills the provider's login form (Keycloak's labels, in English or Polish) as `user`. */
export async function fillLoginForm(page: Page, user: TestUser) {
  const { username, password } = credentials(user)
  await page.getByRole('textbox', { name: /username|nazwa użytkownika/i }).fill(username)
  await page.getByRole('textbox', { name: /password|hasło/i }).fill(password)
  await page.getByRole('button', { name: /sign in|logowanie/i }).click()
}

/** Opens `path` and signs in through the login form. */
export async function loginAs(page: Page, user: TestUser, path = '/') {
  await page.goto(path)
  await page.waitForURL(isLoginPage)
  await fillLoginForm(page, user)
  await page.waitForURL(isAppPage)
  await expect(page.getByRole('banner')).toBeVisible()
}

/** Saved browser state of a signed-in user, written by `e2e/auth.setup.ts`. */
export const authFile = (user: TestUser) => `e2e/.auth/${user}.json`

/**
 * Opens `path` as the user whose storage state the test uses. The app keeps its tokens in sessionStorage, which
 * storage state does not save, but the provider's session cookie is saved: it redirects back without the form.
 */
export async function openAs(page: Page, path = '/') {
  await page.goto(path)
  await page.waitForURL(isAppPage)
  // waitForURL can pass before the redirect to the provider starts, so this wait covers the whole round trip
  // (provider redirect, code exchange): slower than the default 5 s under the full parallel suite.
  await expect(page.getByRole('banner')).toBeVisible({ timeout: 15_000 })
}
