import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import {
  Order,
  DeliveryMethod,
  Customer,
  OrderItem,
  OrderSource,
  OrderStatus,
  Organization,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductStatus,
  StorefrontAsset,
  StorefrontPage,
  StorefrontPageLifecycleStatus,
  StorefrontPageStatus,
  StorefrontPublicationStatus,
  StorefrontSite,
  StorefrontSlugAlias,
  SubscriptionStatus,
} from '../entities';
import {
  AssetMetadataDto,
  CreateStorefrontDto,
  CreateStorefrontOrderDto,
  PublicProductQueryDto,
  SaveStorefrontDraftDto,
  UpdateAssetDto,
  BulkStorefrontProductsDto,
  CartQuoteDto,
  ChangeStorefrontSlugDto,
  LookupStorefrontOrderDto,
  SetStorefrontOrderingDto,
  UpdateStorefrontProfileDto,
  UpdateStorefrontSettingsDto,
  PublishStorefrontDto,
} from './storefront.dto';
import { StorefrontAssetStorage } from './storefront-asset.storage';
import {
  validateOrderSettings,
  validateSeo,
  validateStorefrontDocument,
  validateTheme,
} from './storefront-document.validator';
import {
  DEFAULT_SEO,
  DEFAULT_STOREFRONT_DOCUMENT,
  DEFAULT_THEME,
} from './storefront.types';
import { StorefrontPageService } from './storefront-page.service';
import { TenantScope } from './tenant-scope';

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'cdn',
  'mail',
  'static',
  'store',
  'support',
  'www',
  'auth',
  'backend-api',
  'dashboard',
  'help',
  'localhost',
  'login',
  'orders',
  'products',
  'bn',
  'en',
  'shop',
  'busos',
  'signup',
]);

@Injectable()
export class StorefrontService {
  private readonly logger = new Logger(StorefrontService.name);
  constructor(
    @InjectRepository(StorefrontSite)
    private readonly sites: Repository<StorefrontSite>,
    @InjectRepository(StorefrontAsset)
    private readonly assets: Repository<StorefrontAsset>,
    @InjectRepository(StorefrontSlugAlias)
    private readonly aliases: Repository<StorefrontSlugAlias>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly assetStorage: StorefrontAssetStorage,
    private readonly dataSource: DataSource,
    private readonly pageService: StorefrontPageService,
    private readonly tenant: TenantScope,
  ) {}

  private normalizeSlug(slug: string) {
    return slug.trim().toLowerCase();
  }
  private assertSlug(slug: string) {
    if (RESERVED_SLUGS.has(slug))
      this.fail(HttpStatus.BAD_REQUEST, 'SLUG_RESERVED', 'That storefront address is reserved');
  }
  async getCmsSite(organizationId: string) {
    const site = await this.sites.findOne({ where: { organizationId } });
    if (!site) return null;
    const [pages, productsOnline] = await Promise.all([
      this.dataSource.getRepository('storefront_pages').count({ where: { organizationId, deletedAt: null } as any }),
      this.products.count({ where: { organization: { id: organizationId }, storefrontVisible: true, status: ProductStatus.ACTIVE } }),
    ]);
    return { ...site, counts: { pages, productsOnline }, hasUnpublishedChanges: site.settingsVersion !== site.publishedVersion };
  }
  async updateAiPreference(organizationId: string, enabled: boolean) {
    const site = await this.requireCmsSite(organizationId);
    site.aiEnabled = enabled;
    return this.sites.save(site);
  }
  async slugAvailability(rawSlug: string) {
    const slug = this.normalizeSlug(rawSlug);
    const suggestions = (base: string) => [1, 2, 3].map((n) => `${base.slice(0, 60)}${n}`);
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug))
      return { slug, available: false, reason: 'invalid', suggestions: suggestions(slug.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'shop') };
    if (RESERVED_SLUGS.has(slug))
      return { slug, available: false, reason: 'reserved', suggestions: suggestions(`${slug}-shop`) };
    const [siteTaken, aliasTaken] = await Promise.all([
      this.sites.exist({ where: { slug } }),
      this.aliases.createQueryBuilder('alias').where('lower(alias.oldSlug) = lower(:slug)', { slug }).andWhere('alias.expiresAt > :now', { now: new Date() }).getExists(),
    ]);
    return { slug, available: !siteTaken && !aliasTaken, reason: siteTaken || aliasTaken ? 'taken' : null, suggestions: siteTaken || aliasTaken ? suggestions(slug) : [] };
  }
  async create(
    dto: CreateStorefrontDto,
    organization: Organization,
    userId?: string,
  ) {
    const slug = this.normalizeSlug(dto.slug);
    this.assertSlug(slug);
    const existing = await this.sites.findOne({ where: { organizationId: organization.id } });
    if (existing) return existing;
    const availability = await this.slugAvailability(slug);
    if (!availability.available)
      this.fail(HttpStatus.CONFLICT, availability.reason === 'reserved' ? 'SLUG_RESERVED' : 'SLUG_TAKEN', availability.reason === 'reserved' ? 'That storefront address is reserved' : 'That storefront address was just taken', { suggestions: availability.suggestions });
    try {
      const site = await this.sites.save(
        this.sites.create({
          organizationId: organization.id,
          slug,
          enabledLocales: [dto.defaultLocale || 'en'],
          defaultLocale: dto.defaultLocale || 'en',
          themeTokens: DEFAULT_THEME,
          seoSettings: DEFAULT_SEO,
          orderSettings: {
            deliveryFee: 0,
            phone: organization.phone || '',
            address: { en: organization.address || '' },
          },
          draftDocument: DEFAULT_STOREFRONT_DOCUMENT,
          draftSettings: this.defaultSettings(organization),
          setupProgress: { slug: true, basics: false, products: false, template: false, published: false },
        }),
      );
      await this.pageService.create(
        {
          title: 'Home',
          slug: 'home',
          pageType: 'home',
          startMode: 'template',
          includeInNavigation: false,
          enabledLocales: [dto.defaultLocale || 'en'],
        },
        organization.id,
        userId || organization.id,
      );
      return site;
    } catch (error: any) {
      if (error?.code === '23505') {
        const won = await this.sites.findOne({ where: { organizationId: organization.id } });
        if (won) return won;
        this.fail(HttpStatus.CONFLICT, 'SLUG_TAKEN', 'That storefront address was just taken', { suggestions: (await this.slugAvailability(slug)).suggestions });
      }
      throw error;
    }
  }
  async saveDraft(dto: SaveStorefrontDraftDto, organizationId: string) {
    if (
      !dto.enabledLocales.includes('en') ||
      !dto.enabledLocales.includes(dto.defaultLocale)
    )
      throw new BadRequestException(
        'English and the default locale must be enabled',
      );
    validateTheme(dto.themeTokens);
    validateSeo(dto.seoSettings);
    validateOrderSettings(dto.orderSettings);
    validateStorefrontDocument(dto.document);
    const site = await this.requireCmsSite(organizationId);
    const result = await this.sites
      .createQueryBuilder()
      .update(StorefrontSite)
      .set({
        draftDocument: dto.document,
        enabledLocales: dto.enabledLocales,
        defaultLocale: dto.defaultLocale,
        themeTokens: dto.themeTokens,
        seoSettings: dto.seoSettings,
        orderSettings: dto.orderSettings,
        draftVersion: () => '"draftVersion" + 1',
      } as any)
      .where(
        'id = :id AND "organizationId" = :organizationId AND "draftVersion" = :version',
        {
          id: site.id,
          organizationId,
          version: dto.expectedVersion,
        },
      )
      .execute();
    if (!result.affected) {
      const current = await this.requireCmsSite(organizationId);
      throw new ConflictException({
        message: 'The draft changed in another session',
        currentVersion: current.draftVersion,
      });
    }
    return this.requireCmsSite(organizationId);
  }

  async saveSettings(dto: UpdateStorefrontSettingsDto, organizationId: string) {
    const site = await this.requireCmsSite(organizationId);
    if (dto.defaultLocale && dto.enabledLocales && !dto.enabledLocales.includes(dto.defaultLocale))
      this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', 'The default language must be enabled');
    const result = await this.sites.createQueryBuilder().update(StorefrontSite).set({
      draftSettings: dto.settings,
      enabledLocales: dto.enabledLocales || site.enabledLocales,
      defaultLocale: dto.defaultLocale || site.defaultLocale,
      setupProgress: dto.setupProgress ? { ...site.setupProgress, ...dto.setupProgress } : site.setupProgress,
      settingsVersion: () => '"settingsVersion" + 1',
    } as any).where('id = :id AND "organizationId" = :organizationId AND "settingsVersion" = :version', {
      id: site.id, organizationId, version: dto.expectedVersion,
    }).execute();
    if (!result.affected) {
      const current = await this.requireCmsSite(organizationId);
      this.fail(HttpStatus.CONFLICT, 'VERSION_CONFLICT', 'Settings changed in another session', { currentVersion: current.settingsVersion, current: current.draftSettings });
    }
    return this.requireCmsSite(organizationId);
  }

  async saveProfile(dto: UpdateStorefrontProfileDto, organizationId: string) {
    const site = await this.requireCmsSite(organizationId);
    site.shopProfile = dto.profile;
    if (dto.setupProgress) site.setupProgress = { ...site.setupProgress, ...dto.setupProgress };
    return this.sites.save(site);
  }

  async changeSlug(dto: ChangeStorefrontSlugDto, organizationId: string) {
    const next = this.normalizeSlug(dto.slug);
    this.assertSlug(next);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(StorefrontSite);
      const site = await repository.createQueryBuilder('site').setLock('pessimistic_write')
        .where('site.organizationId = :organizationId', { organizationId }).getOne();
      if (!site) throw new NotFoundException('Set up your storefront first');
      if (site.slug === next) return site;
      const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = (site.slugChanges || []).filter((entry) => new Date(entry.changedAt).getTime() >= since);
      if (recent.length >= 3) this.fail(HttpStatus.TOO_MANY_REQUESTS, 'LIMIT_REACHED', 'The shop address can only be changed three times in 30 days');
      const taken = await repository.createQueryBuilder('other').where('lower(other.slug) = lower(:slug)', { slug: next }).getExists();
      const aliasTaken = await manager.getRepository(StorefrontSlugAlias).createQueryBuilder('alias').where('lower(alias.oldSlug) = lower(:slug)', { slug: next }).andWhere('alias.expiresAt > :now', { now: new Date() }).getExists();
      if (taken || aliasTaken) this.fail(HttpStatus.CONFLICT, 'SLUG_TAKEN', 'That storefront address is already in use');
      const old = site.slug;
      await manager.getRepository(StorefrontSlugAlias).save({ organizationId, siteId: site.id, oldSlug: old, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
      site.slug = next;
      site.slugChanges = [...recent, { from: old, to: next, changedAt: new Date().toISOString() }];
      const saved = await repository.save(site);
      void this.invalidatePublishedCache(old);
      void this.invalidatePublishedCache(next);
      return saved;
    });
  }

  async unpublishSite(organizationId: string) {
    const site = await this.requireCmsSite(organizationId);
    if (site.status === StorefrontPublicationStatus.DRAFT)
      this.fail(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'A shop that has never been published cannot be unpublished');
    site.status = StorefrontPublicationStatus.UNPUBLISHED;
    const saved = await this.sites.save(site);
    await this.invalidatePublishedCache(site.slug);
    return saved;
  }

  async setOrdering(dto: SetStorefrontOrderingDto, organizationId: string) {
    const site = await this.requireCmsSite(organizationId);
    site.orderingEnabled = dto.enabled;
    if (dto.message) site.orderingPausedMessage = dto.message;
    const saved = await this.sites.save(site);
    await this.invalidatePublishedCache(site.slug);
    return saved;
  }

  async requestPublish(organizationId: string, userId: string) {
    const site = await this.requireCmsSite(organizationId);
    site.publishRequestedBy = userId;
    site.publishRequestedAt = new Date();
    await this.sites.save(site);
    return { requested: true, requestedAt: site.publishRequestedAt };
  }

  async listProductsOnline(organizationId: string) {
    await this.requireCmsSite(organizationId);
    const products = await this.products.find({ where: { organization: { id: organizationId } }, order: { createdAt: 'DESC' } });
    return products.map((product) => ({ ...this.publicProduct(product), status: product.status, storefrontVisible: product.storefrontVisible, needsAttention: !product.image || !product.nameBn }));
  }

  async bulkProductsOnline(dto: BulkStorefrontProductsDto, organizationId: string) {
    await this.requireCmsSite(organizationId);
    const result = await this.products.createQueryBuilder().update(Product).set({ storefrontVisible: dto.visible })
      .where('id IN (:...ids)', { ids: dto.productIds }).andWhere('"organizationId" = :organizationId', { organizationId }).execute();
    if (result.affected !== new Set(dto.productIds).size)
      this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', 'One or more products do not belong to this shop');
    const site = await this.requireCmsSite(organizationId);
    site.setupProgress = { ...site.setupProgress, products: true };
    await this.sites.save(site);
    await this.invalidatePublishedCache(site.slug);
    return { updated: result.affected };
  }
  async publish(organizationId: string) {
    const published = await this.dataSource.transaction(async (manager) => {
      const site = await manager
        .getRepository(StorefrontSite)
        .createQueryBuilder('site')
        .setLock('pessimistic_write')
        .where('site.organizationId = :organizationId', { organizationId })
        .getOne();
      if (!site) throw new NotFoundException('Set up your storefront first');
      validateTheme(site.themeTokens);
      validateSeo(site.seoSettings);
      validateOrderSettings(site.orderSettings);
      validateStorefrontDocument(site.draftDocument);
      await this.assertOwnedAssetReferences(
        site,
        manager.getRepository(StorefrontAsset),
      );
      site.publishedDocument = JSON.parse(JSON.stringify(site.draftDocument));
      site.publishedSettings = JSON.parse(JSON.stringify(site.draftSettings));
      site.publishedVersion = site.draftVersion;
      site.status = StorefrontPublicationStatus.PUBLISHED;
      site.publishedAt = new Date();
      site.firstPublishedAt ||= site.publishedAt;
      site.lastPublishedAt = site.publishedAt;
      site.publishRequestedAt = null;
      site.publishRequestedBy = null;
      site.setupProgress = { ...site.setupProgress, published: true };
      return manager.save(site);
    });
    await this.invalidatePublishedCache(published.slug);
    return published;
  }

  async checks(organizationId: string) {
    const site = await this.requireCmsSite(organizationId);
    const pages = await this.dataSource.getRepository(StorefrontPage).find({ where: { organizationId, deletedAt: null as any } });
    const details: any[] = [];
    const phone = String((site.draftSettings as any)?.contact?.phone || (site.orderSettings as any)?.phone || '').trim();
    if (!phone) details.push({ itemType: 'settings', itemId: site.id, field: 'contact.phone', severity: 'blocking', code: 'PHONE_REQUIRED' });
    for (const page of pages) {
      try { validateStorefrontDocument(page.draftDocument, { publish: true }); }
      catch { details.push({ itemType: 'page', itemId: page.id, field: 'document', severity: 'blocking', code: 'DOCUMENT_INVALID' }); }
      if (!(page.draftDocument as any)?.sections?.some((section: any) => section.visible))
        details.push({ itemType: 'page', itemId: page.id, field: 'sections', severity: 'warning', code: 'NO_VISIBLE_SECTIONS' });
    }
    return { valid: !details.some((item) => item.severity === 'blocking'), details };
  }

  async publishPreview(organizationId: string) {
    const site = await this.requireCmsSite(organizationId);
    const pages = await this.dataSource.getRepository(StorefrontPage).find({ where: { organizationId, deletedAt: null as any } });
    const checks = await this.checks(organizationId);
    return {
      items: [
        { type: 'settings', id: site.id, version: site.settingsVersion, changed: !site.publishedSettings || JSON.stringify(site.draftSettings) !== JSON.stringify(site.publishedSettings) },
        ...pages.map((page) => ({ type: 'page', id: page.id, version: page.draftVersion, changed: page.publishedVersion !== page.draftVersion, status: page.lifecycleStatus })),
      ],
      checks,
    };
  }

  async publishSelection(dto: PublishStorefrontDto, organizationId: string, userId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const sites = manager.getRepository(StorefrontSite);
      const site = await sites.createQueryBuilder('site').setLock('pessimistic_write')
        .where('site.organizationId = :organizationId', { organizationId }).getOne();
      if (!site) throw new NotFoundException('Set up your storefront first');
      const previous = (site.setupProgress as any)?.lastPublish;
      if (previous?.key === dto.idempotencyKey) return previous.result;
      const pageItems = dto.items.filter((item) => item.type === 'page');
      const pages = pageItems.length ? await manager.getRepository(StorefrontPage).find({ where: { organizationId, id: In(pageItems.map((item) => item.id!)) } }) : [];
      const stale: any[] = [];
      for (const item of dto.items) {
        if (item.type === 'settings' && item.expectedVersion !== site.settingsVersion) stale.push({ type: item.type, id: site.id, currentVersion: site.settingsVersion });
        if (item.type === 'page') {
          const page = pages.find((candidate) => candidate.id === item.id);
          if (!page || page.deletedAt || page.draftVersion !== item.expectedVersion) stale.push({ type: item.type, id: item.id, currentVersion: page?.draftVersion });
        }
      }
      if (stale.length) this.fail(HttpStatus.CONFLICT, 'STALE_ITEMS', 'Some drafts changed after the publish preview opened', stale);
      const selectedSettings = dto.items.some((item) => item.type === 'settings');
      if (site.status === StorefrontPublicationStatus.DRAFT && !pages.some((page) => page.isHomePage))
        this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', 'Include Home in the first publish', [{ itemType: 'page', field: 'home', severity: 'blocking', code: 'HOME_REQUIRED' }]);
      if (selectedSettings) {
        const phone = String((site.draftSettings as any)?.contact?.phone || '').trim();
        if (!phone) this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', 'Add a shop phone number before publishing', [{ itemType: 'settings', itemId: site.id, field: 'contact.phone', severity: 'blocking', code: 'PHONE_REQUIRED' }]);
        site.publishedSettings = JSON.parse(JSON.stringify(site.draftSettings));
      }
      for (const page of pages) {
        try { validateStorefrontDocument(page.draftDocument, { publish: true }); }
        catch { this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', 'Resolve page issues before publishing', [{ itemType: 'page', itemId: page.id, field: 'document', severity: 'blocking', code: 'DOCUMENT_INVALID' }]); }
        page.publishedDocument = JSON.parse(JSON.stringify(page.draftDocument));
        page.publishedVersion = page.draftVersion;
        page.publishedAt = new Date();
        page.status = StorefrontPageStatus.PUBLISHED;
        page.lifecycleStatus = StorefrontPageLifecycleStatus.PUBLISHED;
        await manager.save(page);
        if (page.isHomePage) {
          site.publishedDocument = page.publishedDocument;
          site.publishedVersion = page.publishedVersion;
          site.draftDocument = page.draftDocument;
          site.draftVersion = page.draftVersion;
          site.enabledLocales = page.enabledLocales;
          site.seoSettings = page.seoSettings;
        }
      }
      const now = new Date();
      site.status = StorefrontPublicationStatus.PUBLISHED;
      site.publishedAt = now;
      site.firstPublishedAt ||= now;
      site.lastPublishedAt = now;
      site.publishRequestedAt = null;
      site.publishRequestedBy = null;
      const response = { published: dto.items.map((item) => ({ type: item.type, id: item.id || site.id, version: item.expectedVersion })), publishedAt: now };
      site.setupProgress = { ...site.setupProgress, published: true, lastPublish: { key: dto.idempotencyKey, result: response } };
      await sites.save(site);
      return response;
    });
    const site = await this.requireCmsSite(organizationId);
    await this.invalidatePublishedCache(site.slug);
    return result;
  }
  async resolvePublished(slug: string) {
    const normalized = this.normalizeSlug(slug);
    const site = await this.sites.findOne({ where: { slug: normalized }, relations: ['organization', 'organization.subscription'] });
    if (!site) {
      const alias = await this.aliases.findOne({ where: { oldSlug: normalized }, relations: ['site'] });
      if (alias && alias.expiresAt > new Date()) return { state: 'redirect', slug: alias.site.slug, permanent: true };
      return { state: 'not_found' };
    }
    if (!this.isSubscriptionActive(site) || !site.organization?.isActive)
      return { state: 'suspended', slug: site.slug, settings: this.branding(site) };
    if (site.status === StorefrontPublicationStatus.DRAFT)
      return { state: 'coming_soon', slug: site.slug, settings: this.branding(site) };
    if (site.status === StorefrontPublicationStatus.UNPUBLISHED || site.status === StorefrontPublicationStatus.INACTIVE)
      return { state: 'closed', slug: site.slug, settings: this.branding(site) };
    return { state: 'live', ...(await this.publicSite(site)), ordering: { enabled: site.orderingEnabled, message: site.orderingPausedMessage } };
  }
  async resolvePublishedPage(slug: string, pageSlug: string) {
    const site = await this.requirePublicSite(slug);
    const page = await this.pageService.resolvePublic(site.id, pageSlug);
    if ('redirectTo' in page) return page;
    return {
      slug: page.slug,
      title: page.title,
      pageType: page.pageType,
      enabledLocales: page.enabledLocales,
      seoSettings: page.seoSettings,
      document: page.publishedDocument,
      publishedVersion: page.publishedVersion,
      publishedAt: page.publishedAt,
    };
  }
  async listCategories(slug: string) {
    const site = await this.requirePublicSite(slug);
    const rows = await this.products
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.organizationId = :organizationId', {
        organizationId: site.organizationId,
      })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.storefrontVisible = true')
      .andWhere('product.price > 0')
      .andWhere('product.category IS NOT NULL')
      .orderBy('product.category', 'ASC')
      .getRawMany();
    return rows.map((row) => row.category);
  }
  async listProducts(slug: string, query: PublicProductQueryDto) {
    const site = await this.requirePublicSite(slug);
    const qb = this.products
      .createQueryBuilder('product')
      .where('product.organizationId = :organizationId', {
        organizationId: site.organizationId,
      })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.storefrontVisible = true');
    qb.andWhere('product.price > 0');
    if (query.category)
      qb.andWhere('product.category = :category', { category: query.category });
    if (query.search) {
      const search = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(product.name ILIKE :search OR product."nameBn" ILIKE :search OR product.description ILIKE :search)',
        { search },
      );
    }
    const sort = {
      newest: ['product.createdAt', 'DESC'],
      name: ['product.name', 'ASC'],
      priceAsc: ['product.price', 'ASC'],
      priceDesc: ['product.price', 'DESC'],
    }[query.sort] as [string, 'ASC' | 'DESC'];
    const [products, total] = await qb
      .orderBy(sort[0], sort[1])
      .addOrderBy('product.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      data: products.map((product) => this.publicProduct(product)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
  async product(slug: string, productSlug: string) {
    const site = await this.requirePublicSite(slug);
    const product = await this.products
      .createQueryBuilder('product')
      .where('product.organizationId = :organizationId', {
        organizationId: site.organizationId,
      })
      .andWhere(
        '(lower(product.slug) = lower(:productSlug) OR product.id::text = :productSlug)',
        { productSlug },
      )
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.storefrontVisible = true')
      .andWhere('product.price > 0')
      .getOne();
    if (!product) throw new NotFoundException('Product not found');
    return this.publicProduct(product);
  }

  async quote(rawSlug: string, dto: CartQuoteDto) {
    const site = await this.requirePublicSite(rawSlug, false);
    const settings = this.orderConfig(site);
    if (dto.lines.length > settings.maxLines)
      this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', `A cart can contain at most ${settings.maxLines} products`);
    const quantities = new Map<string, number>();
    for (const line of dto.lines) quantities.set(line.productId, (quantities.get(line.productId) || 0) + line.quantity);
    const ids = [...quantities.keys()];
    const products = await this.products.find({ where: { organization: { id: site.organizationId }, id: In(ids) } });
    const byId = new Map(products.map((product) => [product.id, product]));
    let subtotal = 0;
    let taxAmount = 0;
    const issues: any[] = [];
    const lines = ids.map((productId) => {
      const product = byId.get(productId);
      const quantity = quantities.get(productId)!;
      if (!product || product.status !== ProductStatus.ACTIVE || !product.storefrontVisible || Number(product.price) <= 0) {
        issues.push({ productId, code: 'UNAVAILABLE', safeAction: 'remove' });
        return { productId, quantity, available: false };
      }
      const max = Math.min(settings.maxQtyPerLine, product.trackStock && !product.allowBackorder ? product.stock : settings.maxQtyPerLine);
      if (quantity > max) issues.push({ productId, code: max > 0 ? 'ONLY_N_LEFT' : 'UNAVAILABLE', available: max, safeAction: max > 0 ? 'set_quantity' : 'remove' });
      const lineSubtotal = this.money(Number(product.price) * quantity);
      const lineTax = this.money(lineSubtotal * Number(product.taxRate || 0) / 100);
      subtotal = this.money(subtotal + lineSubtotal);
      taxAmount = this.money(taxAmount + lineTax);
      return { ...this.publicProduct(product), quantity, lineSubtotal, lineTax };
    });
    const pickup = dto.deliveryMethod === 'pickup';
    const free = settings.freeDeliveryOver != null && subtotal >= settings.freeDeliveryOver;
    const shippingAmount = pickup || free ? 0 : settings.deliveryFee;
    const total = this.money(subtotal + taxAmount + shippingAmount);
    if (settings.minOrderAmount != null && subtotal < settings.minOrderAmount)
      issues.push({ code: 'MIN_ORDER', minimum: settings.minOrderAmount, remaining: this.money(settings.minOrderAmount - subtotal) });
    return { lines, issues, subtotal, taxAmount, shippingAmount, total, currency: 'BDT', freeDelivery: free };
  }

  async lookupOrder(rawSlug: string, dto: LookupStorefrontOrderDto) {
    const site = await this.requirePublicSite(rawSlug, false);
    const phone = this.normalizeBangladeshPhone(dto.phone);
    const order = await this.dataSource.getRepository(Order).createQueryBuilder('storefront_order')
      .where('storefront_order."storefrontSiteId" = :siteId', { siteId: site.id })
      .andWhere('lower(storefront_order."orderNumber") = lower(:number)', { number: dto.orderNumber.trim() })
      .andWhere("regexp_replace(storefront_order.\"customerPhone\", '[^0-9]', '', 'g') IN (:...phones)", { phones: [phone.slice(1), phone.slice(3), phone] })
      .getOne();
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'We could not find an order with those details' });
    return this.orderReceipt(order, order.publicToken || undefined);
  }
  async createOrder(
    rawSlug: string,
    dto: CreateStorefrontOrderDto,
    idempotencyKey: string,
  ) {
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(idempotencyKey))
      throw new BadRequestException(
        'A valid Idempotency-Key header is required',
      );
    if (dto.website) return { accepted: true };
    const site = await this.requirePublicSite(rawSlug, false);
    if (!site.orderingEnabled)
      this.fail(HttpStatus.LOCKED, 'ORDERING_PAUSED', this.localized(site.orderingPausedMessage, dto.locale || site.defaultLocale) || 'Ordering is paused', { phone: this.orderConfig(site).phone });
    const deliveryMethod = dto.deliveryMethod || 'delivery';
    const config = this.orderConfig(site);
    if (deliveryMethod === 'delivery' && !dto.shippingAddress?.trim())
      this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', 'Delivery address is required', { field: 'shippingAddress' });
    if (deliveryMethod === 'pickup' && !config.pickupEnabled)
      this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', 'Store pickup is not available');
    const normalizedPhone = this.normalizeBangladeshPhone(dto.customerPhone);
    const quote = await this.quote(rawSlug, { lines: dto.items, deliveryMethod });
    const blockingIssues = quote.issues.filter((issue: any) => ['UNAVAILABLE', 'ONLY_N_LEFT', 'MIN_ORDER'].includes(issue.code));
    if (blockingIssues.length)
      this.fail(HttpStatus.CONFLICT, 'ITEMS_UNAVAILABLE', 'Please review the items in your cart', { issues: blockingIssues, quote });
    if (dto.expectedTotal !== undefined && this.money(dto.expectedTotal) !== quote.total)
      this.fail(HttpStatus.CONFLICT, 'PRICE_CHANGED', 'Prices changed — please review the updated total', { quote });
    if (dto.locale === 'bn' && !site.enabledLocales.includes('bn'))
      throw new BadRequestException(
        'Bangla is not enabled for this storefront',
      );
    const ids = dto.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Duplicate product lines are not allowed');
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existing = await manager
          .getRepository(Order)
          .createQueryBuilder('order')
          .where(
            'order.storefrontSiteId = :siteId AND order.checkoutIdempotencyKey = :key',
            { siteId: site.id, key: idempotencyKey },
          )
          .getOne();
        const payloadHash = this.tokenHash(JSON.stringify({ items: [...dto.items].sort((a, b) => a.productId.localeCompare(b.productId)), customerName: dto.customerName.trim(), phone: normalizedPhone, deliveryMethod, address: dto.shippingAddress?.trim() || '', note: dto.notes?.trim() || '' }));
        if (existing) {
          if ((existing.customerSnapshot as any)?.payloadHash && (existing.customerSnapshot as any).payloadHash !== payloadHash)
            this.fail(HttpStatus.CONFLICT, 'IDEMPOTENCY_CONFLICT', 'This retry key was already used for a different order');
          return this.orderReceipt(
            existing,
            existing.publicToken || this.confirmationToken(existing.id, idempotencyKey),
          );
        }
        const products = await manager
          .getRepository(Product)
          .createQueryBuilder('product')
          .where('product.id IN (:...ids)', { ids })
          .andWhere('product.organizationId = :organizationId', {
            organizationId: site.organizationId,
          })
          .andWhere('product.status = :status', {
            status: ProductStatus.ACTIVE,
          })
          .andWhere('product.storefrontVisible = true')
          .getMany();
        if (products.length !== ids.length)
          throw new BadRequestException('One or more products are unavailable');
        const byId = new Map(products.map((product) => [product.id, product]));
        let subtotal = 0;
        let taxAmount = 0;
        const rows = dto.items.map((line) => {
          const product = byId.get(line.productId)!;
          if (
            product.trackStock &&
            !product.allowBackorder &&
            product.stock < line.quantity
          )
            throw new BadRequestException(
              `${product.name} does not have enough stock`,
            );
          const lineSubtotal = this.money(
            Number(product.price) * line.quantity,
          );
          const lineTax = this.money(
            lineSubtotal * (Number(product.taxRate || 0) / 100),
          );
          subtotal = this.money(subtotal + lineSubtotal);
          taxAmount = this.money(taxAmount + lineTax);
          return { product, quantity: line.quantity, total: lineSubtotal };
        });
        const shippingAmount = quote.shippingAmount;
        const pendingToday = await manager.getRepository(Order).createQueryBuilder('order')
          .where('order.organizationId = :organizationId', { organizationId: site.organizationId })
          .andWhere('order.source = :source', { source: OrderSource.STOREFRONT })
          .andWhere('order.status = :status', { status: OrderStatus.PENDING })
          .andWhere('order.customerPhone = :phone', { phone: normalizedPhone })
          .andWhere('order.createdAt >= :today', { today: new Date(Date.now() - 24 * 60 * 60 * 1000) }).getCount();
        if (pendingToday >= Number(process.env.CMS_ORDER_PHONE_DAILY_LIMIT || 5))
          this.fail(HttpStatus.TOO_MANY_REQUESTS, 'LIMIT_REACHED', 'Too many pending orders for this phone number. Please contact the shop.');
        const customerRepository = manager.getRepository(Customer);
        let customer = await customerRepository.createQueryBuilder('customer')
          .where('customer.organizationId = :organizationId', { organizationId: site.organizationId })
          .andWhere("regexp_replace(customer.phone, '[^0-9]', '', 'g') IN (:...phones)", { phones: [normalizedPhone, `88${normalizedPhone}`] })
          .getOne();
        if (!customer) customer = await customerRepository.save(customerRepository.create({
          organizationId: site.organizationId,
          name: dto.customerName.trim(),
          phone: normalizedPhone,
          email: dto.customerEmail?.trim() || null as any,
          address: deliveryMethod === 'delivery' ? dto.shippingAddress?.trim() || null as any : null as any,
          city: dto.shippingCity?.trim() || null as any,
        }));
        const order = manager.create(Order, {
          orderNumber: `WEB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`,
          source: OrderSource.STOREFRONT,
          storefrontSiteId: site.id,
          storefrontLocale: dto.locale || site.defaultLocale,
          checkoutIdempotencyKey: idempotencyKey,
          customerName: dto.customerName.trim(),
          customerPhone: normalizedPhone,
          customerEmail: dto.customerEmail?.trim() || undefined,
          shippingAddress: dto.shippingAddress?.trim() || '',
          shippingCity: dto.shippingCity?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          subtotal,
          taxAmount,
          shippingAmount,
          discountAmount: 0,
          total: this.money(subtotal + taxAmount + shippingAmount),
          paidAmount: 0,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.COD,
          paymentMethod: PaymentMethod.COD,
          organizationId: site.organizationId,
          customerId: customer.id,
          locale: dto.locale || site.defaultLocale,
          deliveryMethod: deliveryMethod === 'pickup' ? DeliveryMethod.PICKUP : DeliveryMethod.DELIVERY,
          deliveryAddress: deliveryMethod === 'delivery' ? { address: dto.shippingAddress?.trim(), city: dto.shippingCity?.trim() } : null,
          customerNote: dto.notes?.trim() || null,
          idempotencyKey,
          publicToken: randomBytes(24).toString('base64url'),
          ownerSeenAt: null,
          customerSnapshot: { name: dto.customerName.trim(), phone: normalizedPhone, payloadHash } as any,
        });
        const saved = await manager.save(order);
        const token = saved.publicToken || this.confirmationToken(saved.id, idempotencyKey);
        saved.confirmationTokenHash = this.tokenHash(token);
        saved.confirmationExpiresAt = new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        );
        await manager.save(saved);
        saved.items = await manager.save(
          rows.map((row) =>
            manager.create(OrderItem, {
              orderId: saved.id,
              productId: row.product.id,
              productName: row.product.name,
              productSku: row.product.sku || undefined,
              unitPrice: row.product.price,
              unitCost: row.product.cost,
              quantity: row.quantity,
              discountAmount: 0,
              total: row.total,
            }),
          ),
        );
        return this.orderReceipt(saved, token);
      });
    } catch (error: any) {
      if (error?.code !== '23505') throw error;
      const existing = await this.dataSource.getRepository(Order).findOne({
        where: {
          storefrontSiteId: site.id,
          checkoutIdempotencyKey: idempotencyKey,
        },
      });
      if (!existing) throw error;
      return this.orderReceipt(
        existing,
        this.confirmationToken(existing.id, idempotencyKey),
      );
    }
  }
  async confirmation(rawSlug: string, token: string) {
    if (!/^[A-Za-z0-9_-]{32,100}$/.test(token))
      throw new NotFoundException('Order confirmation not found');
    const site = await this.requirePublicSite(rawSlug);
    const hash = this.tokenHash(token);
    const order = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where(
        'order.storefrontSiteId = :siteId AND order.confirmationTokenHash = :hash',
        { siteId: site.id, hash },
      )
      .getOne();
    if (
      !order ||
      !order.confirmationExpiresAt ||
      order.confirmationExpiresAt < new Date()
    )
      throw new NotFoundException('Order confirmation not found');
    return this.orderReceipt(order);
  }
  listAssets(organizationId: string) {
    return this.assets.find({
      where: { organizationId, deletedAt: IsNull() },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }
  async addAsset(
    organizationId: string,
    file: { buffer: Buffer; size: number; originalname?: string },
    metadata: AssetMetadataDto,
  ) {
    const site = await this.requireCmsSite(organizationId);
    const maxBytes = Number(process.env.STOREFRONT_MAX_UPLOAD_MB || 5) * 1024 * 1024;
    if (
      !file?.buffer ||
      file.buffer.length < 1 ||
      file.buffer.length > maxBytes
    )
      throw new BadRequestException(`Images must be between 1 byte and ${Number(process.env.STOREFRONT_MAX_UPLOAD_MB || 5)} MB`);
    const quotaBytes = Number(process.env.STOREFRONT_ASSET_QUOTA_MB || 250) * 1024 * 1024;
    const usage = await this.assets.createQueryBuilder('asset').select('COALESCE(SUM(asset.size), 0)', 'bytes')
      .where('asset.organizationId = :organizationId', { organizationId }).andWhere('asset.deletedAt IS NULL').getRawOne();
    if (Number(usage?.bytes || 0) + file.buffer.length > quotaBytes)
      this.fail(HttpStatus.CONFLICT, 'LIMIT_REACHED', 'Storefront media storage is full', { action: 'review-unused-assets' });
    const info = this.assetStorage.inspect(file.buffer);
    const storageKey = await this.assetStorage.write(
      organizationId,
      file.buffer,
      info.extension,
    );
    const asset = this.assets.create({
      organizationId,
      siteId: site.id,
      storageKey,
      originalFilename: (file.originalname || 'image').slice(0, 255),
      url: '',
      mimeType: info.mimeType,
      size: file.buffer.length,
      width: info.width,
      height: info.height,
      altTextEn: metadata.altTextEn.trim(),
      altTextBn: metadata.altTextBn?.trim() || null,
      alt: { en: metadata.altTextEn.trim(), ...(metadata.altTextBn ? { bn: metadata.altTextBn.trim() } : {}) },
      decorative: false,
    });
    try {
      asset.url = `/backend-api/storefront/assets/public/${asset.id || ''}`;
      const saved = await this.assets.save(asset);
      if (!saved.url.endsWith(saved.id))
        saved.url = `/backend-api/storefront/assets/public/${saved.id}`;
      return this.assets.save(saved);
    } catch (error) {
      await this.assetStorage.remove(storageKey);
      throw error;
    }
  }
  async updateAsset(id: string, organizationId: string, dto: UpdateAssetDto) {
    const asset = await this.requireAsset(id, organizationId);
    asset.altTextEn = dto.altTextEn.trim();
    asset.altTextBn = dto.altTextBn?.trim() || null;
    asset.alt = { en: asset.altTextEn, ...(asset.altTextBn ? { bn: asset.altTextBn } : {}) };
    asset.sortOrder = dto.sortOrder;
    return this.assets.save(asset);
  }
  async assetUsage(id: string, organizationId: string) {
    const asset = await this.requireAsset(id, organizationId);
    const pages = await this.dataSource.getRepository(StorefrontPage).find({ where: { organizationId } });
    const needles = [asset.id, asset.url, asset.storageKey];
    const usage = pages.filter((page) => needles.some((needle) => JSON.stringify([page.draftDocument, page.publishedDocument]).includes(needle)))
      .map((page) => ({ itemType: 'page', itemId: page.id, title: page.title }));
    const site = await this.requireCmsSite(organizationId);
    if (needles.some((needle) => JSON.stringify([site.draftSettings, site.publishedSettings]).includes(needle)))
      usage.push({ itemType: 'settings', itemId: site.id, title: 'Site settings' });
    return { assetId: id, usage };
  }
  async deleteAsset(id: string, organizationId: string) {
    const [asset, site] = await Promise.all([
      this.requireAsset(id, organizationId),
      this.requireCmsSite(organizationId),
    ]);
    const serialized = JSON.stringify([
      site.draftDocument,
      site.publishedDocument,
    ]);
    if (
      serialized.includes(asset.url) ||
      serialized.includes(asset.storageKey) ||
      (await this.pageService.referencesAsset(organizationId, asset.url)) ||
      (await this.pageService.referencesAsset(organizationId, asset.storageKey))
    )
      throw new ConflictException(
        'Remove this image from every draft and published page before deleting it',
      );
    await this.assets.remove(asset);
    await this.assetStorage.remove(asset.storageKey);
    return { deleted: true };
  }
  async getPublicAsset(id: string) {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return { asset, buffer: await this.assetStorage.read(asset.storageKey) };
  }
  private async requireAsset(id: string, organizationId: string) {
    return this.tenant.require(this.assets, organizationId, { id }, 'Asset');
  }
  private async assertOwnedAssetReferences(
    site: StorefrontSite,
    repository: Repository<StorefrontAsset>,
  ) {
    const matches = JSON.stringify(site.draftDocument).matchAll(
      /\/(?:backend-api\/)?storefront\/assets\/public\/([0-9a-f-]{36})/gi,
    );
    const ids = [...new Set(Array.from(matches, (match) => match[1]))];
    if (!ids.length) return;
    const count = await repository
      .createQueryBuilder('asset')
      .where('asset.organizationId = :organizationId', {
        organizationId: site.organizationId,
      })
      .andWhere('asset.id IN (:...ids)', { ids })
      .getCount();
    if (count !== ids.length)
      throw new BadRequestException(
        'The draft references an image owned by another organization or an image that no longer exists',
      );
  }
  private async requirePublicSite(rawSlug: string, requireOrdering = true) {
    const slug = this.normalizeSlug(rawSlug);
    const site = await this.sites.findOne({
      where: { slug },
      relations: ['organization', 'organization.subscription'],
    });
    if (
      !site ||
      !site.publishedDocument ||
      site.status !== StorefrontPublicationStatus.PUBLISHED
    )
      throw new NotFoundException('Storefront not found');
    if (
      !site.organization?.isActive ||
      !this.isSubscriptionActive(site)
    ) {
      throw new ServiceUnavailableException({
        message: 'This store is temporarily unavailable',
        storefront: {
          name: site.organization?.name,
          logo: site.organization?.logo,
          themeTokens: site.themeTokens,
        },
      });
    }
    if (requireOrdering && !site.orderingEnabled)
      this.fail(HttpStatus.LOCKED, 'ORDERING_PAUSED', this.localized(site.orderingPausedMessage, site.defaultLocale) || 'Ordering is paused');
    return site;
  }
  private async publicSite(site: StorefrontSite) {
    const navigation = await this.pageService.navigation(site.id);
    return {
      slug: site.slug,
      name: site.organization.name,
      logo: site.organization.logo,
      enabledLocales: site.enabledLocales,
      defaultLocale: site.defaultLocale,
      themeTokens: site.themeTokens,
      seoSettings: site.seoSettings,
      orderSettings: site.orderSettings,
      document: site.publishedDocument,
      publishedVersion: site.publishedVersion,
      publishedAt: site.publishedAt,
      navigation,
    };
  }
  private publicProduct(product: Product) {
    return {
      id: product.id,
      slug: product.slug || product.id,
      name: product.name,
      nameBn: product.nameBn,
      description: product.description,
      descriptionBn: product.descriptionBn,
      longDescription: product.longDescription,
      longDescriptionBn: product.longDescriptionBn,
      category: product.category,
      price: Number(product.price),
      image: product.image,
      imageAltText: product.imageAltText,
      imageAltTextBn: product.imageAltTextBn,
      available:
        !product.trackStock || product.allowBackorder || product.stock > 0,
      createdAt: product.createdAt,
    };
  }
  private money(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
  private confirmationToken(orderId: string, key: string) {
    return createHmac(
      'sha256',
      process.env.CONFIRMATION_TOKEN_SECRET ||
        process.env.JWT_SECRET ||
        'local-development-secret',
    )
      .update(`${orderId}:${key}`)
      .digest('base64url');
  }
  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private orderReceipt(order: Order, confirmationToken?: string) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingAmount: Number(order.shippingAmount),
      total: Number(order.total),
      locale: order.storefrontLocale,
      deliveryMethod: order.deliveryMethod,
      deliveryAddress: order.deliveryAddress,
      customerNote: order.customerNote,
      items: (order.items || []).map((item) => ({ productId: item.productId, name: item.productName, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), total: Number(item.total) })),
      confirmationToken,
    };
  }
  private async invalidatePublishedCache(slug: string) {
    const frontend = process.env.FRONTEND_1_URL;
    const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
    if (!frontend || !secret) return;
    try {
      const response = await fetch(
        `${frontend.replace(/\/$/, '')}/api/storefront/revalidate`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-revalidate-secret': secret,
          },
          body: JSON.stringify({ slug }),
          signal: AbortSignal.timeout(2500),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      this.logger.warn(
        `Storefront ${slug} was published but cache invalidation will rely on its TTL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  private async requireCmsSite(organizationId: string) {
    return this.tenant.require(this.sites, organizationId, {}, 'Storefront');
  }

  private isSubscriptionActive(site: StorefrontSite) {
    const subscription = site.organization?.subscription;
    const now = new Date();
    return !!subscription && ((subscription.status === SubscriptionStatus.ACTIVE && subscription.endDate > now) || (subscription.status === SubscriptionStatus.TRIAL && !!subscription.trialEndDate && subscription.trialEndDate > now));
  }

  private branding(site: StorefrontSite) {
    return site.publishedSettings || site.draftSettings || { brand: { name: { en: site.organization?.name || '' } }, theme: site.themeTokens, contact: { phone: site.organization?.phone || '' } };
  }

  private defaultSettings(organization: Organization) {
    return {
      brand: { name: { en: organization.name }, logoAssetId: null, faviconAssetId: null },
      theme: { ...DEFAULT_THEME, background: '#ffffff', text: '#0f172a' },
      contact: { phone: organization.phone || '', address: { en: organization.address || '' }, city: organization.city || '', country: organization.country || '' },
      header: { showSearch: true, showLanguageSwitcher: true },
      footer: { text: { en: 'Thank you for visiting.' }, showContact: true },
      seo: DEFAULT_SEO,
      orders: { deliveryEnabled: true, pickupEnabled: false, deliveryFee: 0, freeDeliveryOver: null, minOrderAmount: null, maxQtyPerLine: 20, maxLines: 30, noteEnabled: true, orderInstructions: { en: '' } },
    };
  }

  private orderConfig(site: StorefrontSite) {
    const source: any = (site.publishedSettings as any)?.orders || (site.draftSettings as any)?.orders || site.orderSettings || {};
    const number = (camel: string, snake: string, fallback: number | null) => source[camel] ?? source[snake] ?? fallback;
    return {
      deliveryEnabled: source.deliveryEnabled ?? source.delivery_enabled ?? true,
      pickupEnabled: source.pickupEnabled ?? source.pickup_enabled ?? false,
      deliveryFee: this.money(Number(number('deliveryFee', 'delivery_fee', 0))),
      freeDeliveryOver: number('freeDeliveryOver', 'free_delivery_over', null) == null ? null : Number(number('freeDeliveryOver', 'free_delivery_over', null)),
      minOrderAmount: number('minOrderAmount', 'min_order_amount', null) == null ? null : Number(number('minOrderAmount', 'min_order_amount', null)),
      maxQtyPerLine: Number(number('maxQtyPerLine', 'max_qty_per_line', 20)),
      maxLines: Number(number('maxLines', 'max_lines', 30)),
      phone: String((site.publishedSettings as any)?.contact?.phone || (site.draftSettings as any)?.contact?.phone || (site.orderSettings as any)?.phone || ''),
    };
  }

  private normalizeBangladeshPhone(input: string) {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('880')) digits = `0${digits.slice(3)}`;
    if (!/^01[3-9]\d{8}$/.test(digits))
      this.fail(HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_FAILED', 'Enter a valid Bangladesh phone number, for example 01712345678', { field: 'customerPhone' });
    return digits;
  }

  private localized(value: Partial<Record<'en' | 'bn', string>> | null | undefined, locale: 'en' | 'bn') {
    return value?.[locale] || value?.en || value?.bn || '';
  }

  private fail(status: number, code: string, message: string, details?: unknown): never {
    throw new HttpException({ code, message, ...(details === undefined ? {} : { details }) }, status);
  }
}
