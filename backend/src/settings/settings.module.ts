import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { Organization } from '../entities';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization]), DeliveryModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
