import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FrontendType, FRONTEND_TYPE_HEADER } from '../enums/frontend-type.enum';

export const GetFrontendType = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): FrontendType | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const frontendType = request.headers[FRONTEND_TYPE_HEADER.toLowerCase()];
    
    // Validate that the frontend type is a valid enum value
    if (frontendType && Object.values(FrontendType).includes(frontendType as FrontendType)) {
      return frontendType as FrontendType;
    }
    
    return undefined;
  },
);
