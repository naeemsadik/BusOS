import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlansService } from './subscription-plans.service';
import { AdminModule } from '../admin/admin.module';
import { Subscription, Organization, SubscriptionPlanEntity, Admin, BkashPayment, SslcommerzPayment } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Organization, SubscriptionPlanEntity, Admin, BkashPayment, SslcommerzPayment]),
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AdminModule,
    forwardRef(() => import('../payments/payments.module').then(m => m.PaymentsModule)),
  ],
  controllers: [SubscriptionController, SubscriptionPlansController],
  providers: [SubscriptionService, SubscriptionPlansService],
  exports: [SubscriptionService, SubscriptionPlansService],
})
export class SubscriptionModule {}
