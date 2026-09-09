import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const admin = request.admin;

    // Check if user is admin (either through admin auth or user with admin role)
    if (admin) {
      return true;
    }

    if (user && user.role === 'admin') {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
