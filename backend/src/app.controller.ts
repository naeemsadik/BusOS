import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { GetFrontendType } from './common/decorators/frontend-type.decorator';
import { FrontendType } from './common/enums/frontend-type.enum';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@GetFrontendType() frontendType: FrontendType, @Req() request: Request): string {
    console.log(`Request received from frontend: ${frontendType}`);
    return `${this.appService.getHello()} from ${frontendType}`;
  }
}
