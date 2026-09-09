import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionModuleType } from '../entities';
import { RequiredPermission } from '../permissions/decorators/permission.decorator';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { GenerateSocialContentDto } from './dto/generate-social-content.dto';
import { SocialContentService } from './social-content.service';

@Controller('content-studio')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SocialContentController {
  constructor(private readonly socialContentService: SocialContentService) {}

  @Post('generate')
  @RequiredPermission(PermissionModuleType.SETTINGS, 'create')
  async generate(@Body() dto: GenerateSocialContentDto, @Request() req) {
    return this.socialContentService.generate(dto, req.user.organization);
  }
}
