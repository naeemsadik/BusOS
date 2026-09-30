import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const ownerEmail = process.env.BUSOS_E2E_OWNER_EMAIL
const ownerPassword = process.env.BUSOS_E2E_OWNER_PASSWORD
const storefrontSlug = process.env.BUSOS_E2E_STOREFRONT_SLUG

async function signIn(page: Page) {
  await page.goto("/auth/login")
  await page.getByLabel("Email address").fill(ownerEmail || "")
  await page.getByLabel("Password", { exact: true }).fill(ownerPassword || "")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 })
}

test("CMS builder is accessible and responsive", async ({ page }, testInfo) => {
  test.skip(!ownerEmail || !ownerPassword, "Set the seeded CMS owner credentials.")
  await signIn(page)
  await page.goto("/website")
  await expect(page.getByRole("heading", { name: "Website builder" })).toBeVisible({
    timeout: 15_000,
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width || 0,
  )
  const accessibility = await new AxeBuilder({ page })
    .include("[data-cms-builder]")
    .exclude("[data-sonner-toaster]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath("cms-builder.png"), fullPage: true })
})

test("CMS storefront is accessible and responsive", async ({ page }, testInfo) => {
  test.skip(!storefrontSlug, "Set the seeded storefront slug.")
  await page.goto(`/store/${storefrontSlug}`)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width || 0,
  )
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath("cms-storefront.png"), fullPage: true })
})
