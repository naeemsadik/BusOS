import { defineConfig, devices } from "@playwright/test"

const viewports = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "wide-1536", width: 1536, height: 960 },
]

const projects = viewports.flatMap(({ name, width, height }) =>
  (["en", "bn"] as const).flatMap(locale =>
    (["light", "dark"] as const).map(colorScheme => ({
      name: `${name}-${locale}-${colorScheme}`,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width, height },
        colorScheme,
        extraHTTPHeaders: { Cookie: `BUSOS_LOCALE=${locale}` },
      },
      metadata: { locale, colorScheme },
    })),
  ),
)

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: process.env.BUSOS_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects,
})
