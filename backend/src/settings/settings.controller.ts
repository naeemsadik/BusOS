import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateOrganizationSettingsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organization')
  @ApiOperation({ summary: 'Get organization settings' })
  @ApiResponse({ status: 200, description: 'Organization settings retrieved successfully' })
  async getOrganizationSettings(@Request() req) {
    return this.settingsService.getOrganizationSettings(req.user.organizationId);
  }

  @Put('organization')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Organization settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateOrganizationSettings(
    @Body() updateSettingsDto: UpdateOrganizationSettingsDto,
    @Request() req,
  ) {
    return this.settingsService.updateOrganizationSettings(
      req.user.organizationId,
      updateSettingsDto,
    );
  }

  @Post('steadfast/test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Test Steadfast connection' })
  @ApiResponse({ status: 200, description: 'Connection test completed' })
  @ApiResponse({ status: 400, description: 'Steadfast credentials not configured' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async testSteadfastConnection(@Request() req) {
    return this.settingsService.testSteadfastConnection(req.user.organizationId);
  }

  @Delete('steadfast')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove Steadfast credentials' })
  @ApiResponse({ status: 200, description: 'Steadfast credentials removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async removeSteadfastCredentials(@Request() req) {
    return this.settingsService.removeSteadfastCredentials(req.user.organizationId);
  }

  @Post('pathao/test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Test Pathao connection' })
  @ApiResponse({ status: 200, description: 'Connection test completed' })
  @ApiResponse({ status: 400, description: 'Pathao credentials not configured' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async testPathaoConnection(@Request() req) {
    return this.settingsService.testPathaoConnection(req.user.organizationId);
  }

  @Delete('pathao')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove Pathao credentials' })
  @ApiResponse({ status: 200, description: 'Pathao credentials removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async removePathaoCredentials(@Request() req) {
    return this.settingsService.removePathaoCredentials(req.user.organizationId);
  }

  @Post('paperfly/test')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Test Paperfly connection' })
  @ApiResponse({ status: 200, description: 'Connection test completed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async testPaperflyConnection(@Request() req, @Body() body?: { orderNumber?: string }) {
    return this.settingsService.testPaperflyConnection(req.user.organizationId, body?.orderNumber);
  }

  @Delete('paperfly')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove Paperfly credentials' })
  @ApiResponse({ status: 200, description: 'Paperfly credentials removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async removePaperflyCredentials(@Request() req) {
    return this.settingsService.removePaperflyCredentials(req.user.organizationId);
  }
}
