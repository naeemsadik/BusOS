import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SmsType } from '../../entities';

export enum PurchaseType {
  BY_COUNT = 'by_count',
  BY_AMOUNT = 'by_amount',
}

export class PurchaseSmsDto {
  @IsEnum(PurchaseType)
  @IsNotEmpty()
  type: PurchaseType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  smsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: 'bkash' | 'sslcommerz';

  @IsOptional()
  @IsString()
  payerReference?: string;
}

export class SendSmsDto {
  @IsNotEmpty()
  @IsString()
  recipient: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(SmsType)
  type?: SmsType;

  @IsOptional()
  @IsString()
  gateway?: string;
}
