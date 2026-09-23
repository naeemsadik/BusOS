export type Locale = 'en' | 'bn'
export type LocalizedText = { en: string; bn?: string }
export type SectionType = 'announcement' | 'hero' | 'categoryNavigation' | 'productGrid' | 'promotionalBanner' | 'imageText' | 'contactHours'
export interface StorefrontSection { id: string; type: SectionType; visible: boolean; content: { title?: LocalizedText; body?: LocalizedText; imageUrl?: string; imageAlt?: LocalizedText; ctaLabel?: LocalizedText; ctaHref?: string; categories?: string[]; productLimit?: number; productSort?: 'newest' | 'name' | 'priceAsc' | 'priceDesc'; imagePosition?: 'left' | 'right'; hours?: LocalizedText } }
export interface StorefrontDocument { version: 1; header: { logoUrl?: string; showCatalog: boolean; showCart: boolean }; footer: { text: LocalizedText; showContact: boolean }; sections: StorefrontSection[] }
export interface StorefrontSite {
  id?: string; slug: string; name?: string; logo?: string; status?: 'draft' | 'published' | 'inactive'; enabledLocales: Locale[]; defaultLocale: Locale;
  themeTokens: { primary: string; accent: string; font: 'manrope' | 'noto-sans-bengali' | 'system'; radius: '0px' | '8px' | '12px' | '16px' };
  seoSettings: { title: LocalizedText; description: LocalizedText; socialImageUrl?: string };
  orderSettings: { deliveryFee: number; phone: string; email?: string; address?: LocalizedText };
  draftDocument?: StorefrontDocument; document?: StorefrontDocument; draftVersion?: number; publishedVersion?: number; publishedAt?: string
}
export interface StorefrontAsset { id: string; url: string; mimeType: string; size: number; width: number; height: number; sortOrder: number; altTextEn: string; altTextBn?: string }
export interface StorefrontProduct { id: string; slug: string; name: string; nameBn?: string; description?: string; descriptionBn?: string; longDescription?: string; longDescriptionBn?: string; category: string; price: number; image?: string; imageAltText?: string; imageAltTextBn?: string; available: boolean; createdAt?: string }
export interface StorefrontReceipt { id: string; orderNumber: string; status: string; subtotal: number; taxAmount: number; shippingAmount: number; total: number; locale: Locale; confirmationToken?: string }
export const localize = (value: LocalizedText | undefined, locale: Locale) => value?.[locale] || value?.en || ''
