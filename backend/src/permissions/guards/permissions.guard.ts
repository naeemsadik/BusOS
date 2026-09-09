import { Request } from 'express';
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';
import { PermissionModuleType, UserRole } from '../../entities';
import { REQUIRED_PERMISSION_KEY } from '../decorators/permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get(REQUIRED_PERMISSION_KEY, context.getHandler());

    // If no permission is required, allow access
    if (!requiredPermission) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as any;
    
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Owners have all permissions
    if (user.role === UserRole.OWNER) {
      return true;
    }

    // Check for specific permission
    const hasPermission = await this.permissionsService.hasPermission(
      user.id,
      requiredPermission.module,
      requiredPermission.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(`You do not have permission to ${requiredPermission.action} in the ${requiredPermission.module} module`);
    }

    return true;
  }
}
