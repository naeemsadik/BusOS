import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FrontendType, FRONTEND_TYPE_HEADER } from '../enums/frontend-type.enum';

@Injectable()
export class FrontendLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(FrontendLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const frontendType = req.headers[FRONTEND_TYPE_HEADER.toLowerCase()] as FrontendType;
    const origin = req.headers.origin;
    const userAgent = req.headers['user-agent'];
    

    // Add frontend type to request for easier access in controllers
    (req as any).frontendType = frontendType;
    
    next();
  }
}
