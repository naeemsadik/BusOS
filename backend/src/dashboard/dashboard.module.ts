import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { InventoryModule } from '../inventory/inventory.module';
import { PosModule } from '../pos/pos.module';
import { CustomersModule } from '../customers/customers.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [
    InventoryModule,
    PosModule,
    CustomersModule,
    OrdersModule,
    InvoicesModule,
    DeliveryModule,
    ExpensesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
