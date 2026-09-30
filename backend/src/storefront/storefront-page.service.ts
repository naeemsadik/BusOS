import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import {
  Product,
  ProductStatus,
  StorefrontAsset,
  StorefrontPage,
  StorefrontPageRedirect,
  StorefrontPageRevision,
  StorefrontRevisionKind,
  StorefrontPageKind,
  StorefrontPageLifecycleStatus,
  StorefrontPageStatus,
  StorefrontPageType,
  StorefrontPublicationStatus,
  StorefrontRevisionOrigin,
  StorefrontSite,
} from '../entities';
import {
  CreateStorefrontPageDto,
  DuplicateStorefrontPageDto,
  RestoreStorefrontPageRevisionDto,
  UpdateStorefrontPageDto,
} from './storefront.dto';
import {
  validateSeo,
  validateStorefrontDocument,
} from './storefront-document.validator';
import {
  addLocalePlaceholders,
  pageTemplate,
} from './storefront-page.templates';
import { StorefrontPageReviewService } from './storefront-page-review.service';
import { TenantScope } from './tenant-scope';

const RESERVED_PAGE_PATHS = new Set([
  'admin',
  'api',
  'assets',
  'bn',
  'cart',
  'catalog',
  'checkout',
  'confirmation',
  'product',
  'products',
  'order',
  'orders',
  'pages',
  'search',
  'en',
  'static',
]);

@Injectable()
export class StorefrontPageService {
  constructor(
    @InjectRepository(StorefrontPage)
    private readonly pages: Repository<StorefrontPage>,
    @InjectRepository(StorefrontPageRevision)
    private readonly revisions: Repository<StorefrontPageRevision>,
    @InjectRepository(StorefrontPageRedirect)
    private readonly redirects: Repository<StorefrontPageRedirect>,
    @InjectRepository(StorefrontSite)
    private readonly sites: Repository<StorefrontSite>,
    @InjectRepository(StorefrontAsset)
    private readonly assets: Repository<StorefrontAsset>,
    private readonly dataSource: DataSource,
    private readonly reviewService: StorefrontPageReviewService,
    private readonly tenant: TenantScope,
  ) {}

  list(organizationId: string) {
    return this.pages.find({
      where: { organizationId, deletedAt: IsNull() },
      order: { isHomePage: 'DESC', navigationOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async get(pageId: string, organizationId: string) {
    return this.requirePage(pageId, organizationId);
  }

  async create(
    dto: CreateStorefrontPageDto,
    organizationId: string,
    userId: string,
  ) {
    const site = await this.requireSite(organizationId);
    if (dto.pageType !== StorefrontPageType.HOME) {
      const customCount = await this.pages.count({
        where: {
          organizationId,
          siteId: site.id,
          kind: StorefrontPageKind.CUSTOM,
          deletedAt: IsNull(),
        },
      });
      if (customCount >= 10)
        throw new BadRequestException('A storefront can have at most 10 custom pages');
    }
    const slug = this.normalizeSlug(dto.slug);
    const isHome = dto.pageType === StorefrontPageType.HOME;
    this.assertPageSlug(slug, isHome);
    if (
      isHome &&
      (await this.pages.exist({
        where: {
          siteId: site.id,
          isHomePage: true,
          status: In([
            StorefrontPageStatus.DRAFT,
            StorefrontPageStatus.PUBLISHED,
          ]),
        },
      }))
    )
      throw new ConflictException('This storefront already has a home page');
    const document = addLocalePlaceholders(
      pageTemplate(dto.pageType, dto.startMode, dto.facts),
      dto.enabledLocales,
    );
    validateStorefrontDocument(document);
    const page = this.pages.create({
      organizationId,
      siteId: site.id,
      title: dto.title.trim(),
      slug,
      pageType: dto.pageType as StorefrontPageType,
      isHomePage: isHome,
      kind: isHome ? StorefrontPageKind.HOME : StorefrontPageKind.CUSTOM,
      lifecycleStatus: StorefrontPageLifecycleStatus.DRAFT,
      localizedTitle: { en: dto.title.trim() },
      includeInNavigation: isHome ? false : dto.includeInNavigation,
      navigationLabel: { en: dto.title.trim() },
      enabledLocales: dto.enabledLocales,
      seoSettings: { title: { en: dto.title.trim() }, description: { en: '' } },
      draftDocument: document,
      createdBy: userId,
      updatedBy: userId,
    });
    try {
      const saved = await this.pages.save(page);
      await this.saveRevision(
        saved,
        dto.startMode === 'guided'
          ? StorefrontRevisionOrigin.TEMPLATE
          : StorefrontRevisionOrigin.TEMPLATE,
        userId,
      );
      return saved;
    } catch (error: any) {
      if (error?.code === '23505')
        throw new ConflictException('That page address is already in use');
      throw error;
    }
  }

  async update(
    pageId: string,
    dto: UpdateStorefrontPageDto,
    organizationId: string,
    userId: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(StorefrontPage);
      const page = await repository
        .createQueryBuilder('page')
        .setLock('pessimistic_write')
        .where('page.id = :pageId AND page.organizationId = :organizationId', {
          pageId,
          organizationId,
        })
        .getOne();
      if (!page) throw new NotFoundException('Page not found');
      if (page.draftVersion !== dto.expectedVersion)
        throw new ConflictException({
          message: 'The draft changed in another session',
          currentVersion: page.draftVersion,
        });
      if (page.status === StorefrontPageStatus.ARCHIVED)
        throw new BadRequestException(
          'Restore or duplicate an archived page before editing it',
        );
      if (dto.document) validateStorefrontDocument(dto.document);
      if (dto.seoSettings) validateSeo(dto.seoSettings);
      if (
        dto.enabledLocales &&
        (!dto.enabledLocales.includes('en') || !dto.enabledLocales.length)
      )
        throw new BadRequestException('English must remain enabled');
      const nextSlug = dto.slug ? this.normalizeSlug(dto.slug) : page.slug;
      this.assertPageSlug(nextSlug, page.isHomePage);
      if (
        nextSlug !== page.slug &&
        page.status === StorefrontPageStatus.PUBLISHED &&
        dto.createRedirect !== true
      )
        throw new BadRequestException(
          'Choose to create a redirect before changing a published page address',
        );
      await this.saveRevision(
        page,
        this.revisionOrigin(dto.origin),
        userId,
        manager,
      );
      const oldSlug = page.slug;
      page.title = dto.title?.trim() || page.title;
      page.localizedTitle = { ...page.localizedTitle, en: page.title };
      page.slug = nextSlug;
      if (dto.includeInNavigation !== undefined)
        page.includeInNavigation = page.isHomePage
          ? false
          : dto.includeInNavigation;
      if (dto.navigationLabel)
        page.navigationLabel = this.cleanLabels(dto.navigationLabel);
      if (dto.navigationOrder !== undefined)
        page.navigationOrder = dto.navigationOrder;
      page.showInMenu = page.includeInNavigation;
      page.menuOrder = page.navigationOrder;
      if (dto.enabledLocales) page.enabledLocales = dto.enabledLocales;
      if (dto.seoSettings) page.seoSettings = dto.seoSettings as any;
      if (dto.document) page.draftDocument = dto.document;
      page.updatedBy = userId;
      page.draftVersion += 1;
      let saved: StorefrontPage;
      try {
        saved = await repository.save(page);
      } catch (error: any) {
        if (error?.code === '23505')
          throw new ConflictException('That page address is already in use');
        throw error;
      }
      if (oldSlug !== nextSlug && dto.createRedirect) {
        const redirectRepository = manager.getRepository(
          StorefrontPageRedirect,
        );
        const redirect =
          (await redirectRepository.findOne({
            where: { siteId: page.siteId, fromSlug: oldSlug },
          })) ||
          redirectRepository.create({
            organizationId,
            siteId: page.siteId,
            pageId: page.id,
            fromSlug: oldSlug,
          });
        redirect.toSlug = nextSlug;
        await redirectRepository.save(redirect);
      }
      await this.trimRevisions(page.id, manager);
      return saved;
    });
  }

  async duplicate(
    pageId: string,
    dto: DuplicateStorefrontPageDto,
    organizationId: string,
    userId: string,
  ) {
    const source = await this.requirePage(pageId, organizationId);
    const slug = this.normalizeSlug(dto.slug);
    this.assertPageSlug(slug, false);
    const copy = this.pages.create({
      organizationId,
      siteId: source.siteId,
      title: dto.title.trim(),
      slug,
      pageType: source.pageType,
      status: StorefrontPageStatus.DRAFT,
      isHomePage: false,
      kind: StorefrontPageKind.CUSTOM,
      lifecycleStatus: StorefrontPageLifecycleStatus.DRAFT,
      localizedTitle: { en: dto.title.trim() },
      includeInNavigation: false,
      navigationLabel: { en: dto.title.trim() },
      enabledLocales: source.enabledLocales,
      seoSettings: JSON.parse(JSON.stringify(source.seoSettings)),
      draftDocument: JSON.parse(JSON.stringify(source.draftDocument)),
      createdBy: userId,
      updatedBy: userId,
    });
    try {
      const saved = await this.pages.save(copy);
      await this.saveRevision(saved, StorefrontRevisionOrigin.MANUAL, userId);
      return saved;
    } catch (error: any) {
      if (error?.code === '23505')
        throw new ConflictException('That page address is already in use');
      throw error;
    }
  }

  async publish(pageId: string, organizationId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const page = await manager
        .getRepository(StorefrontPage)
        .createQueryBuilder('page')
        .setLock('pessimistic_write')
        .where('page.id = :pageId AND page.organizationId = :organizationId', {
          pageId,
          organizationId,
        })
        .getOne();
      if (!page || page.status === StorefrontPageStatus.ARCHIVED)
        throw new NotFoundException('Page not found');
      validateStorefrontDocument(page.draftDocument, { publish: true });
      validateSeo(page.seoSettings);
      const site = await manager.getRepository(StorefrontSite).findOne({
        where: { id: page.siteId, organizationId },
      });
      const issues = this.reviewService.review(
        page.draftDocument,
        page.seoSettings,
        page.enabledLocales,
        page.pageType,
        site?.themeTokens,
      );
      const mustFix = issues.filter((issue) => issue.severity === 'mustFix');
      if (mustFix.length)
        throw new BadRequestException({
          message: 'Resolve required page issues before publishing',
          issues,
        });
      await this.assertOwnedAssets(page, manager);
      await this.assertCatalogReferences(page, manager);
      await this.assertInternalLinks(page, manager);
      await this.saveRevision(
        page,
        StorefrontRevisionOrigin.MANUAL,
        userId,
        manager,
      );
      page.publishedDocument = JSON.parse(JSON.stringify(page.draftDocument));
      page.publishedVersion = page.draftVersion;
      page.publishedAt = new Date();
      page.status = StorefrontPageStatus.PUBLISHED;
      page.lifecycleStatus = StorefrontPageLifecycleStatus.PUBLISHED;
      page.updatedBy = userId;
      const saved = await manager.save(page);
      if (saved.isHomePage) {
        await manager.getRepository(StorefrontSite).update(
          { id: saved.siteId, organizationId },
          {
            publishedDocument: saved.publishedDocument,
            publishedVersion: saved.publishedVersion,
            publishedAt: saved.publishedAt,
            draftDocument: saved.draftDocument,
            draftVersion: saved.draftVersion,
            seoSettings: saved.seoSettings,
            enabledLocales: saved.enabledLocales,
            status: StorefrontPublicationStatus.PUBLISHED,
          },
        );
      }
      await this.trimRevisions(page.id, manager);
      return { ...saved, review: issues };
    });
  }

  async unpublish(pageId: string, organizationId: string, userId: string) {
    const page = await this.requirePage(pageId, organizationId);
    if (page.isHomePage)
      throw new BadRequestException("Home can't be removed. Replace its content or unpublish the whole shop.");
    page.status = StorefrontPageStatus.DRAFT;
    page.lifecycleStatus = StorefrontPageLifecycleStatus.UNPUBLISHED;
    page.includeInNavigation = false;
    page.showInMenu = false;
    page.updatedBy = userId;
    const saved = await this.pages.save(page);
    void this.invalidateSite(page.siteId, organizationId);
    return saved;
  }

  async archive(pageId: string, organizationId: string, userId: string) {
    const page = await this.requirePage(pageId, organizationId);
    if (page.isHomePage)
      throw new BadRequestException(
        'The home page cannot be archived; publish another home page first',
      );
    page.status = StorefrontPageStatus.ARCHIVED;
    page.lifecycleStatus = page.publishedDocument ? StorefrontPageLifecycleStatus.UNPUBLISHED : StorefrontPageLifecycleStatus.DRAFT;
    page.includeInNavigation = false;
    page.showInMenu = false;
    page.deletedAt = new Date();
    page.purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    page.updatedBy = userId;
    const saved = await this.pages.save(page);
    void this.invalidateSite(page.siteId, organizationId);
    return saved;
  }

  listTrash(organizationId: string) {
    return this.pages.createQueryBuilder('page')
      .where('page.organizationId = :organizationId', { organizationId })
      .andWhere('page.deletedAt IS NOT NULL')
      .orderBy('page.deletedAt', 'DESC').getMany();
  }

  async restoreFromTrash(pageId: string, organizationId: string, userId: string, slug?: string) {
    const page = await this.pages.findOne({ where: { id: pageId, organizationId } });
    if (!page?.deletedAt) throw new NotFoundException('Page not found in Trash');
    if (slug) page.slug = this.normalizeSlug(slug);
    const collision = await this.pages.createQueryBuilder('other')
      .where('other.siteId = :siteId AND lower(other.slug) = lower(:slug)', { siteId: page.siteId, slug: page.slug })
      .andWhere('other.deletedAt IS NULL').andWhere('other.id <> :id', { id: page.id }).getExists();
    if (collision) throw new ConflictException({ code: 'SLUG_TAKEN', message: 'Choose a new page address before restoring' });
    page.deletedAt = null;
    page.purgeAfter = null;
    page.status = StorefrontPageStatus.DRAFT;
    page.lifecycleStatus = page.publishedDocument ? StorefrontPageLifecycleStatus.UNPUBLISHED : StorefrontPageLifecycleStatus.DRAFT;
    page.updatedBy = userId;
    const saved = await this.pages.save(page);
    void this.invalidateSite(page.siteId, organizationId);
    return saved;
  }

  async purge(pageId: string, organizationId: string) {
    const page = await this.pages.findOne({ where: { id: pageId, organizationId } });
    if (!page?.deletedAt) throw new NotFoundException('Page not found in Trash');
    await this.pages.remove(page);
    return { deleted: true };
  }

  async takeDownSection(pageId: string, sectionId: string, organizationId: string, userId: string) {
    const page = await this.requirePage(pageId, organizationId);
    const published: any = page.publishedDocument;
    const draft: any = page.draftDocument;
    const live = published?.sections?.find((section: any) => section.id === sectionId);
    if (!live) throw new BadRequestException('This section has never been published');
    await this.saveRevision(page, StorefrontRevisionOrigin.MANUAL, userId);
    live.visible = false;
    const draftSection = draft?.sections?.find((section: any) => section.id === sectionId);
    if (draftSection) draftSection.visible = false;
    page.publishedDocument = published;
    page.draftDocument = draft;
    page.draftVersion += 1;
    page.updatedBy = userId;
    const saved = await this.pages.save(page);
    void this.invalidateSite(page.siteId, organizationId);
    return saved;
  }

  async listRevisions(pageId: string, organizationId: string) {
    await this.requirePage(pageId, organizationId);
    return this.revisions.find({
      where: { pageId, organizationId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async restore(
    pageId: string,
    revisionId: string,
    dto: RestoreStorefrontPageRevisionDto,
    organizationId: string,
    userId: string,
  ) {
    const revision = await this.revisions.findOne({
      where: { id: revisionId, pageId, organizationId },
    });
    if (!revision) throw new NotFoundException('Revision not found');
    return this.update(
      pageId,
      {
        expectedVersion: dto.expectedVersion,
        document: revision.document,
        seoSettings: revision.settings.seoSettings,
        enabledLocales: revision.settings.enabledLocales as any,
        origin: 'restore',
      },
      organizationId,
      userId,
    );
  }

  async review(pageId: string, organizationId: string) {
    const page = await this.requirePage(pageId, organizationId);
    const site = await this.requireSite(organizationId);
    return {
      issues: this.reviewService.review(
        page.draftDocument,
        page.seoSettings,
        page.enabledLocales,
        page.pageType,
        site.themeTokens,
      ),
    };
  }

  async navigation(siteId: string) {
    const pages = await this.pages.find({
      where: {
        siteId,
        status: StorefrontPageStatus.PUBLISHED,
        includeInNavigation: true,
      },
      order: { navigationOrder: 'ASC', createdAt: 'ASC' },
    });
    return pages.map((page) => ({
      slug: page.slug,
      label: page.navigationLabel,
      pageType: page.pageType,
    }));
  }

  async resolvePublic(siteId: string, rawSlug: string) {
    const slug = this.normalizeSlug(rawSlug);
    const page = await this.pages.findOne({
      where: { siteId, slug, status: StorefrontPageStatus.PUBLISHED },
    });
    if (page?.publishedDocument) return page;
    const redirect = await this.redirects.findOne({
      where: { siteId, fromSlug: slug },
    });
    if (redirect) return { redirectTo: redirect.toSlug };
    throw new NotFoundException('Page not found');
  }

  async referencesAsset(organizationId: string, value: string) {
    const pages = await this.pages.find({ where: { organizationId } });
    return pages.some((page) =>
      JSON.stringify([page.draftDocument, page.publishedDocument]).includes(
        value,
      ),
    );
  }

  private normalizeSlug(slug: string) {
    return slug.trim().toLowerCase();
  }
  private assertPageSlug(slug: string, isHome: boolean) {
    if (
      (!isHome && (slug === 'home' || RESERVED_PAGE_PATHS.has(slug))) ||
      (isHome && slug !== 'home')
    )
      throw new BadRequestException('That page address is reserved');
  }
  private async requireSite(organizationId: string) {
    return this.tenant.require(this.sites, organizationId, {}, 'Storefront');
  }
  private async requirePage(id: string, organizationId: string) {
    return this.tenant.require(this.pages, organizationId, { id, deletedAt: IsNull() as any }, 'Page');
  }
  private cleanLabels(labels: Record<string, string>) {
    return Object.fromEntries(
      Object.entries(labels)
        .filter(
          ([key, value]) =>
            ['en', 'bn'].includes(key) && typeof value === 'string',
        )
        .map(([key, value]) => [key, value.trim().slice(0, 80)]),
    );
  }
  private revisionOrigin(value?: string) {
    return (
      {
        manual: StorefrontRevisionOrigin.MANUAL,
        template: StorefrontRevisionOrigin.TEMPLATE,
        ai: StorefrontRevisionOrigin.AI,
        restore: StorefrontRevisionOrigin.RESTORE,
      } as any
    )[value || 'manual'];
  }
  private async saveRevision(
    page: StorefrontPage,
    origin: StorefrontRevisionOrigin,
    authorId: string,
    manager?: EntityManager,
  ) {
    const repository =
      manager?.getRepository(StorefrontPageRevision) || this.revisions;
    await repository.save(
      repository.create({
        organizationId: page.organizationId,
        siteId: page.siteId,
        pageId: page.id,
        version: page.draftVersion,
        document: JSON.parse(JSON.stringify(page.draftDocument)),
        settings: {
          seoSettings: page.seoSettings,
          enabledLocales: page.enabledLocales,
        },
        origin,
        kind: StorefrontRevisionKind.CHECKPOINT,
        label: origin === StorefrontRevisionOrigin.RESTORE ? 'Before revision restore' : 'Checkpoint',
        authorId,
        createdBy: authorId,
      }),
    );
  }
  private async trimRevisions(pageId: string, manager: EntityManager) {
    await manager.query(
      `DELETE FROM "storefront_page_revisions" WHERE "pageId" = $1 AND "id" NOT IN (SELECT "id" FROM "storefront_page_revisions" WHERE "pageId" = $1 ORDER BY "createdAt" DESC LIMIT 20)`,
      [pageId],
    );
  }
  private async assertOwnedAssets(
    page: StorefrontPage,
    manager: EntityManager,
  ) {
    const matches = JSON.stringify(page.draftDocument).matchAll(
      /\/(?:backend-api\/)?storefront\/assets\/public\/([0-9a-f-]{36})/gi,
    );
    const ids = [...new Set(Array.from(matches, (match) => match[1]))];
    if (!ids.length) return;
    const count = await manager
      .getRepository(StorefrontAsset)
      .count({ where: { organizationId: page.organizationId, id: In(ids) } });
    if (count !== ids.length)
      throw new BadRequestException(
        'The page references an image that is missing or belongs to another organization',
      );
  }

  private async assertCatalogReferences(
    page: StorefrontPage,
    manager: EntityManager,
  ) {
    const categories = [
      ...new Set(
        page.draftDocument.sections.flatMap((section) =>
          section.type === 'categoryNavigation'
            ? section.content.categories || []
            : [],
        ),
      ),
    ];
    if (!categories.length) return;
    const rows = await manager
      .getRepository(Product)
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.organizationId = :organizationId', {
        organizationId: page.organizationId,
      })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.storefrontVisible = true')
      .andWhere('product.category IN (:...categories)', { categories })
      .getRawMany();
    const available = new Set(rows.map((row) => row.category));
    if (categories.some((category) => !available.has(category)))
      throw new BadRequestException(
        'Replace categories that are hidden, deleted, or unavailable before publishing',
      );
  }

  private async assertInternalLinks(
    page: StorefrontPage,
    manager: EntityManager,
  ) {
    const builtIn = new Set([
      '',
      'home',
      'catalog',
      'product',
      'cart',
      'checkout',
      'confirmation',
    ]);
    const slugs = page.draftDocument.sections
      .map((section) => section.content.ctaHref)
      .filter(
        (href): href is string =>
          !!href && href.startsWith('/') && !href.startsWith('//'),
      )
      .map((href) => href.split(/[?#]/)[0].split('/').filter(Boolean)[0] || '')
      .filter((slug) => !builtIn.has(slug));
    if (!slugs.length) return;
    const unique = [...new Set(slugs)];
    const count = await manager.getRepository(StorefrontPage).count({
      where: {
        siteId: page.siteId,
        slug: In(unique),
        status: StorefrontPageStatus.PUBLISHED,
      },
    });
    if (count !== unique.length)
      throw new BadRequestException(
        'One or more internal links point to a page that is not published',
      );
  }

  private async invalidateSite(siteId: string, organizationId: string) {
    const frontend = process.env.FRONTEND_1_URL;
    const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
    if (!frontend || !secret) return;
    try {
      const site = await this.sites.findOne({ where: { id: siteId, organizationId } });
      if (!site) return;
      await fetch(`${frontend.replace(/\/$/, '')}/api/storefront/revalidate`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
        body: JSON.stringify({ slug: site.slug }), signal: AbortSignal.timeout(2500),
      });
    } catch { /* publish state is authoritative; TTL is the fallback */ }
  }
}
