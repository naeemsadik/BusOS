import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorefrontSite } from '../entities';
import { PermissionsModule } from '../permissions/permissions.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [TypeOrmModule.forFeature([StorefrontSite]), PermissionsModule],
  controllers: [StorefrontController], providers: [StorefrontService], exports: [StorefrontService],
})
export class StorefrontModule {}
