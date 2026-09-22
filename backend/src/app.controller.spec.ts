import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FrontendType } from './common/enums/frontend-type.enum';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should identify the requesting frontend', () => {
      expect(
        appController.getHello(FrontendType.WEB_SHOP, {} as Request),
      ).toBe('Hello World! from web_shop');
    });
  });
});
