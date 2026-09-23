import type { StorefrontProduct, StorefrontReceipt, StorefrontSite } from './storefront-types'

export class StorefrontApiError extends Error { constructor(public status: number, public payload: any) { super(payload?.message || 'Storefront request failed') } }
const backend = () => process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
async function request<T>(path: string, slug: string): Promise<T> {
  const response = await fetch(`${backend()}${path}`, { next: { revalidate: 60, tags: [`storefront:${slug}`] } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new StorefrontApiError(response.status, payload)
  return payload
}
export const storefrontServer = {
  site: (slug: string) => request<StorefrontSite>(`/storefront/public/${encodeURIComponent(slug)}`, slug),
  products: (slug: string, query = '') => request<{ data: StorefrontProduct[]; total: number; page: number; totalPages: number }>(`/storefront/public/${encodeURIComponent(slug)}/products${query}`, slug),
  product: (slug: string, productSlug: string) => request<StorefrontProduct>(`/storefront/public/${encodeURIComponent(slug)}/products/${encodeURIComponent(productSlug)}`, slug),
  confirmation: (slug: string, token: string) => request<StorefrontReceipt>(`/storefront/public/${encodeURIComponent(slug)}/orders/confirmation/${encodeURIComponent(token)}`, slug),
}
