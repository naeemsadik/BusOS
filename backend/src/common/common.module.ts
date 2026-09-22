import { Module, MiddlewareConsumer } from '@nestjs/common';
import { FrontendConfigService } from './services';
import { FrontendConfigController } from './controllers/frontend-config.controller';
import { FrontendLoggerMiddleware } from './middleware/frontend-logger.middleware';
import { FrontendAccessGuard } from './guards/frontend-access.guard';

@Module({
  providers: [
    FrontendConfigService,
    FrontendAccessGuard,
  ],
  controllers: [FrontendConfigController],
  exports: [
    FrontendConfigService,
    FrontendAccessGuard,
  ],
})
export class CommonModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(FrontendLoggerMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
