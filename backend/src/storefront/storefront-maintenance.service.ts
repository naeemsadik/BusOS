import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Not, IsNull, Repository } from 'typeorm';
import { StorefrontAsset, StorefrontPage, StorefrontSlugAlias } from '../entities';
import { StorefrontAssetStorage } from './storefront-asset.storage';

@Injectable()
export class StorefrontMaintenanceService {
  private readonly logger = new Logger(StorefrontMaintenanceService.name);
  constructor(
    @InjectRepository(StorefrontPage) private readonly pages: Repository<StorefrontPage>,
    @InjectRepository(StorefrontSlugAlias) private readonly aliases: Repository<StorefrontSlugAlias>,
    @InjectRepository(StorefrontAsset) private readonly assets: Repository<StorefrontAsset>,
    private readonly storage: StorefrontAssetStorage,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanExpiredContent() {
    const now = new Date();
    await this.pages.delete({ deletedAt: Not(IsNull()), purgeAfter: LessThanOrEqual(now) });
    await this.aliases.delete({ expiresAt: LessThanOrEqual(now) });
    const deletedAssets = await this.assets.find({ where: { deletedAt: LessThanOrEqual(now) } });
    for (const asset of deletedAssets) {
      try { await this.storage.remove(asset.storageKey); await this.assets.remove(asset); }
      catch (error) { this.logger.warn(`Could not purge storefront asset ${asset.id}: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
}
