import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  IsUUID,
  IsDate,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SupplierStatus } from '../../entities';

export class CreateSupplierDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 255)
  company: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  paymentTerms?: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPurchases?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  outstandingAmount?: number;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  company?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  paymentTerms?: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPurchases?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  outstandingAmount?: number;
}

export class SupplierQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minTotalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxTotalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

export class BulkDeleteSuppliersDto {
  @IsUUID('4', { each: true })
  supplierIds: string[];
}

export class UpdateSupplierStatsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalOrders?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  outstandingAmount?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastOrderDate?: Date;
}
