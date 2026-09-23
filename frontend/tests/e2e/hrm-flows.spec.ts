import { expect, test, type Page } from "@playwright/test"

const ownerEmail = process.env.BUSOS_E2E_OWNER_EMAIL
const ownerPassword = process.env.BUSOS_E2E_OWNER_PASSWORD
const staffEmail = process.env.BUSOS_E2E_STAFF_EMAIL
const staffPassword = process.env.BUSOS_E2E_STAFF_PASSWORD

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/login")
  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/)
}

test.describe("HRM owner workspace", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set the seeded owner E2E credentials.")

  test("loads management areas at every configured viewport and locale", async ({ page }) => {
    await signIn(page, ownerEmail!, ownerPassword!)
    await page.goto("/hrm")

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("tablist")).toBeVisible()
    await expect(page.getByRole("tab")).toHaveCount(4)
  })
})

test.describe("HRM employee self-service", () => {
  test.skip(!staffEmail || !staffPassword, "Set linked staff E2E credentials.")

  test("shows attendance actions without compensation details", async ({ page }) => {
    await signIn(page, staffEmail!, staffPassword!)
    await page.goto("/hrm/my-attendance")

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("button").first()).toBeVisible()
    await expect(page.getByText(/salary|payroll/i)).toHaveCount(0)
  })
})
