import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from "@/lib/api"
import { hrmService } from "@/lib/hrm-service"

describe("HRM service routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: {} })
    vi.mocked(api.patch).mockResolvedValue({ data: {} })
    vi.mocked(api.post).mockResolvedValue({ data: {} })
  })

  it("uses the authenticated self-service clock endpoint", async () => {
    await hrmService.clockIn()

    expect(api.post).toHaveBeenCalledWith("/hrm/attendance/clock-in")
  })

  it("creates an information-only calendar-month payroll run", async () => {
    await hrmService.generatePayroll(2026, 9)

    expect(api.post).toHaveBeenCalledWith("/hrm/payroll/runs", { year: 2026, month: 9 })
  })

  it("records paid status without calling a payment provider", async () => {
    await hrmService.markPayrollPaid("run-1", {
      paidAt: "2026-09-30",
      paymentReference: "MANUAL-REFERENCE",
    })

    expect(api.post).toHaveBeenCalledOnce()
    expect(api.post).toHaveBeenCalledWith("/hrm/payroll/runs/run-1/mark-paid", {
      paidAt: "2026-09-30",
      paymentReference: "MANUAL-REFERENCE",
    })
    expect(vi.mocked(api.post).mock.calls.flat().join(" ")).not.toMatch(/gateway|transfer|payment-provider/i)
  })
})
