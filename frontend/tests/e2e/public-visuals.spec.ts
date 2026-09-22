import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "system"))
})

test("marketing and authentication surfaces are accessible and do not overflow", async ({ page }, testInfo) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

  const viewportWidth = page.viewportSize()?.width || 0
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth)

  const accessibility = await new AxeBuilder({ page }).exclude("[data-sonner-toaster]").analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath("marketing.png"), fullPage: true })

  await page.goto("/auth/login")
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true })
})

test("registration reports validation errors without contacting the backend", async ({ page }) => {
  await page.goto("/auth/register")
  await page.getByLabel("First Name").fill("A")
  await page.getByLabel("Last Name").fill("Owner")
  await page.getByLabel("Email address").fill("not-an-email")
  await page.getByLabel("Password", { exact: true }).fill("short")
  await page.getByLabel("Confirm Password").fill("different")
  await page.getByLabel(/Organization Name/).fill("Test Store")
  await page.getByRole("button", { name: "Create Organization Account" }).click()

  await expect(page.getByText("Please enter a valid email address")).toBeVisible()
  await expect(page.getByText("Password must be at least 8 characters")).toBeVisible()
})
