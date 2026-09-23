export type StorefrontLocale = 'en' | 'bn';
export interface LocalizedText { en: string; bn?: string }
export interface StorefrontThemeTokens { primary: string; accent: string; font: 'manrope' | 'noto-sans-bengali' | 'system'; radius: '0px' | '8px' | '12px' | '16px' }
export interface StorefrontSeoSettings { title: LocalizedText; description: LocalizedText; socialImageUrl?: string }
export interface StorefrontOrderSettings { deliveryFee: number; phone: string; email?: string; address?: LocalizedText }
export type StorefrontSectionType = 'announcement' | 'hero' | 'categoryNavigation' | 'productGrid' | 'promotionalBanner' | 'imageText' | 'contactHours';
export interface StorefrontSection {
  id: string; type: StorefrontSectionType; visible: boolean;
  content: {
    title?: LocalizedText; body?: LocalizedText; imageUrl?: string; imageAlt?: LocalizedText;
    ctaLabel?: LocalizedText; ctaHref?: string; categories?: string[]; productLimit?: number;
    productSort?: 'newest' | 'name' | 'priceAsc' | 'priceDesc'; imagePosition?: 'left' | 'right'; hours?: LocalizedText;
  };
}
export interface StorefrontDocument {
  version: 1;
  header: { logoUrl?: string; showCatalog: boolean; showCart: boolean };
  footer: { text: LocalizedText; showContact: boolean };
  sections: StorefrontSection[];
}
export const DEFAULT_THEME: StorefrontThemeTokens = { primary: '#0f766e', accent: '#f59e0b', font: 'manrope', radius: '12px' };
export const DEFAULT_SEO: StorefrontSeoSettings = { title: { en: 'Online store' }, description: { en: 'Browse our latest products.' } };
export const DEFAULT_STOREFRONT_DOCUMENT: StorefrontDocument = {
  version: 1,
  header: { showCatalog: true, showCart: true },
  footer: { text: { en: 'Thank you for visiting.' }, showContact: true },
  sections: [
    { id: 'hero', type: 'hero', visible: true, content: { title: { en: 'Welcome to our store' }, body: { en: 'Discover our latest products.' }, ctaLabel: { en: 'Shop now' }, ctaHref: '/catalog' } },
    { id: 'products', type: 'productGrid', visible: true, content: { title: { en: 'Featured products' }, productLimit: 8, productSort: 'newest' } },
  ],
};
