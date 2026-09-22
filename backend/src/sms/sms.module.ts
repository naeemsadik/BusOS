import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsInitService } from './sms-init.service';
import {
  SmsBalance,
  SmsPackage,
  SmsLog,
  SmsSettings,
  Expense,
  Organization,
} from '../entities';
import { BkashPayment } from '../entities/bkash-payment.entity';
import { SslcommerzPayment } from '../entities/sslcommerz-payment.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsBalance,
      SmsPackage,
      SmsLog,
      SmsSettings,
      Expense,
      Organization,
      BkashPayment,
      SslcommerzPayment,
    ]),
    PaymentsModule,
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsInitService],
  exports: [SmsService],
})
export class SmsModule {}
