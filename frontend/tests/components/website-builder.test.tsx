import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebsiteBuilder } from '@/features/storefront/website-builder'
import type { StorefrontSite } from '@/lib/storefront-types'

const mocks = vi.hoisted(() => ({
  getCms: vi.fn(),
  assets: vi.fn(),
  upload: vi.fn(),
  getProducts: vi.fn(),
}))

vi.mock('@/lib/storefront-service', () => ({
  storefrontService: {
    getCms: mocks.getCms,
    assets: mocks.assets,
    upload: mocks.upload,
  },
}))

vi.mock('@/lib/inventory-service', () => ({
  inventoryService: { getProducts: mocks.getProducts },
}))

const site: StorefrontSite = {
  id: 'site-1',
  slug: 'test-store',
  name: 'Test Store',
  status: 'published',
  enabledLocales: ['en'],
  defaultLocale: 'en',
  themeTokens: { primary: '#0f766e', accent: '#f59e0b', font: 'system', radius: '8px' },
  seoSettings: { title: { en: 'Test Store' }, description: { en: 'Description' } },
  orderSettings: { deliveryFee: 0, phone: '' },
  draftVersion: 1,
  draftDocument: {
    version: 1,
    header: { showCatalog: true, showCart: true },
    footer: { text: { en: 'Footer' }, showContact: true },
    sections: [{ id: 'image-text', type: 'imageText', visible: true, content: { title: { en: 'Our story' }, body: { en: 'About us' } } }],
  },
}

describe('WebsiteBuilder image sections', () => {
  beforeEach(() => {
    mocks.getCms.mockResolvedValue(site)
    mocks.assets.mockResolvedValue([])
    mocks.getProducts.mockResolvedValue({ data: [] })
    mocks.upload.mockResolvedValue({ id: 'asset-1', url: '/uploads/story.webp', mimeType: 'image/webp', size: 100, width: 800, height: 600, sortOrder: 0, altTextEn: 'store story' })
  })

  it('uploads a local image and selects it for an Image & text section', async () => {
    render(<WebsiteBuilder />)
    fireEvent.click(await screen.findByRole('button', { name: 'Image & text' }))
    const file = new File(['image'], 'store-story.webp', { type: 'image/webp' })
    fireEvent.change(screen.getByLabelText('Upload from device'), { target: { files: [file] } })

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(file, 'store story', undefined))
    const selectedImages = await screen.findAllByRole('img', { name: 'store story' })
    expect(selectedImages).toHaveLength(2)
    selectedImages.forEach(image => expect(image).toHaveAttribute('src', '/uploads/story.webp'))
  })
})
