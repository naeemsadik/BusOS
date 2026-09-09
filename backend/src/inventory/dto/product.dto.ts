import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsUUID,
  Min,
  Max,
  Length,
  IsDecimal,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductStatus } from '../../entities';

export class CreateProductDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsString()
  @Length(1, 100)
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsString()
  @Length(1, 100)
  category: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  subcategory?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  brand?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  cost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxStock?: number;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  unit?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  weightUnit?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  barcode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  image?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBackorder?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  taxRate?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  supplier?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @Length(1, 100)
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  subcategory?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  brand?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxStock?: number;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  unit?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  weightUnit?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  barcode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  image?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBackorder?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  taxRate?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  supplier?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxStock?: number;

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

export class BulkDeleteDto {
  @IsUUID('4', { each: true })
  productIds: string[];
}

export class StockAdjustmentDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  unitCost?: number;
}
