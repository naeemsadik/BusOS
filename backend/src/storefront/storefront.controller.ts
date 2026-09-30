import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionModuleType } from '../entities';
import { RequiredPermission } from '../permissions/decorators/permission.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import {
  AssetMetadataDto,
  CreateStorefrontDto,
  CreateStorefrontOrderDto,
  CreateStorefrontPageDto,
  DuplicateStorefrontPageDto,
  PublicProductQueryDto,
  RestoreStorefrontPageRevisionDto,
  SaveStorefrontDraftDto,
  SlugAvailabilityDto,
  UpdateAssetDto,
  UpdateCmsAiPreferenceDto,
  UpdateStorefrontPageDto,
  BulkStorefrontProductsDto,
  CartQuoteDto,
  ChangeStorefrontSlugDto,
  LookupStorefrontOrderDto,
  SetStorefrontOrderingDto,
  UpdateStorefrontProfileDto,
  UpdateStorefrontSettingsDto,
  PublishStorefrontDto,
} from './storefront.dto';
import { StorefrontRateLimitService } from './storefront-rate-limit.service';
import { StorefrontService } from './storefront.service';
import { StorefrontPageService } from './storefront-page.service';
import { StorefrontAiService } from './storefront-ai.service';
import {
  CmsAiFieldSuggestionDto,
  CmsAiOutlineDto,
  CmsAiPageDraftDto,
  CmsAiReviewDto,
  CmsAiSuggestionOutcomeDto,
  CmsAiTranslateDto,
} from './storefront-ai.dto';
import { starterTemplates } from './storefront-page.templates';

@Controller('storefront')
export class StorefrontController {
  constructor(
    private readonly service: StorefrontService,
    private readonly pages: StorefrontPageService,
    private readonly ai: StorefrontAiService,
    private readonly rateLimit: StorefrontRateLimitService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms')
  get(@Req() req: any) {
    return this.service.getCmsSite(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Get('cms/slug-availability')
  availability(@Query() query: SlugAvailabilityDto) {
    return this.service.slugAvailability(query.slug);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms')
  create(@Body() dto: CreateStorefrontDto, @Req() req: any) {
    return this.service.create(dto, req.user.organization, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Patch('cms/settings')
  settings(@Body() dto: UpdateStorefrontSettingsDto, @Req() req: any) {
    return this.service.saveSettings(dto, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Patch('cms/profile')
  profile(@Body() dto: UpdateStorefrontProfileDto, @Req() req: any) {
    return this.service.saveProfile(dto, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/slug')
  changeSlug(@Body() dto: ChangeStorefrontSlugDto, @Req() req: any) {
    return this.service.changeSlug(dto, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/unpublish')
  unpublishSite(@Req() req: any) {
    return this.service.unpublishSite(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/ordering')
  ordering(@Body() dto: SetStorefrontOrderingDto, @Req() req: any) {
    return this.service.setOrdering(dto, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/request-publish')
  requestPublish(@Req() req: any) {
    return this.service.requestPublish(req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Get('cms/products-online')
  productsOnline(@Req() req: any) {
    return this.service.listProductsOnline(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Patch('cms/products-online/bulk')
  bulkProductsOnline(@Body() dto: BulkStorefrontProductsDto, @Req() req: any) {
    return this.service.bulkProductsOnline(dto, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/templates')
  templates() {
    return starterTemplates();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Put('cms/draft')
  save(@Body() dto: SaveStorefrontDraftDto, @Req() req: any) {
    return this.service.saveDraft(dto, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/publish')
  publish(@Body() dto: any, @Req() req: any) {
    if (dto?.items && dto?.idempotencyKey)
      return this.service.publishSelection(dto as PublishStorefrontDto, req.user.organization.id, req.user.id);
    return this.service.publish(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/checks')
  checks(@Req() req: any) {
    return this.service.checks(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/publish/preview')
  publishPreview(@Req() req: any) {
    return this.service.publishPreview(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/publish-selection')
  publishSelection(@Body() dto: PublishStorefrontDto, @Req() req: any) {
    return this.service.publishSelection(dto, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/pages')
  listPages(@Req() req: any) {
    return this.pages.list(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/pages')
  createPage(@Body() dto: CreateStorefrontPageDto, @Req() req: any) {
    return this.pages.create(dto, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/pages/trash')
  trash(@Req() req: any) {
    return this.pages.listTrash(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/pages/:pageId')
  getPage(@Param('pageId') pageId: string, @Req() req: any) {
    return this.pages.get(pageId, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Patch('cms/pages/:pageId')
  updatePage(
    @Param('pageId') pageId: string,
    @Body() dto: UpdateStorefrontPageDto,
    @Req() req: any,
  ) {
    return this.pages.update(
      pageId,
      dto,
      req.user.organization.id,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/pages/:pageId/duplicate')
  duplicatePage(
    @Param('pageId') pageId: string,
    @Body() dto: DuplicateStorefrontPageDto,
    @Req() req: any,
  ) {
    return this.pages.duplicate(
      pageId,
      dto,
      req.user.organization.id,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/pages/:pageId/publish')
  publishPage(@Param('pageId') pageId: string, @Req() req: any) {
    return this.pages.publish(pageId, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/pages/:pageId/unpublish')
  unpublishPage(@Param('pageId') pageId: string, @Req() req: any) {
    return this.pages.unpublish(pageId, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/pages/:pageId/archive')
  archivePage(@Param('pageId') pageId: string, @Req() req: any) {
    return this.pages.archive(pageId, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Delete('cms/pages/:pageId')
  deletePage(@Param('pageId') pageId: string, @Req() req: any) {
    return this.pages.archive(pageId, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/pages/:pageId/restore')
  restorePage(@Param('pageId') pageId: string, @Body() body: { slug?: string }, @Req() req: any) {
    return this.pages.restoreFromTrash(pageId, req.user.organization.id, req.user.id, body?.slug);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Delete('cms/pages/:pageId/purge')
  purgePage(@Param('pageId') pageId: string, @Req() req: any) {
    return this.pages.purge(pageId, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'publish')
  @Post('cms/pages/:pageId/sections/:sectionId/takedown')
  takedownSection(@Param('pageId') pageId: string, @Param('sectionId') sectionId: string, @Req() req: any) {
    return this.pages.takeDownSection(pageId, sectionId, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/pages/:pageId/revisions')
  revisions(@Param('pageId') pageId: string, @Req() req: any) {
    return this.pages.listRevisions(pageId, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/pages/:pageId/revisions/:revisionId/restore')
  restoreRevision(
    @Param('pageId') pageId: string,
    @Param('revisionId') revisionId: string,
    @Body() dto: RestoreStorefrontPageRevisionDto,
    @Req() req: any,
  ) {
    return this.pages.restore(
      pageId,
      revisionId,
      dto,
      req.user.organization.id,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/pages/:pageId/review')
  reviewPage(@Param('pageId') pageId: string, @Req() req: any) {
    return this.pages.review(pageId, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/ai/outline')
  aiOutline(@Body() dto: CmsAiOutlineDto, @Req() req: any) {
    return this.ai.outline(dto, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/ai/status')
  aiStatus(@Req() req: any) {
    return this.ai.status(req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/ai/suggest')
  aiSuggest(@Body() body: any, @Headers('idempotency-key') key: string, @Req() req: any) {
    switch (body?.action) {
      case 'outline': return this.ai.outline(body, req.user.organization.id, req.user.id);
      case 'page': return this.ai.pageDraft(body, req.user.organization.id, req.user.id, key || body.idempotencyKey || '');
      case 'translate': return this.ai.translate(body, req.user.organization.id, req.user.id);
      case 'review': return this.ai.review(body, req.user.organization.id);
      default: return this.ai.fieldSuggestion(body, req.user.organization.id, req.user.id);
    }
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/ai/page-draft')
  aiPageDraft(
    @Body() dto: CmsAiPageDraftDto,
    @Headers('idempotency-key') key: string,
    @Req() req: any,
  ) {
    return this.ai.pageDraft(
      dto,
      req.user.organization.id,
      req.user.id,
      key || '',
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/ai/field-suggestion')
  aiFieldSuggestion(@Body() dto: CmsAiFieldSuggestionDto, @Req() req: any) {
    return this.ai.fieldSuggestion(dto, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/ai/translate')
  aiTranslate(@Body() dto: CmsAiTranslateDto, @Req() req: any) {
    return this.ai.translate(dto, req.user.organization.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Post('cms/ai/page-review')
  aiPageReview(@Body() dto: CmsAiReviewDto, @Req() req: any) {
    return this.ai.review(dto, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/ai/suggestions/:suggestionId/outcome')
  aiSuggestionOutcome(
    @Param('suggestionId') suggestionId: string,
    @Body() dto: CmsAiSuggestionOutcomeDto,
    @Req() req: any,
  ) {
    return this.ai.recordOutcome(
      suggestionId,
      dto,
      req.user.organization.id,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Patch('cms/ai-preference')
  aiPreference(@Body() dto: UpdateCmsAiPreferenceDto, @Req() req: any) {
    return this.service.updateAiPreference(
      req.user.organization.id,
      dto.enabled,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/assets')
  assets(@Req() req: any) {
    return this.service.listAssets(req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/assets/:id/usage')
  assetUsage(@Param('id') id: string, @Req() req: any) {
    return this.service.assetUsage(id, req.user.organization.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Post('cms/assets')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @UploadedFile() file: any,
    @Body() body: AssetMetadataDto,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.service.addAsset(req.user.organization.id, file, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Patch('cms/assets/:id')
  updateAsset(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @Req() req: any,
  ) {
    return this.service.updateAsset(id, req.user.organization.id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Delete('cms/assets/:id')
  deleteAsset(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteAsset(id, req.user.organization.id);
  }

  @Get('assets/public/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async publicAsset(@Param('id') id: string) {
    const { asset, buffer } = await this.service.getPublicAsset(id);
    return new StreamableFile(buffer, {
      type: asset.mimeType,
      length: asset.size,
    });
  }

  @Get('public/:slug') resolve(@Param('slug') slug: string) {
    return this.service.resolvePublished(slug);
  }
  @Get('public/:slug/pages/:pageSlug') resolvePage(
    @Param('slug') slug: string,
    @Param('pageSlug') pageSlug: string,
  ) {
    return this.service.resolvePublishedPage(slug, pageSlug);
  }
  @Get('public/:slug/categories') categories(@Param('slug') slug: string) {
    return this.service.listCategories(slug);
  }
  @Get('public/:slug/products') products(
    @Param('slug') slug: string,
    @Query() query: PublicProductQueryDto,
  ) {
    return this.service.listProducts(slug, query);
  }
  @Get('public/:slug/products/:productSlug') product(
    @Param('slug') slug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.service.product(slug, productSlug);
  }

  @Post('public/:slug/orders') order(
    @Param('slug') slug: string,
    @Body() dto: CreateStorefrontOrderDto,
    @Headers('idempotency-key') key: string,
    @Req() req: any,
  ) {
    this.rateLimit.check(`checkout:${slug}:${req.ip || 'unknown'}`, 10);
    return this.service.createOrder(slug, dto, key || '');
  }
  @Post('public/:slug/cart/quote') quote(
    @Param('slug') slug: string,
    @Body() dto: CartQuoteDto,
    @Req() req: any,
  ) {
    this.rateLimit.check(`quote:${slug}:${req.ip || 'unknown'}`, 60);
    return this.service.quote(slug, dto);
  }
  @Post('public/:slug/orders/lookup') lookup(
    @Param('slug') slug: string,
    @Body() dto: LookupStorefrontOrderDto,
    @Req() req: any,
  ) {
    this.rateLimit.check(`lookup:${slug}:${req.ip || 'unknown'}`, 10);
    return this.service.lookupOrder(slug, dto);
  }
  @Get('public/:slug/orders/:token') orderStatus(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Req() req: any,
  ) {
    this.rateLimit.check(`confirmation:${slug}:${req.ip || 'unknown'}`, 30);
    return this.service.confirmation(slug, token);
  }
  @Get('public/:slug/orders/confirmation/:token') confirmation(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Req() req: any,
  ) {
    this.rateLimit.check(`confirmation:${slug}:${req.ip || 'unknown'}`, 30);
    return this.service.confirmation(slug, token);
  }
}
