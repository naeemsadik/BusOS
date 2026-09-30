export type Locale = "en" | "bn";
export type LocalizedText = { en: string; bn?: string };
export type SectionType =
  | "announcement"
  | "hero"
  | "categoryNavigation"
  | "productGrid"
  | "promotionalBanner"
  | "imageText"
  | "contactHours";
export interface StorefrontSection {
  id: string;
  type: SectionType;
  visible: boolean;
  content: {
    title?: LocalizedText;
    body?: LocalizedText;
    imageUrl?: string;
    imageAlt?: LocalizedText;
    ctaLabel?: LocalizedText;
    ctaHref?: string;
    categories?: string[];
    productLimit?: number;
    productSort?: "newest" | "name" | "priceAsc" | "priceDesc";
    imagePosition?: "left" | "right";
    hours?: LocalizedText;
  };
}
export interface StorefrontDocument {
  version: 1;
  header: { logoUrl?: string; showCatalog: boolean; showCart: boolean };
  footer: { text: LocalizedText; showContact: boolean };
  sections: StorefrontSection[];
}
export interface StorefrontSite {
  id?: string;
  slug: string;
  name?: string;
  logo?: string;
  state?:
    | "live"
    | "coming_soon"
    | "closed"
    | "suspended"
    | "not_found"
    | "redirect";
  status?: "draft" | "published" | "unpublished" | "inactive";
  enabledLocales: Locale[];
  defaultLocale: Locale;
  aiEnabled?: boolean;
  themeTokens: {
    primary: string;
    accent: string;
    font: "manrope" | "noto-sans-bengali" | "system";
    radius: "0px" | "8px" | "12px" | "16px";
  };
  seoSettings: {
    title: LocalizedText;
    description: LocalizedText;
    socialImageUrl?: string;
  };
  orderSettings: {
    deliveryFee: number;
    phone: string;
    email?: string;
    address?: LocalizedText;
  };
  draftDocument?: StorefrontDocument;
  document?: StorefrontDocument;
  draftVersion?: number;
  publishedVersion?: number;
  publishedAt?: string;
  orderingEnabled?: boolean;
  ordering?: { enabled: boolean; message?: Partial<Record<Locale, string>> };
  draftSettings?: Record<string, any>;
  publishedSettings?: Record<string, any>;
  settingsVersion?: number;
  setupProgress?: Record<string, boolean>;
  navigation?: Array<{
    slug: string;
    label: Partial<Record<Locale, string>>;
    pageType: StorefrontPageType;
  }>;
}
export type StorefrontPageType =
  | "home"
  | "about"
  | "contact"
  | "promotion"
  | "landing"
  | "delivery"
  | "faq"
  | "custom";
export type StorefrontPageStatus = "draft" | "published" | "archived";
export interface StorefrontPage {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  pageType: StorefrontPageType;
  status: StorefrontPageStatus;
  isHomePage: boolean;
  includeInNavigation: boolean;
  navigationLabel: Partial<Record<Locale, string>>;
  navigationOrder: number;
  enabledLocales: Locale[];
  seoSettings: StorefrontSite["seoSettings"];
  draftDocument: StorefrontDocument;
  publishedDocument?: StorefrontDocument;
  draftVersion: number;
  publishedVersion?: number;
  publishedAt?: string;
  updatedAt: string;
  lifecycleStatus?: "draft" | "published" | "unpublished";
  deletedAt?: string;
  purgeAfter?: string;
}
export interface StorefrontPageRevision {
  id: string;
  version: number;
  origin: "manual" | "template" | "ai" | "restore";
  authorId?: string;
  createdAt: string;
}
export interface StorefrontReviewIssue {
  severity: "mustFix" | "recommended" | "information";
  code: string;
  message: string;
  sectionId?: string;
  field?: string;
}
export interface StorefrontAiSuggestion {
  currentValue: string;
  suggestion: string;
  suggestionId: string;
  aiGenerated: boolean;
  fallbackReason?: string;
  requiresAcceptance: boolean;
  sourceLocale?: Locale;
  targetLocale?: Locale;
}
export interface StorefrontAsset {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  sortOrder: number;
  altTextEn: string;
  altTextBn?: string;
}
export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  nameBn?: string;
  description?: string;
  descriptionBn?: string;
  longDescription?: string;
  longDescriptionBn?: string;
  category: string;
  price: number;
  image?: string;
  imageAltText?: string;
  imageAltTextBn?: string;
  available: boolean;
  createdAt?: string;
  storefrontVisible?: boolean;
  needsAttention?: boolean;
}
export interface StorefrontReceipt {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  locale: Locale;
  confirmationToken?: string;
}
export interface StorefrontQuote {
  lines: Array<
    StorefrontProduct & {
      productId: string;
      quantity: number;
      lineSubtotal?: number;
      available?: boolean;
    }
  >;
  issues: Array<{
    productId?: string;
    code: string;
    available?: number;
    safeAction?: string;
    remaining?: number;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  currency: string;
  freeDelivery?: boolean;
}
export const localize = (value: LocalizedText | undefined, locale: Locale) =>
  value?.[locale] || value?.en || "";
