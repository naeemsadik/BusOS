import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CmsAiSuggestion,
  Organization,
  Product,
  StorefrontAsset,
  StorefrontPage,
  StorefrontPageRedirect,
  StorefrontPageRevision,
  StorefrontSite,
} from '../entities';
import { PermissionsModule } from '../permissions/permissions.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { StorefrontAssetStorage } from './storefront-asset.storage';
import { StorefrontRateLimitService } from './storefront-rate-limit.service';
import { StorefrontPageService } from './storefront-page.service';
import { StorefrontPageReviewService } from './storefront-page-review.service';
import { StorefrontAiService } from './storefront-ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StorefrontSite,
      StorefrontAsset,
      StorefrontPage,
      StorefrontPageRevision,
      StorefrontPageRedirect,
      CmsAiSuggestion,
      Product,
      Organization,
    ]),
    PermissionsModule,
  ],
  controllers: [StorefrontController],
  providers: [
    StorefrontService,
    StorefrontPageService,
    StorefrontPageReviewService,
    StorefrontAiService,
    StorefrontAssetStorage,
    StorefrontRateLimitService,
  ],
  exports: [StorefrontService, StorefrontPageService],
})
export class StorefrontModule {}
