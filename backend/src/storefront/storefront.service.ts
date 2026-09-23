import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Organization, Product, ProductStatus, StorefrontAsset, StorefrontPublicationStatus, StorefrontSite, SubscriptionStatus } from '../entities';
import { AssetMetadataDto, CreateStorefrontDto, PublicProductQueryDto, SaveStorefrontDraftDto, UpdateAssetDto } from './storefront.dto';
import { StorefrontAssetStorage } from './storefront-asset.storage';
import { validateOrderSettings, validateSeo, validateStorefrontDocument, validateTheme } from './storefront-document.validator';
import { DEFAULT_SEO, DEFAULT_STOREFRONT_DOCUMENT, DEFAULT_THEME } from './storefront.types';

const RESERVED_SLUGS = new Set(['admin', 'api', 'app', 'assets', 'cdn', 'mail', 'static', 'store', 'support', 'www']);

@Injectable()
export class StorefrontService {
  private readonly logger = new Logger(StorefrontService.name);
  constructor(
    @InjectRepository(StorefrontSite) private readonly sites: Repository<StorefrontSite>,
    @InjectRepository(StorefrontAsset) private readonly assets: Repository<StorefrontAsset>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly assetStorage: StorefrontAssetStorage,
    private readonly dataSource: DataSource,
  ) {}

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
  async publish(organizationId: string) {
    const published = await this.dataSource.transaction(async manager => {
      const site = await manager.getRepository(StorefrontSite).createQueryBuilder('site').setLock('pessimistic_write')
        .where('site.organizationId = :organizationId', { organizationId }).getOne();
      if (!site) throw new NotFoundException('Set up your storefront first');
      validateTheme(site.themeTokens); validateSeo(site.seoSettings); validateOrderSettings(site.orderSettings); validateStorefrontDocument(site.draftDocument);
      await this.assertOwnedAssetReferences(site, manager.getRepository(StorefrontAsset));
      site.publishedDocument = JSON.parse(JSON.stringify(site.draftDocument));
      site.publishedVersion = site.draftVersion;
      site.status = StorefrontPublicationStatus.PUBLISHED;
      site.publishedAt = new Date();
      return manager.save(site);
    });
    await this.invalidatePublishedCache(published.slug);
    return published;
  }
  async resolvePublished(slug: string) {
    const site = await this.requirePublicSite(slug);
    return this.publicSite(site);
  }
  async listCategories(slug: string) {
    const site = await this.requirePublicSite(slug);
    const rows = await this.products.createQueryBuilder('product').select('DISTINCT product.category', 'category')
      .where('product.organizationId = :organizationId', { organizationId: site.organizationId })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE }).andWhere('product.storefrontVisible = true')
      .andWhere('product.category IS NOT NULL').orderBy('product.category', 'ASC').getRawMany();
    return rows.map(row => row.category);
  }
  async listProducts(slug: string, query: PublicProductQueryDto) {
    const site = await this.requirePublicSite(slug);
    const qb = this.products.createQueryBuilder('product')
      .where('product.organizationId = :organizationId', { organizationId: site.organizationId })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE }).andWhere('product.storefrontVisible = true');
    if (query.category) qb.andWhere('product.category = :category', { category: query.category });
    if (query.search) {
      const search = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere('(product.name ILIKE :search OR product."nameBn" ILIKE :search OR product.description ILIKE :search)', { search });
    }
    const sort = {
      newest: ['product.createdAt', 'DESC'], name: ['product.name', 'ASC'],
      priceAsc: ['product.price', 'ASC'], priceDesc: ['product.price', 'DESC'],
    }[query.sort] as [string, 'ASC' | 'DESC'];
    const [products, total] = await qb.orderBy(sort[0], sort[1]).addOrderBy('product.id', 'ASC')
      .skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    return { data: products.map(product => this.publicProduct(product)), total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }
  async product(slug: string, productSlug: string) {
    const site = await this.requirePublicSite(slug);
    const product = await this.products.createQueryBuilder('product')
      .where('product.organizationId = :organizationId', { organizationId: site.organizationId })
      .andWhere('(lower(product.slug) = lower(:productSlug) OR product.id::text = :productSlug)', { productSlug })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE }).andWhere('product.storefrontVisible = true').getOne();
    if (!product) throw new NotFoundException('Product not found');
    return this.publicProduct(product);
  }
  listAssets(organizationId: string) {
    return this.assets.find({ where: { organizationId }, order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }
  async addAsset(organizationId: string, file: { buffer: Buffer; size: number }, metadata: AssetMetadataDto) {
    await this.requireCmsSite(organizationId);
    if (!file?.buffer || file.buffer.length < 1 || file.buffer.length > 5 * 1024 * 1024) throw new BadRequestException('Images must be between 1 byte and 5 MB');
    const info = this.assetStorage.inspect(file.buffer);
    const storageKey = await this.assetStorage.write(organizationId, file.buffer, info.extension);
    const asset = this.assets.create({
      organizationId, storageKey, url: '', mimeType: info.mimeType, size: file.buffer.length,
      width: info.width, height: info.height, altTextEn: metadata.altTextEn.trim(),
      altTextBn: metadata.altTextBn?.trim() || null,
    });
    try {
      asset.url = `/storefront/assets/public/${asset.id || ''}`;
      const saved = await this.assets.save(asset);
      if (!saved.url.endsWith(saved.id)) saved.url = `/storefront/assets/public/${saved.id}`;
      return this.assets.save(saved);
    } catch (error) {
      await this.assetStorage.remove(storageKey); throw error;
    }
  }
  async updateAsset(id: string, organizationId: string, dto: UpdateAssetDto) {
    const asset = await this.requireAsset(id, organizationId);
    asset.altTextEn = dto.altTextEn.trim(); asset.altTextBn = dto.altTextBn?.trim() || null; asset.sortOrder = dto.sortOrder;
    return this.assets.save(asset);
  }
  async deleteAsset(id: string, organizationId: string) {
    const [asset, site] = await Promise.all([this.requireAsset(id, organizationId), this.requireCmsSite(organizationId)]);
    const serialized = JSON.stringify([site.draftDocument, site.publishedDocument]);
    if (serialized.includes(asset.url) || serialized.includes(asset.storageKey)) throw new ConflictException('Remove this image from the draft and published site before deleting it');
    await this.assets.remove(asset); await this.assetStorage.remove(asset.storageKey);
    return { deleted: true };
  }
  async getPublicAsset(id: string) {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return { asset, buffer: await this.assetStorage.read(asset.storageKey) };
  }
  private async requireAsset(id: string, organizationId: string) {
    const asset = await this.assets.findOne({ where: { id, organizationId } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }
  private async assertOwnedAssetReferences(site: StorefrontSite, repository: Repository<StorefrontAsset>) {
    const matches = JSON.stringify(site.draftDocument).matchAll(/\/storefront\/assets\/public\/([0-9a-f-]{36})/gi);
    const ids = [...new Set(Array.from(matches, match => match[1]))];
    if (!ids.length) return;
    const count = await repository.createQueryBuilder('asset').where('asset.organizationId = :organizationId', { organizationId: site.organizationId }).andWhere('asset.id IN (:...ids)', { ids }).getCount();
    if (count !== ids.length) throw new BadRequestException('The draft references an image owned by another organization or an image that no longer exists');
  }
  private async requirePublicSite(rawSlug: string) {
    const slug = this.normalizeSlug(rawSlug);
    const site = await this.sites.findOne({ where: { slug }, relations: ['organization', 'organization.subscription'] });
    if (!site || !site.publishedDocument || site.status === StorefrontPublicationStatus.DRAFT) throw new NotFoundException('Storefront not found');
    const subscription = site.organization?.subscription; const now = new Date();
    const active = subscription && ((subscription.status === SubscriptionStatus.ACTIVE && subscription.endDate > now)
      || (subscription.status === SubscriptionStatus.TRIAL && !!subscription.trialEndDate && subscription.trialEndDate > now));
    if (site.status === StorefrontPublicationStatus.INACTIVE || !site.organization?.isActive || !active) {
      throw new ServiceUnavailableException({ message: 'This store is temporarily unavailable', storefront: { name: site.organization?.name, logo: site.organization?.logo, themeTokens: site.themeTokens } });
    }
    return site;
  }
  private publicSite(site: StorefrontSite) {
    return { slug: site.slug, name: site.organization.name, logo: site.organization.logo, enabledLocales: site.enabledLocales, defaultLocale: site.defaultLocale, themeTokens: site.themeTokens, seoSettings: site.seoSettings, orderSettings: site.orderSettings, document: site.publishedDocument, publishedVersion: site.publishedVersion, publishedAt: site.publishedAt };
  }
  private publicProduct(product: Product) {
    return { id: product.id, slug: product.slug || product.id, name: product.name, nameBn: product.nameBn, description: product.description, descriptionBn: product.descriptionBn, longDescription: product.longDescription, longDescriptionBn: product.longDescriptionBn, category: product.category, price: Number(product.price), image: product.image, imageAltText: product.imageAltText, imageAltTextBn: product.imageAltTextBn, available: !product.trackStock || product.allowBackorder || product.stock > 0 };
  }
  private async invalidatePublishedCache(slug: string) {
    const frontend = process.env.FRONTEND_1_URL;
    const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
    if (!frontend || !secret) return;
    try {
      const response = await fetch(`${frontend.replace(/\/$/, '')}/api/storefront/revalidate`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
        body: JSON.stringify({ slug }), signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      this.logger.warn(`Storefront ${slug} was published but cache invalidation will rely on its TTL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  private async requireCmsSite(organizationId: string) {
    const site = await this.getCmsSite(organizationId);
    if (!site) throw new NotFoundException('Set up your storefront first');
    return site;
  }
}
