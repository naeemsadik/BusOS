import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import { StorefrontDocument } from './storefront.types';

export const STOREFRONT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export class CreateStorefrontDto {
  @IsString() @Length(3, 63) @Matches(STOREFRONT_SLUG_PATTERN) slug: string;
}
export class SlugAvailabilityDto {
  @IsString() @Length(3, 63) @Matches(STOREFRONT_SLUG_PATTERN) slug: string;
}
export class SaveStorefrontDraftDto {
  @IsInt() @Min(1) expectedVersion: number;
  @IsArray() @IsIn(['en', 'bn'], { each: true }) enabledLocales: Array<'en' | 'bn'>;
  @IsIn(['en', 'bn']) defaultLocale: 'en' | 'bn';
  @IsObject() themeTokens: Record<string, unknown>;
  @IsObject() seoSettings: Record<string, unknown>;
  @IsObject() orderSettings: Record<string, unknown>;
  @IsObject() document: StorefrontDocument;
}
export class AssetMetadataDto {
  @IsString() @Length(1, 255) altTextEn: string;
  @IsOptional() @IsString() @Length(1, 255) altTextBn?: string;
}
export class UpdateAssetDto extends AssetMetadataDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(10000) sortOrder: number;
}
export class PublicProductQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48) limit = 24;
  @IsOptional() @IsString() @Length(1, 100) category?: string;
  @IsOptional() @IsString() @Length(1, 100) search?: string;
  @IsOptional() @IsIn(['newest', 'name', 'priceAsc', 'priceDesc']) sort: 'newest' | 'name' | 'priceAsc' | 'priceDesc' = 'newest';
}
export class StorefrontOrderLineDto {
  @IsUUID() productId: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) quantity: number;
}
export class CreateStorefrontOrderDto {
  @IsString() @Length(1, 255) customerName: string;
  @IsString() @Length(5, 40) customerPhone: string;
  @IsOptional() @IsEmail() @Length(3, 255) customerEmail?: string;
  @IsString() @Length(5, 500) shippingAddress: string;
  @IsOptional() @IsString() @Length(1, 100) shippingCity?: string;
  @IsOptional() @IsString() @Length(0, 500) notes?: string;
  @IsOptional() @IsIn(['en', 'bn']) locale?: 'en' | 'bn';
  @IsArray() @ValidateNested({ each: true }) @Type(() => StorefrontOrderLineDto) items: StorefrontOrderLineDto[];
}
