import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities';
import { InventoryModule } from '../inventory/inventory.module';
import { PosModule } from '../pos/pos.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    InventoryModule,
    PosModule,
    PermissionsModule,
  ],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
