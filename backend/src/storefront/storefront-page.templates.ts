import { randomUUID } from 'crypto';
import {
  StorefrontDocument,
  StorefrontLocale,
  StorefrontSection,
  StorefrontSectionType,
} from './storefront.types';

const section = (
  type: StorefrontSectionType,
  title: string,
  body = '',
): StorefrontSection => ({
  id: `${type}-${randomUUID()}`,
  type,
  visible: true,
  content: { title: { en: title }, body: { en: body } },
});

const sectionsByType: Record<string, () => StorefrontSection[]> = {
  home: () => [
    {
      ...section(
        'hero',
        'Add your main message',
        'Explain what visitors can find here.',
      ),
      content: {
        title: { en: 'Add your main message' },
        body: { en: 'Explain what visitors can find here.' },
        ctaLabel: { en: 'Browse products' },
        ctaHref: '/catalog',
      },
    },
    {
      ...section('productGrid', 'Featured products'),
      content: {
        title: { en: 'Featured products' },
        productLimit: 8,
        productSort: 'newest',
      },
    },
  ],
  about: () => [
    section(
      'hero',
      'Our story',
      'Tell visitors what your business does and why it matters.',
    ),
    section(
      'imageText',
      'What makes us different',
      'Add a specific, verified reason customers choose your business.',
    ),
  ],
  contact: () => [
    section(
      'contactHours',
      'Contact and opening hours',
      'Add your address, phone number, and the best way to contact you.',
    ),
  ],
  promotion: () => [
    {
      ...section(
        'promotionalBanner',
        'Add your offer',
        'Add the exact terms and valid dates before publishing.',
      ),
      content: {
        title: { en: 'Add your offer' },
        body: { en: 'Add the exact terms and valid dates before publishing.' },
        ctaLabel: { en: 'View products' },
        ctaHref: '/catalog',
      },
    },
  ],
  landing: () => [
    section(
      'hero',
      'Introduce this collection',
      'Describe who it is for without inventing product claims.',
    ),
    {
      ...section('productGrid', 'Browse products'),
      content: {
        title: { en: 'Browse products' },
        productLimit: 12,
        productSort: 'newest',
      },
    },
  ],
  delivery: () => [
    section(
      'imageText',
      'Delivery and ordering',
      'Add verified delivery areas, fees, time estimates, and ordering steps.',
    ),
  ],
  faq: () => [
    section(
      'imageText',
      'Frequently asked questions',
      'Add a common question and a verified answer. Duplicate this section for more questions.',
    ),
  ],
  custom: () => [
    section(
      'imageText',
      'Add a page title',
      'Add the information visitors need.',
    ),
  ],
};

export function pageTemplate(
  pageType: string,
  mode: 'blank' | 'template' | 'guided' = 'template',
  facts: Record<string, unknown> = {},
): StorefrontDocument {
  const sections =
    mode === 'blank'
      ? []
      : (sectionsByType[pageType] || sectionsByType.custom)();
  const purpose = typeof facts.purpose === 'string' ? facts.purpose.trim() : '';
  const audience =
    typeof facts.audience === 'string' ? facts.audience.trim() : '';
  if (mode === 'guided' && sections[0]) {
    sections[0].content.title = {
      en: purpose || sections[0].content.title?.en || 'Add your main message',
    };
    if (audience)
      sections[0].content.body = {
        en: `For ${audience}. Review and complete this message before publishing.`,
      };
  }
  return {
    version: 1,
    header: { showCatalog: true, showCart: true },
    footer: { text: { en: 'Thank you for visiting.' }, showContact: true },
    sections,
  };
}

export function addLocalePlaceholders(
  document: StorefrontDocument,
  locales: StorefrontLocale[],
) {
  if (!locales.includes('bn')) return document;
  return JSON.parse(JSON.stringify(document)) as StorefrontDocument;
}
