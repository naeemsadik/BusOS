import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, StorefrontAsset, StorefrontSite } from '../entities';
import { PermissionsModule } from '../permissions/permissions.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { StorefrontAssetStorage } from './storefront-asset.storage';

@Module({
  imports: [TypeOrmModule.forFeature([StorefrontSite, StorefrontAsset, Product]), PermissionsModule],
  controllers: [StorefrontController], providers: [StorefrontService, StorefrontAssetStorage], exports: [StorefrontService],
})
export class StorefrontModule {}
