import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FrontendType, FRONTEND_TYPE_HEADER } from '../enums/frontend-type.enum';

export const ALLOWED_FRONTENDS_KEY = 'allowedFrontends';
export const AllowedFrontends = (frontends: FrontendType[]) =>
  Reflect.metadata(ALLOWED_FRONTENDS_KEY, frontends);

@Injectable()
export class FrontendAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedFrontends = this.reflector.getAllAndOverride<FrontendType[]>(
      ALLOWED_FRONTENDS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedFrontends) {
      // If no restriction is set, allow all frontends
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const frontendType = request.headers[FRONTEND_TYPE_HEADER.toLowerCase()] as FrontendType;

    if (!frontendType) {
      throw new ForbiddenException('Frontend type must be specified in X-Frontend-Type header');
    }

    if (!allowedFrontends.includes(frontendType)) {
      throw new ForbiddenException(
        `Access denied. This endpoint is only accessible from: ${allowedFrontends.join(', ')}`
      );
    }

    return true;
  }
}
