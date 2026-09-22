import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AdminModule } from './admin/admin.module';
import { InventoryModule } from './inventory/inventory.module';
import { PosModule } from './pos/pos.module';
import { OrdersModule } from './orders/orders.module';
import { CustomersModule } from './customers/customers.module';
import { DeliveryModule } from './delivery/delivery.module';
import { ExpensesModule } from './expenses/expenses.module';
import { InvoicesModule } from './invoices/invoices.module';
import { SettingsModule } from './settings/settings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { CommonModule } from './common/common.module';
import { PaymentsModule } from './payments/payments.module';
import { SmsModule } from './sms/sms.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UsersModule } from './users/users.module';
import { CurrencyModule } from './currency/currency.module';
import { VoiceModule } from './voice/voice.module';
import { SocialContentModule } from './social-content/social-content.module';
import {
  User, 
  Organization, 
  Subscription, 
  SubscriptionPlanEntity, 
  Invitation, 
  Admin, 
  Product, 
  Category, 
  StockMovement,
  Customer,
  Order,
  OrderItem,
  Invoice,
  InvoiceItem,
  Expense,
  Delivery,
  Supplier,
  BkashPayment,
  SslcommerzPayment,
  SmsBalance,
  SmsPackage,
  SmsLog,
  SmsSettings,
  UserPermission
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        schema: configService.get('DATABASE_SCHEMA'),
        ssl: configService.get('DATABASE_SSL') === 'true' ? {
          rejectUnauthorized: configService.get('DATABASE_SSL_REJECT_UNAUTHORIZED') !== 'false',
        } : false,
        entities: [User, Organization, Subscription, SubscriptionPlanEntity, Invitation, Admin, Product, Category, StockMovement, Customer, Order, OrderItem, Invoice, InvoiceItem, Expense, Delivery, Supplier, BkashPayment, SslcommerzPayment, SmsBalance, SmsPackage, SmsLog, SmsSettings, UserPermission],
        synchronize:
          configService.get('TYPEORM_SYNCHRONIZE') === 'true' ||
          configService.get('NODE_ENV') === 'development',
        logging: false,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    SubscriptionModule,
    AdminModule,
    InventoryModule,
    PosModule,
    OrdersModule,
    CustomersModule,
    DeliveryModule,
    ExpensesModule,
    InvoicesModule,
    SettingsModule,
    DashboardModule,
    ReportsModule,
    CommonModule,
    PaymentsModule,
    SmsModule,
    PermissionsModule,
    UsersModule,
    CurrencyModule,
    VoiceModule,
    SocialContentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
