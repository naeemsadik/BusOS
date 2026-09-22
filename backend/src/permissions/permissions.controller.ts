import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PermissionModuleType } from '../entities';
import { PermissionsService } from './permissions.service';
import { UpdatePermissionDto } from './dto';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get permissions for a specific user' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async getUserPermissions(@Param('userId') userId: string) {
    return this.permissionsService.getUserPermissions(userId);
  }

  @Post('user/:userId/module/:module')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update user permissions for a specific module' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  async updateUserModulePermission(
    @Param('userId') userId: string,
    @Param('module') module: PermissionModuleType,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    // Map the DTO to the format expected by the service
    const permissionData = {
      view: updatePermissionDto.view,
      create: updatePermissionDto.create,
      edit: updatePermissionDto.edit,
      delete: updatePermissionDto.delete,
    };
    
    return this.permissionsService.createOrUpdatePermission(userId, module, permissionData);
  }

  @Delete('user/:userId/module/:module')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Delete user permissions for a specific module' })
  @ApiResponse({ status: 200, description: 'Permission deleted successfully' })
  async deleteUserModulePermission(
    @Param('userId') userId: string,
    @Param('module') module: PermissionModuleType,
  ) {
    await this.permissionsService.deletePermission(userId, module);
    return { message: 'Permission deleted successfully' };
  }

  @Get('module/:module')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get all organization users with their permissions for a specific module' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async getModulePermissions(
    @Param('module') module: PermissionModuleType,
    @Request() req,
  ) {
    const organizationId = req.user.organizationId;
    return this.permissionsService.getModulePermissions(organizationId, module);
  }
  
  @Get('check/:userId/:module/:action')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if a user has permission for specific module and action' })
  @ApiResponse({ status: 200, description: 'Permission check completed' })
  async checkUserPermission(
    @Param('userId') userId: string,
    @Param('module') module: PermissionModuleType,
    @Param('action') action: 'view' | 'create' | 'edit' | 'delete',
    @Request() req,
  ) {
    // Ensure users can only check their own permissions or owners checking staff permissions
    if (req.user.id !== userId && req.user.role !== UserRole.OWNER) {
      throw new ForbiddenException('You are not authorized to check this user\'s permissions');
    }
    
    const hasPermission = await this.permissionsService.hasPermission(userId, module, action);
    return { hasPermission };
  }
}
