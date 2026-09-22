import { expect, test, type Page } from "@playwright/test"

const ownerEmail = process.env.BUSOS_E2E_OWNER_EMAIL
const ownerPassword = process.env.BUSOS_E2E_OWNER_PASSWORD
const runMutations = process.env.BUSOS_E2E_MUTATIONS === "true"

async function signIn(page: Page) {
  await page.goto("/auth/login")
  await page.getByLabel("Email address").fill(ownerEmail || "")
  await page.getByLabel("Password").fill(ownerPassword || "")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/)
}

test.describe("seeded owner workflows", () => {
  test.skip(!ownerEmail || !ownerPassword, "Set BUSOS_E2E_OWNER_EMAIL and BUSOS_E2E_OWNER_PASSWORD.")

  test.beforeEach(async ({ page }) => signIn(page))

  test("owner can reach POS, inventory, orders, and storefront publishing", async ({ page }) => {
    for (const path of ["/pos", "/inventory", "/orders", "/website"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    }
  })

  test("seeded POS sale", async ({ page }) => {
    test.skip(!runMutations, "Set BUSOS_E2E_MUTATIONS=true to permit seeded write operations.")
    await page.goto("/pos")
    await page.getByRole("button", { name: /^Add / }).first().click()
    await expect(page.getByText(/Cart/).first()).toBeVisible()
  })

  test("seeded inventory edit", async ({ page }) => {
    test.skip(!runMutations, "Set BUSOS_E2E_MUTATIONS=true to permit seeded write operations.")
    await page.goto("/inventory")
    await page.getByRole("button", { name: /Actions/ }).first().click()
    await page.getByRole("menuitem", { name: "Edit" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("storefront publication and owner order confirmation", async ({ page }) => {
    test.skip(!runMutations, "Set BUSOS_E2E_MUTATIONS=true to permit seeded write operations.")
    await page.goto("/website")
    await page.getByRole("button", { name: "Publish" }).click()
    await page.goto("/orders")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})

test("public storefront supports browsing in both languages", async ({ page }) => {
  const slug = process.env.BUSOS_E2E_STOREFRONT_SLUG
  test.skip(!slug, "Set BUSOS_E2E_STOREFRONT_SLUG to a published seeded storefront.")
  await page.goto(`/store/${slug}`)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.getByRole("link", { name: "বাংলা" }).click()
  await expect(page).toHaveURL(/locale=bn/)
})

test("guest can place a delivery-only cash-on-delivery order", async ({ page }) => {
  const slug = process.env.BUSOS_E2E_STOREFRONT_SLUG
  test.skip(!slug || !runMutations, "Set a seeded storefront slug and BUSOS_E2E_MUTATIONS=true.")
  await page.goto(`/store/${slug}`)
  await page.getByRole("button", { name: /^Add / }).first().click()
  await page.getByLabel("Name").fill("E2E Customer")
  await page.getByLabel("Phone").fill("01700000000")
  await page.getByLabel("Address").fill("Seeded delivery address")
  await page.getByRole("button", { name: "Place cash-on-delivery order" }).click()
  await expect(page.getByText("Order received").first()).toBeVisible()
})
