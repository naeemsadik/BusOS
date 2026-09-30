import { expect, test, type Page } from '@playwright/test'

const ownerEmail = process.env.BUSOS_E2E_OWNER_EMAIL || 'cms.demo.owner@busos.local'
const ownerPassword = process.env.BUSOS_E2E_OWNER_PASSWORD || 'DemoCMS!2026'
const isolationEmail = process.env.BUSOS_E2E_ISOLATION_EMAIL || 'cms.isolation.owner@busos.local'
const isolationPassword = process.env.BUSOS_E2E_ISOLATION_PASSWORD || 'DemoCMS!2026'

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 })
}

test('owner can open every major BusOS workspace', async ({ page }) => {
  await signIn(page, ownerEmail, ownerPassword)
  const routes = [
    '/dashboard', '/pos', '/inventory', '/customers', '/suppliers', '/orders',
    '/delivery', '/expenses', '/reports', '/hrm', '/sms', '/social-content',
    '/website', '/settings', '/profile', '/subscription',
  ]

  for (const route of routes) {
    await test.step(`Open ${route}`, async () => {
      await page.goto(route)
      await expect(page).not.toHaveURL(/\/auth\/login/)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30_000 })
    })
  }
})

test('second tenant cannot see the demo organization inventory', async ({ page }) => {
  await signIn(page, isolationEmail, isolationPassword)
  await page.goto('/inventory')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Premium Rice 5kg', { exact: true })).toHaveCount(0)
})

test('external provider simulator exposes deterministic success and failure', async ({ request }) => {
  const base = process.env.BUSOS_MOCK_PROVIDER_URL || 'http://127.0.0.1:5199'
  const success = await request.post(`${base}/provider/success`, { data: { test: true } })
  expect(success.ok()).toBe(true)
  expect((await success.json()).status).toBe('success')

  const failure = await request.post(`${base}/provider/failure`, { data: { test: true } })
  expect(failure.status()).toBe(503)
  expect((await failure.json()).status).toBe('failed')
})
