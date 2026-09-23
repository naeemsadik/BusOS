import { api } from './api'
import type { StorefrontAsset, StorefrontDocument, StorefrontProduct, StorefrontReceipt, StorefrontSite } from './storefront-types'

export const storefrontService = {
  async getCms(): Promise<StorefrontSite | null> { return (await api.get('/storefront/cms')).data },
  async slugAvailability(slug: string): Promise<{ slug: string; available: boolean }> { return (await api.get('/storefront/cms/slug-availability', { params: { slug } })).data },
  async create(slug: string): Promise<StorefrontSite> { return (await api.post('/storefront/cms', { slug })).data },
  async save(site: StorefrontSite, document: StorefrontDocument): Promise<StorefrontSite> {
    return (await api.put('/storefront/cms/draft', { expectedVersion: site.draftVersion, enabledLocales: site.enabledLocales, defaultLocale: site.defaultLocale, themeTokens: site.themeTokens, seoSettings: site.seoSettings, orderSettings: site.orderSettings, document })).data
  },
  async publish(): Promise<StorefrontSite> { return (await api.post('/storefront/cms/publish')).data },
  async assets(): Promise<StorefrontAsset[]> { return (await api.get('/storefront/cms/assets')).data },
  async upload(file: File, altTextEn: string, altTextBn?: string): Promise<StorefrontAsset> { const data = new FormData(); data.append('file', file); data.append('altTextEn', altTextEn); if (altTextBn) data.append('altTextBn', altTextBn); return (await api.post('/storefront/cms/assets', data, { headers: { 'Content-Type': 'multipart/form-data' } })).data },
  async updateAsset(asset: StorefrontAsset): Promise<StorefrontAsset> { return (await api.patch(`/storefront/cms/assets/${asset.id}`, { altTextEn: asset.altTextEn, altTextBn: asset.altTextBn, sortOrder: asset.sortOrder })).data },
  async deleteAsset(id: string): Promise<void> { await api.delete(`/storefront/cms/assets/${id}`) },
  async publicSite(slug: string): Promise<StorefrontSite> { return (await api.get(`/storefront/public/${encodeURIComponent(slug)}`)).data },
  async categories(slug: string): Promise<string[]> { return (await api.get(`/storefront/public/${encodeURIComponent(slug)}/categories`)).data },
  async products(slug: string, params: Record<string, string | number | undefined> = {}): Promise<{ data: StorefrontProduct[]; total: number; page: number; totalPages: number }> { return (await api.get(`/storefront/public/${encodeURIComponent(slug)}/products`, { params })).data },
  async product(slug: string, productSlug: string): Promise<StorefrontProduct> { return (await api.get(`/storefront/public/${encodeURIComponent(slug)}/products/${encodeURIComponent(productSlug)}`)).data },
  async order(slug: string, data: unknown, idempotencyKey: string): Promise<StorefrontReceipt> { return (await api.post(`/storefront/public/${encodeURIComponent(slug)}/orders`, data, { headers: { 'Idempotency-Key': idempotencyKey } })).data },
  async confirmation(slug: string, token: string): Promise<StorefrontReceipt> { return (await api.get(`/storefront/public/${encodeURIComponent(slug)}/orders/confirmation/${encodeURIComponent(token)}`)).data },
}
