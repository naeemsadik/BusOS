import { IsNotEmpty, IsOptional, IsString, IsObject, IsEnum } from 'class-validator';

export enum CourierProvider {
  STEADFAST = 'steadfast',
  PATHAO = 'pathao',
  REDX = 'redx',
  PAPERFLY = 'paperfly',
}

export class CourierWebhookDto {
  @IsEnum(CourierProvider)
  @IsNotEmpty()
  provider: CourierProvider;

  @IsString()
  @IsNotEmpty()
  consignment_id: string;

  @IsOptional()
  @IsString()
  tracking_code?: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  status_message?: string;

  @IsOptional()
  @IsString()
  invoice?: string;

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsString()
  updated_at?: string;

  @IsOptional()
  @IsString()
  delivery_fee?: string;

  @IsOptional()
  @IsObject()
  recipient?: {
    name?: string;
    phone?: string;
    address?: string;
  };
}
