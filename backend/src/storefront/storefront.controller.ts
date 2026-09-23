import { BadRequestException, Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionModuleType } from '../entities';
import { RequiredPermission } from '../permissions/decorators/permission.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { AssetMetadataDto, CreateStorefrontDto, SaveStorefrontDraftDto, SlugAvailabilityDto, UpdateAssetDto } from './storefront.dto';
import { StorefrontService } from './storefront.service';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly service: StorefrontService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard) @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms') get(@Req() req: any) { return this.service.getCmsSite(req.user.organization.id); }

  @UseGuards(JwtAuthGuard, PermissionsGuard) @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/slug-availability') availability(@Query() query: SlugAvailabilityDto) { return this.service.slugAvailability(query.slug); }

  @UseGuards(JwtAuthGuard, PermissionsGuard) @RequiredPermission(PermissionModuleType.WEBSITE, 'create')
  @Post('cms') create(@Body() dto: CreateStorefrontDto, @Req() req: any) { return this.service.create(dto, req.user.organization); }

  @UseGuards(JwtAuthGuard, PermissionsGuard) @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Put('cms/draft') save(@Body() dto: SaveStorefrontDraftDto, @Req() req: any) { return this.service.saveDraft(dto, req.user.organization.id); }

  @UseGuards(JwtAuthGuard, PermissionsGuard) @RequiredPermission(PermissionModuleType.WEBSITE, 'view')
  @Get('cms/assets') assets(@Req() req: any) { return this.service.listAssets(req.user.organization.id); }

  @UseGuards(JwtAuthGuard, PermissionsGuard) @RequiredPermission(PermissionModuleType.WEBSITE, 'create')
  @Post('cms/assets') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(@UploadedFile() file: any, @Body() body: AssetMetadataDto, @Req() req: any) {
    if (!file) throw new BadRequestException('File is required');
    return this.service.addAsset(req.user.organization.id, file, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard) @RequiredPermission(PermissionModuleType.WEBSITE, 'edit')
  @Patch('cms/assets/:id') updateAsset(@Param('id') id: string, @Body() dto: UpdateAssetDto, @Req() req: any) { return this.service.updateAsset(id, req.user.organization.id, dto); }

  @UseGuards(JwtAuthGuard, PermissionsGuard) @RequiredPermission(PermissionModuleType.WEBSITE, 'delete')
  @Delete('cms/assets/:id') deleteAsset(@Param('id') id: string, @Req() req: any) { return this.service.deleteAsset(id, req.user.organization.id); }

  @Get('assets/public/:id') @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async publicAsset(@Param('id') id: string) {
    const { asset, buffer } = await this.service.getPublicAsset(id);
    return new StreamableFile(buffer, { type: asset.mimeType, length: asset.size });
  }
}
