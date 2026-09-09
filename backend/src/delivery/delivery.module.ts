import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { CourierService } from './courier.service';
import { Delivery, Order, Organization } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Delivery, Order, Organization]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, CourierService],
  exports: [DeliveryService, CourierService],
})
export class DeliveryModule {}