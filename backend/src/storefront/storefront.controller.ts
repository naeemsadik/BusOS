import { Body, Controller, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionModuleType } from '../entities';
import { RequiredPermission } from '../permissions/decorators/permission.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { CreateStorefrontDto, SaveStorefrontDraftDto, SlugAvailabilityDto } from './storefront.dto';
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
}
