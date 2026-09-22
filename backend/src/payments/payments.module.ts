import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BkashService } from './bkash.service';
import { SslcommerzService } from './sslcommerz.service';
import { PaymentsController } from './payments.controller';
import { BkashPayment } from '../entities/bkash-payment.entity';
import { SslcommerzPayment } from '../entities/sslcommerz-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BkashPayment, SslcommerzPayment]),
    ConfigModule,
    forwardRef(() => import('../subscription/subscription.module').then(m => m.SubscriptionModule)),
    forwardRef(() => import('../sms/sms.module').then(m => m.SmsModule)),
  ],
  controllers: [PaymentsController],
  providers: [BkashService, SslcommerzService],
  exports: [BkashService, SslcommerzService],
})
export class PaymentsModule {}
