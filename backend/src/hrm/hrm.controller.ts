import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PermissionModuleType } from '../entities';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequiredPermission } from '../permissions/decorators/permission.decorator';
import { HrmService } from './hrm.service';
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
  UpdateHrmSettingsDto,
} from './dto/hrm.dto';

@Controller('hrm')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class HrmController {
  constructor(private readonly hrm: HrmService) {}

  @Get('settings') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  getSettings(@Request() req) { return this.hrm.getSettings(req.user.organizationId); }

  @Patch('settings') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  updateSettings(@Request() req, @Body() dto: UpdateHrmSettingsDto) {
    return this.hrm.updateSettings(req.user.organizationId, dto);
  }

  @Get('departments') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  departments(@Request() req, @Query('includeArchived') includeArchived?: string) {
    return this.hrm.getDepartments(req.user.organizationId, includeArchived === 'true');
  }

  @Post('departments') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'create')
  createDepartment(@Request() req, @Body() dto: CreateDepartmentDto) {
    return this.hrm.createDepartment(req.user.organizationId, dto);
  }

  @Patch('departments/:id') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  updateDepartment(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.hrm.updateDepartment(req.user.organizationId, id, dto);
  }

  @Post('departments/:id/archive') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'delete')
  archiveDepartment(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.hrm.archiveDepartment(req.user.organizationId, id);
  }

  @Get('designations') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  designations(@Request() req, @Query('includeArchived') includeArchived?: string) {
    return this.hrm.getDesignations(req.user.organizationId, includeArchived === 'true');
  }

  @Post('designations') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'create')
  createDesignation(@Request() req, @Body() dto: CreateDesignationDto) {
    return this.hrm.createDesignation(req.user.organizationId, dto);
  }

  @Patch('designations/:id') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  updateDesignation(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDesignationDto) {
    return this.hrm.updateDesignation(req.user.organizationId, id, dto);
  }

  @Post('designations/:id/archive') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'delete')
  archiveDesignation(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.hrm.archiveDesignation(req.user.organizationId, id);
  }
}

