import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { DeliveryStatus, DeliveryType } from '../../entities';

export class CreateDeliveryDto {
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @IsOptional()
  @IsString()
  deliveryCity?: string;

  @IsOptional()
  @IsString()
  deliveryState?: string;

  @IsOptional()
  @IsString()
  deliveryZipCode?: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @IsDateString()
  estimatedDeliveryDate: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  courierService?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  // Steadfast-specific fields
  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number; // Cash on Delivery amount

  @IsOptional()
  @IsString()
  alternativePhone?: string; // Alternative phone number

  @IsOptional()
  @IsString()
  itemDescription?: string; // Items description

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalLot?: number; // Total lot/quantity

  @IsOptional()
  @IsNumber()
  steadfastDeliveryType?: 0 | 1; // 0 = home delivery, 1 = point delivery/hub pickup

  @IsOptional()
  courierProvider?: string; // Courier provider (steadfast, etc.)

  @IsOptional()
  courierOptions?: any; // Additional courier-specific options
}

export class UpdateDeliveryDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @IsOptional()
  @IsDateString()
  actualDeliveryDate?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  driverPhone?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  courierService?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  deliveryInstructions?: string;
}

export class DeliveryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
