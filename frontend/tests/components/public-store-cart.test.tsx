import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicStore } from "@/components/storefront/public-store";
import type { StorefrontProduct, StorefrontSite } from "@/lib/storefront-types";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  product: vi.fn(),
}));
const storedValues = new Map<string, string>();
const testStorage = {
  clear: () => storedValues.clear(),
  getItem: (key: string) => storedValues.get(key) ?? null,
  key: (index: number) => [...storedValues.keys()][index] ?? null,
  removeItem: (key: string) => storedValues.delete(key),
  setItem: (key: string, value: string) => storedValues.set(key, value),
  get length() {
    return storedValues.size;
  },
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/store/demo/products/new-item",
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/storefront-service", () => ({
  storefrontService: { product: mocks.product },
}));

const site: StorefrontSite = {
  slug: "demo",
  name: "Demo store",
  enabledLocales: ["en"],
  defaultLocale: "en",
  themeTokens: {
    primary: "#0f766e",
    accent: "#f59e0b",
    font: "system",
    radius: "8px",
  },
  seoSettings: { title: { en: "Demo" }, description: { en: "Demo" } },
  orderSettings: { deliveryFee: 60 },
};

const newProduct: StorefrontProduct = {
  id: "new-product",
  slug: "new-item",
  name: "New item",
  category: "Demo",
  price: 100,
  available: true,
};

describe("PublicStore cart persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", testStorage);
    localStorage.clear();
    mocks.push.mockReset();
    mocks.product.mockReset();
  });

  it("does not let delayed cart hydration overwrite a newly added product", async () => {
    let finishHydration!: (product: StorefrontProduct) => void;
    mocks.product.mockReturnValue(
      new Promise<StorefrontProduct>((resolve) => {
        finishHydration = resolve;
      }),
    );
    localStorage.setItem(
      "busos-cart:demo",
      JSON.stringify({
        savedAt: Date.now(),
        lines: [{ productId: "stored-product", quantity: 2 }],
      }),
    );

    render(
      <PublicStore
        site={site}
        products={[newProduct]}
        product={newProduct}
        locale="en"
        path={["products", "new-item"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(screen.getByRole("link", { name: "Cart (1)" })).toBeVisible();

    finishHydration({ ...newProduct, id: "stored-product", name: "Stored item" });
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Cart (1)" })).toBeVisible();
    });
  });
});
