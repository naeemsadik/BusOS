import { BadRequestException, HttpException } from '@nestjs/common';
import { StorefrontAssetStorage } from './storefront-asset.storage';
import { validateOrderSettings, validateSeo, validateStorefrontDocument, validateTheme } from './storefront-document.validator';
import { StorefrontRateLimitService } from './storefront-rate-limit.service';
import { DEFAULT_STOREFRONT_DOCUMENT } from './storefront.types';

const document = () => structuredClone(DEFAULT_STOREFRONT_DOCUMENT);

describe('storefront contract security', () => {
  it('accepts the complete default contract and bounded settings', () => {
    expect(() => validateStorefrontDocument(document())).not.toThrow();
    expect(() => validateTheme({ primary: '#0f766e', accent: '#f59e0b', font: 'system', radius: '8px' })).not.toThrow();
    expect(() => validateSeo({ title: { en: 'Store' }, description: { en: 'Description' }, socialImageUrl: '/image.png' })).not.toThrow();
    expect(() => validateOrderSettings({ deliveryFee: 75.25, phone: '01700000000', address: { en: 'Dhaka' } })).not.toThrow();
    expect(() => validateOrderSettings({ deliveryFee: 0, phone: '' })).not.toThrow();
  });

  it.each([
    ['duplicate section ids', (value: any) => value.sections.push({ ...value.sections[0] })],
    ['unsafe links', (value: any) => { value.sections[0].content.ctaHref = 'javascript:alert(1)' }],
    ['missing English fallback', (value: any) => { value.sections[0].content.title = { en: '', bn: 'স্বাগতম' } }],
    ['excessive product limits', (value: any) => { value.sections[1].content.productLimit = 25 }],
    ['unknown section types', (value: any) => { value.sections[0].type = 'html' }],
  ])('rejects %s', (_label, mutate) => {
    const value = document();
    mutate(value);
    expect(() => validateStorefrontDocument(value)).toThrow(BadRequestException);
  });

  it('rejects excessive documents and invalid money or theme values', () => {
    const value: any = document();
    value.sections = Array.from({ length: 31 }, (_, index) => ({ ...value.sections[0], id: `section-${index}` }));
    expect(() => validateStorefrontDocument(value)).toThrow(BadRequestException);
    expect(() => validateOrderSettings({ deliveryFee: -1, phone: '01700000000' })).toThrow(BadRequestException);
    expect(() => validateTheme({ primary: 'red', accent: '#f59e0b', font: 'system', radius: '8px' })).toThrow(BadRequestException);
  });
});

describe('storefront asset validation', () => {
  const storage = new StorefrontAssetStorage();

  it('uses image signatures and extracts safe PNG dimensions', () => {
    const png = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
    png.writeUInt32BE(640, 16);
    png.writeUInt32BE(480, 20);
    expect(storage.inspect(png)).toMatchObject({ mimeType: 'image/png', width: 640, height: 480 });
  });

  it('rejects spoofed content, decompression-sized dimensions, and traversal keys', async () => {
    expect(() => storage.inspect(Buffer.from('not an image'))).toThrow(BadRequestException);
    const huge = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(huge);
    huge.writeUInt32BE(10001, 16);
    huge.writeUInt32BE(10, 20);
    expect(() => storage.inspect(huge)).toThrow(BadRequestException);
    await expect(storage.read('../outside.png')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('storefront public rate limits', () => {
  it('isolates keys and rejects requests beyond the configured window limit', () => {
    const limits = new StorefrontRateLimitService();
    limits.check('store-a:127.0.0.1', 2);
    limits.check('store-a:127.0.0.1', 2);
    expect(() => limits.check('store-a:127.0.0.1', 2)).toThrow(HttpException);
    expect(() => limits.check('store-b:127.0.0.1', 2)).not.toThrow();
  });
});
