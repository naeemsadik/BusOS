import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { Admin, User, Organization, Subscription, Customer, SubscriptionPlanEntity, BkashPayment, SslcommerzPayment, SmsBalance, SmsLog, SmsPackage, SmsSettings } from '../entities';
import { PaymentsModule } from '../payments/payments.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User, Organization, Subscription, Customer, SubscriptionPlanEntity, BkashPayment, SslcommerzPayment, SmsBalance, SmsLog, SmsPackage, SmsSettings]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    PaymentsModule,
    SmsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAnalyticsService, AdminAuthGuard],
  exports: [AdminService, AdminAnalyticsService, AdminAuthGuard],
})
export class AdminModule {}
