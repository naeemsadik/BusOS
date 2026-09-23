import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StorefrontRenderer } from '@/components/storefront/storefront-renderer'
import type { StorefrontDocument, StorefrontSite } from '@/lib/storefront-types'

const site: StorefrontSite = {
  slug: 'test-store', name: 'Test Store', enabledLocales: ['en', 'bn'], defaultLocale: 'en',
  themeTokens: { primary: '#0f766e', accent: '#f59e0b', font: 'system', radius: '8px' },
  seoSettings: { title: { en: 'Test Store' }, description: { en: 'Description' } },
  orderSettings: { deliveryFee: 60, phone: '01700000000' },
}

const storefrontDocument: StorefrontDocument = {
  version: 1,
  header: { showCatalog: true, showCart: true },
  footer: { text: { en: 'Visit again' }, showContact: true },
  sections: [
    { id: 'hero', type: 'hero', visible: true, content: { title: { en: 'English fallback' }, body: { en: '<script>alert(1)</script>' }, ctaHref: '/catalog', ctaLabel: { en: 'Shop' } } },
    { id: 'products', type: 'productGrid', visible: true, content: { title: { en: 'Products' } } },
  ],
}

describe('StorefrontRenderer', () => {
  it('uses English fallback content without interpreting structured text as HTML', () => {
    const { container } = render(<StorefrontRenderer site={site} document={storefrontDocument} products={[]} locale="bn" />)
    expect(screen.getByRole('heading', { name: 'English fallback' })).toBeVisible()
    expect(screen.getByText('<script>alert(1)</script>')).toBeVisible()
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/')
  })

  it('announces unavailable products and retains localized image alternatives', () => {
    render(<StorefrontRenderer site={site} document={storefrontDocument} locale="bn" products={[{ id: 'p1', slug: 'tea', name: 'Tea', nameBn: 'চা', category: 'Drinks', price: 125, image: '/tea.png', imageAltText: 'Tea packet', imageAltTextBn: 'চায়ের প্যাকেট', available: false }]} />)
    expect(screen.getByRole('img', { name: 'চায়ের প্যাকেট' })).toBeVisible()
    expect(screen.getByText('স্টক নেই')).toBeVisible()
  })

  it('automatically sorts and limits products using the product grid settings', () => {
    const document = {
      ...storefrontDocument,
      sections: storefrontDocument.sections.map(section => section.type === 'productGrid'
        ? { ...section, content: { ...section.content, productLimit: 1, productSort: 'priceAsc' as const } }
        : section),
    }
    render(<StorefrontRenderer site={site} document={document} locale="en" products={[
      { id: 'expensive', slug: 'expensive', name: 'Expensive', category: 'Test', price: 200, available: true },
      { id: 'affordable', slug: 'affordable', name: 'Affordable', category: 'Test', price: 50, available: true },
    ]} />)
    expect(screen.getByText('Affordable')).toBeVisible()
    expect(screen.queryByText('Expensive')).not.toBeInTheDocument()
  })
})
