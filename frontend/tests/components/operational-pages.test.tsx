import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getCustomers: vi.fn(),
  getDeliveries: vi.fn(),
  getOrders: vi.fn(),
  getCourierProviders: vi.fn(),
  toast: vi.fn(),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    key === "title" ? "Point of sale" : key === "items" ? `${values?.count ?? 0} items` : key,
}))
vi.mock("@/components/permission-guard-page", () => ({ default: ({ children }: { children: React.ReactNode }) => children }))
vi.mock("@/contexts/currency-context", () => ({ useCurrency: () => ({ formatCurrency: (value: number) => `BDT ${value}` }) }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock("@/components/pos", () => ({ CustomerDetails: () => null, DeliveryOptions: () => null }))
vi.mock("@/components/voice/voice-command-dialog", () => ({ VoiceCommandDialog: () => null }))
vi.mock("@/lib/inventory-service", () => ({ inventoryService: { getProducts: mocks.getProducts } }))
vi.mock("@/lib/customers-service", () => ({ customersService: { getCustomers: mocks.getCustomers } }))
vi.mock("@/lib/delivery-service", () => ({
  deliveryService: {
    getDeliveries: mocks.getDeliveries,
    getAvailableCourierProviders: mocks.getCourierProviders,
  },
}))
vi.mock("@/lib/orders-service", () => ({ ordersService: { getOrders: mocks.getOrders } }))
vi.mock("@/lib/pos-service", () => ({ posService: {} }))
vi.mock("@/lib/invoices-service", () => ({ invoicesService: {} }))
vi.mock("@/lib/paperfly-sync-service", () => ({
  paperflySyncService: { isAutoSyncActive: () => true, startAutoSync: vi.fn(), performSync: vi.fn() },
}))

import DeliveryPage from "@/app/(protected)/delivery/page"
import { POSPage } from "@/features/pos/pos-page"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("operational pages", () => {
  it("shows sellable products on the POS page", async () => {
    mocks.getProducts.mockResolvedValue({
      data: [{
        id: "product-1",
        name: "Test product",
        category: "General",
        price: 100,
        cost: 50,
        stock: 5,
        minStock: 1,
        maxStock: 10,
        status: "active",
      }],
    })
    mocks.getCustomers.mockRejectedValue(new Error("optional customer request failed"))

    render(<POSPage />)

    expect(await screen.findAllByText("Test product")).not.toHaveLength(0)
    expect(screen.getByRole("heading", { name: "Point of sale" })).toBeVisible()
  })

  it("renders the Delivery page when the tenant has no deliveries", async () => {
    mocks.getDeliveries.mockResolvedValue({ deliveries: [], total: 0, page: 1, totalPages: 0 })
    mocks.getOrders.mockResolvedValue({ orders: [] })
    mocks.getCourierProviders.mockRejectedValue(new Error("optional courier request failed"))

    render(<DeliveryPage />)

    expect(await screen.findByRole("heading", { name: "Delivery Management" })).toBeVisible()
    await waitFor(() => expect(mocks.getDeliveries).toHaveBeenCalledOnce())
    expect(screen.getByText("Total Deliveries")).toBeVisible()
    expect(screen.getByText("No deliveries match this view.")).toBeVisible()
  })
})
