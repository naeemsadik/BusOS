import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  StorefrontAsset,
  StorefrontPage,
  StorefrontPageRedirect,
  StorefrontPageRevision,
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
import { DEFAULT_SEO } from './storefront.types';

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
  ) {}

  list(organizationId: string) {
    return this.pages.find({
      where: { organizationId },
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
      const page = await repository.findOne({
        where: { id: pageId, organizationId },
      });
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
      page.slug = nextSlug;
      if (dto.includeInNavigation !== undefined)
        page.includeInNavigation = page.isHomePage
          ? false
          : dto.includeInNavigation;
      if (dto.navigationLabel)
        page.navigationLabel = this.cleanLabels(dto.navigationLabel);
      if (dto.navigationOrder !== undefined)
        page.navigationOrder = dto.navigationOrder;
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
      if (oldSlug !== nextSlug && dto.createRedirect)
        await manager
          .getRepository(StorefrontPageRedirect)
          .upsert(
            {
              organizationId,
              siteId: page.siteId,
              pageId: page.id,
              fromSlug: oldSlug,
              toSlug: nextSlug,
            },
            ['siteId', 'fromSlug'],
          );
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
      validateStorefrontDocument(page.draftDocument);
      validateSeo(page.seoSettings);
      const issues = this.reviewService.review(
        page.draftDocument,
        page.seoSettings,
        page.enabledLocales,
        page.pageType,
      );
      const mustFix = issues.filter((issue) => issue.severity === 'mustFix');
      if (mustFix.length)
        throw new BadRequestException({
          message: 'Resolve required page issues before publishing',
          issues,
        });
      await this.assertOwnedAssets(page, manager);
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
    page.status = StorefrontPageStatus.DRAFT;
    page.publishedDocument = null;
    page.publishedVersion = null;
    page.publishedAt = null;
    page.updatedBy = userId;
    if (page.isHomePage)
      await this.sites.update(
        { id: page.siteId, organizationId },
        {
          status: StorefrontPublicationStatus.DRAFT,
          publishedDocument: null,
          publishedVersion: null,
          publishedAt: null,
        },
      );
    return this.pages.save(page);
  }

  async archive(pageId: string, organizationId: string, userId: string) {
    const page = await this.requirePage(pageId, organizationId);
    if (page.isHomePage)
      throw new BadRequestException(
        'The home page cannot be archived; publish another home page first',
      );
    page.status = StorefrontPageStatus.ARCHIVED;
    page.includeInNavigation = false;
    page.publishedDocument = null;
    page.publishedVersion = null;
    page.updatedBy = userId;
    return this.pages.save(page);
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
    return {
      issues: this.reviewService.review(
        page.draftDocument,
        page.seoSettings,
        page.enabledLocales,
        page.pageType,
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
    const site = await this.sites.findOne({ where: { organizationId } });
    if (!site) throw new NotFoundException('Set up your storefront first');
    return site;
  }
  private async requirePage(id: string, organizationId: string) {
    const page = await this.pages.findOne({ where: { id, organizationId } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
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
        pageId: page.id,
        version: page.draftVersion,
        document: JSON.parse(JSON.stringify(page.draftDocument)),
        settings: {
          seoSettings: page.seoSettings,
          enabledLocales: page.enabledLocales,
        },
        origin,
        authorId,
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
}
