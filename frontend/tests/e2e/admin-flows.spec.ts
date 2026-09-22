import { expect, test } from "@playwright/test"

test("admin can inspect and search organizations", async ({ page }) => {
  const baseUrl = process.env.BUSOS_E2E_ADMIN_URL
  const username = process.env.BUSOS_E2E_ADMIN_USERNAME
  const password = process.env.BUSOS_E2E_ADMIN_PASSWORD
  test.skip(!baseUrl || !username || !password, "Set the BUSOS_E2E_ADMIN_* variables for a seeded admin environment.")

  await page.goto(`${baseUrl}/login`)
  await page.getByLabel("Username").fill(username || "")
  await page.getByLabel("Password").fill(password || "")
  await page.getByRole("button", { name: "Sign In" }).click()
  await page.goto(`${baseUrl}/organizations`)
  await expect(page.getByRole("heading", { name: "Organizations" })).toBeVisible()

  const search = page.getByPlaceholder("Search organizations...")
  await search.fill(process.env.BUSOS_E2E_ORGANIZATION_QUERY || "a")
  await expect(page.getByRole("table")).toBeVisible()
})
