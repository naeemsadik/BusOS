import { describe, expect, it } from "vitest"
import { writeLocaleCookie } from "@/components/locale-toggle"

describe("locale switching", () => {
  it("persists English and Bangla choices for server rendering", () => {
    const target = { cookie: "" }
    writeLocaleCookie("bn", target)
    expect(target.cookie).toContain("BUSOS_LOCALE=bn")
    expect(target.cookie).toContain("samesite=lax")

    writeLocaleCookie("en", target)
    expect(target.cookie).toContain("BUSOS_LOCALE=en")
  })
})
