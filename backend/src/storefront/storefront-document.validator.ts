import { BadRequestException } from '@nestjs/common';
import {
  StorefrontDocument,
  StorefrontOrderSettings,
  StorefrontSeoSettings,
  StorefrontThemeTokens,
} from './storefront.types';

const SECTION_TYPES = new Set([
  'announcement',
  'hero',
  'categoryNavigation',
  'productGrid',
  'promotionalBanner',
  'imageText',
  'contactHours',
  'category_nav',
  'product_grid',
  'promo_banner',
  'image_text',
  'text_block',
  'contact_hours',
]);
const HEX = /^#[0-9a-f]{6}$/i;
const SAFE_PATH = /^\/(?!\/)[a-z0-9/_?#=&.%+-]*$/i;
const SAFE_URL = /^https:\/\//i;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const record = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const bounded = (value: unknown, max: number, required = false) =>
  typeof value === 'string' &&
  value.trim().length <= max &&
  (!required || value.trim().length > 0);
const localized = (value: unknown, max: number, required = false) =>
  record(value) &&
  bounded(value.en, max, required) &&
  (value.bn === undefined || bounded(value.bn, max));
const safeUrl = (value: unknown) =>
  value === undefined ||
  value === '' ||
  (typeof value === 'string' &&
    value.length <= 500 &&
    (SAFE_PATH.test(value) || SAFE_URL.test(value)));

export function validateTheme(
  value: unknown,
): asserts value is StorefrontThemeTokens {
  if (
    !record(value) ||
    !HEX.test(value.primary) ||
    !HEX.test(value.accent) ||
    !['manrope', 'noto-sans-bengali', 'system'].includes(value.font) ||
    !['0px', '8px', '12px', '16px'].includes(value.radius)
  )
    throw new BadRequestException('Theme colors, font, or radius are invalid');
}
export function validateSeo(
  value: unknown,
): asserts value is StorefrontSeoSettings {
  if (
    !record(value) ||
    !localized(value.title, 70, true) ||
    !localized(value.description, 160) ||
    !safeUrl(value.socialImageUrl)
  )
    throw new BadRequestException('SEO settings are invalid');
}
export function validateOrderSettings(
  value: unknown,
): asserts value is StorefrontOrderSettings {
  if (
    !record(value) ||
    !Number.isFinite(value.deliveryFee) ||
    value.deliveryFee < 0 ||
    value.deliveryFee > 999999.99 ||
    !bounded(value.phone, 40) ||
    (value.email !== undefined && !bounded(value.email, 255)) ||
    (value.address !== undefined && !localized(value.address, 500))
  )
    throw new BadRequestException('Order settings are invalid');
}
export function validateStorefrontDocument(
  value: unknown,
  options: { publish?: boolean } = {},
): asserts value is StorefrontDocument {
  if (record(value) && value.schemaVersion === 1) {
    if (!Array.isArray(value.sections) || value.sections.length > 20)
      throw new BadRequestException('A page can contain at most 20 sections');
    const ids = new Set<string>();
    for (const section of value.sections) {
      if (!record(section) || !ID.test(section.id) || ids.has(section.id) || typeof section.type !== 'string' || typeof section.visible !== 'boolean')
        throw new BadRequestException('Every section needs a unique valid id, type, and visibility');
      ids.add(section.id);
      if (!SECTION_TYPES.has(section.type)) continue;
      if (JSON.stringify(section).length > 64 * 1024)
        throw new BadRequestException(`Section ${section.id} is too large`);
      if (options.publish && section.visible) {
        const defaultText = (field: string) => localized(section[field], field === 'body' ? 2000 : 120, true);
        if (['hero', 'promo_banner'].includes(section.type) && !defaultText('headline'))
          throw new BadRequestException(`Section ${section.id} requires a headline`);
        if (['image_text', 'text_block'].includes(section.type) && !defaultText('body'))
          throw new BadRequestException(`Section ${section.id} requires body text`);
        if (section.type === 'announcement' && !defaultText('text'))
          throw new BadRequestException(`Section ${section.id} requires announcement text`);
      }
      const link = section.link || section.button?.link;
      if (link && (!record(link) || !['page', 'catalog', 'product', 'category', 'url', 'phone', 'whatsapp', 'none'].includes(link.kind) || (link.kind === 'url' && !SAFE_URL.test(link.url || ''))))
        throw new BadRequestException(`Section ${section.id} contains an invalid link`);
    }
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 256 * 1024)
      throw new BadRequestException('The page draft exceeds the 256 KB limit');
    return;
  }
  if (
    !record(value) ||
    value.version !== 1 ||
    !record(value.header) ||
    !record(value.footer) ||
    typeof value.header.showCatalog !== 'boolean' ||
    typeof value.header.showCart !== 'boolean' ||
    !safeUrl(value.header.logoUrl) ||
    !localized(value.footer.text, 300, true) ||
    typeof value.footer.showContact !== 'boolean' ||
    !Array.isArray(value.sections) ||
    value.sections.length > 20
  )
    throw new BadRequestException('Storefront document structure is invalid');
  const ids = new Set<string>();
  for (const section of value.sections) {
    if (
      !record(section) ||
      !ID.test(section.id) ||
      ids.has(section.id) ||
      !SECTION_TYPES.has(section.type) ||
      typeof section.visible !== 'boolean' ||
      !record(section.content)
    )
      throw new BadRequestException(
        'Every section needs a unique valid id, type, visibility, and content',
      );
    ids.add(section.id);
    const content = section.content;
    if (
      (content.title !== undefined && !localized(content.title, 160)) ||
      (content.body !== undefined && !localized(content.body, 2000)) ||
      (content.imageAlt !== undefined && !localized(content.imageAlt, 255)) ||
      (content.ctaLabel !== undefined && !localized(content.ctaLabel, 80)) ||
      !safeUrl(content.imageUrl) ||
      !safeUrl(content.ctaHref)
    )
      throw new BadRequestException(
        `Section ${section.id} contains invalid localized text or links`,
      );
    if (options.publish && section.type === 'hero' && !localized(content.title, 160, true))
      throw new BadRequestException(
        `Hero section ${section.id} requires an English title`,
      );
    if (
      section.type === 'categoryNavigation' &&
      (!Array.isArray(content.categories) ||
        content.categories.length > 20 ||
        content.categories.some((item: unknown) => !bounded(item, 100, true)))
    )
      throw new BadRequestException(
        `Category section ${section.id} is invalid`,
      );
    if (
      section.type === 'productGrid' &&
      content.productLimit !== undefined &&
      (!Number.isInteger(content.productLimit) ||
        content.productLimit < 1 ||
        content.productLimit > 24)
    )
      throw new BadRequestException(
        `Product section ${section.id} has an invalid limit`,
      );
    if (
      options.publish && section.type === 'imageText' &&
      content.imageUrl &&
      !localized(content.imageAlt, 255, true)
    )
      throw new BadRequestException(
        `Image section ${section.id} requires English alternative text when an image is selected`,
      );
  }
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 256 * 1024)
    throw new BadRequestException('The page draft exceeds the 256 KB limit');
}
