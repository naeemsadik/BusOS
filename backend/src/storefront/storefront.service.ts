import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, StorefrontSite } from '../entities';
import { CreateStorefrontDto, SaveStorefrontDraftDto } from './storefront.dto';
import { validateOrderSettings, validateSeo, validateStorefrontDocument, validateTheme } from './storefront-document.validator';
import { DEFAULT_SEO, DEFAULT_STOREFRONT_DOCUMENT, DEFAULT_THEME } from './storefront.types';

const RESERVED_SLUGS = new Set(['admin', 'api', 'app', 'assets', 'cdn', 'mail', 'static', 'store', 'support', 'www']);

@Injectable()
export class StorefrontService {
  constructor(@InjectRepository(StorefrontSite) private readonly sites: Repository<StorefrontSite>) {}

  private normalizeSlug(slug: string) { return slug.trim().toLowerCase(); }
  private assertSlug(slug: string) {
    if (RESERVED_SLUGS.has(slug)) throw new BadRequestException('That storefront address is reserved');
  }
  async getCmsSite(organizationId: string) {
    return this.sites.findOne({ where: { organizationId } });
  }
  async slugAvailability(rawSlug: string) {
    const slug = this.normalizeSlug(rawSlug); this.assertSlug(slug);
    return { slug, available: !(await this.sites.exist({ where: { slug } })) };
  }
  async create(dto: CreateStorefrontDto, organization: Organization) {
    const slug = this.normalizeSlug(dto.slug); this.assertSlug(slug);
    if (await this.getCmsSite(organization.id)) throw new ConflictException('This organization already has a storefront');
    if (await this.sites.exist({ where: { slug } })) throw new ConflictException('This storefront address is already reserved');
    try {
      return await this.sites.save(this.sites.create({
        organizationId: organization.id, slug, enabledLocales: ['en'], defaultLocale: 'en',
        themeTokens: DEFAULT_THEME, seoSettings: DEFAULT_SEO,
        orderSettings: { deliveryFee: 0, phone: organization.phone || '', address: { en: organization.address || '' } },
        draftDocument: DEFAULT_STOREFRONT_DOCUMENT,
      }));
    } catch (error: any) {
      if (error?.code === '23505') throw new ConflictException('This storefront address is already reserved');
      throw error;
    }
  }
  async saveDraft(dto: SaveStorefrontDraftDto, organizationId: string) {
    if (!dto.enabledLocales.includes('en') || !dto.enabledLocales.includes(dto.defaultLocale)) throw new BadRequestException('English and the default locale must be enabled');
    validateTheme(dto.themeTokens); validateSeo(dto.seoSettings); validateOrderSettings(dto.orderSettings); validateStorefrontDocument(dto.document);
    const site = await this.requireCmsSite(organizationId);
    const result = await this.sites.createQueryBuilder().update(StorefrontSite).set({
      draftDocument: dto.document, enabledLocales: dto.enabledLocales, defaultLocale: dto.defaultLocale,
      themeTokens: dto.themeTokens, seoSettings: dto.seoSettings, orderSettings: dto.orderSettings,
      draftVersion: () => '"draftVersion" + 1',
    }).where('id = :id AND "organizationId" = :organizationId AND "draftVersion" = :version', {
      id: site.id, organizationId, version: dto.expectedVersion,
    }).execute();
    if (!result.affected) {
      const current = await this.requireCmsSite(organizationId);
      throw new ConflictException({ message: 'The draft changed in another session', currentVersion: current.draftVersion });
    }
    return this.requireCmsSite(organizationId);
  }
  private async requireCmsSite(organizationId: string) {
    const site = await this.getCmsSite(organizationId);
    if (!site) throw new NotFoundException('Set up your storefront first');
    return site;
  }
}
