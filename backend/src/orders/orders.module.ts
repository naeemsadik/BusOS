import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderItem, Product, Customer, Invoice, InvoiceItem, Delivery } from '../entities';
import { InvoicesModule } from '../invoices/invoices.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [
  TypeOrmModule.forFeature([Order, OrderItem, Product, Customer, Invoice, InvoiceItem, Delivery]),
    InvoicesModule,
    DeliveryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
