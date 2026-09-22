import { fireEvent, render, screen } from "@testing-library/react"
import { Package } from "lucide-react"
import { describe, expect, it, vi } from "vitest"
import { DataState, MetricCard, PageHeader, PageSkeleton, StatusBadge } from "@/components/ui/page-primitives"

describe("shared page primitives", () => {
  it("exposes the page hierarchy and actions", () => {
    render(<PageHeader eyebrow="Catalog" title="Inventory" description="Manage stock" actions={<button>Export</button>} />)

    expect(screen.getByRole("heading", { name: "Inventory", level: 1 })).toBeInTheDocument()
    expect(screen.getByText("Manage stock")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled()
  })

  it("renders locale-ready metrics and semantic status without icon noise", () => {
    render(<><MetricCard label="মোট পণ্য" value="১,২৫০" detail="আজ" icon={Package} /><StatusBadge tone="success">সক্রিয়</StatusBadge></>)

    expect(screen.getByText("মোট পণ্য")).toBeVisible()
    expect(screen.getByText("১,২৫০")).toBeVisible()
    expect(screen.getByText("সক্রিয়")).toBeVisible()
    expect(document.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("provides actionable empty and error states", () => {
    const retry = vi.fn()
    const { rerender } = render(<DataState kind="empty" title="No orders" description="Orders will appear here." />)
    expect(screen.getByRole("heading", { name: "No orders" })).toBeVisible()

    rerender(<DataState kind="error" title="Could not load" description="Try again." actionLabel="Retry" onAction={retry} />)
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it("announces loading state", () => {
    render(<PageSkeleton />)
    expect(screen.getByRole("status", { name: "Loading content" })).toBeInTheDocument()
  })
})
