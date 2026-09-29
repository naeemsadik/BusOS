import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { StorefrontDocument, StorefrontSeoSettings } from './storefront.types';

export const STOREFRONT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export class CreateStorefrontDto {
  @IsString() @Length(3, 63) @Matches(STOREFRONT_SLUG_PATTERN) slug: string;
}
export class SlugAvailabilityDto {
  @IsString() @Length(3, 63) @Matches(STOREFRONT_SLUG_PATTERN) slug: string;
}
export class SaveStorefrontDraftDto {
  @IsInt() @Min(1) expectedVersion: number;
  @IsArray() @IsIn(['en', 'bn'], { each: true }) enabledLocales: Array<
    'en' | 'bn'
  >;
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
  @IsOptional() @IsIn(['newest', 'name', 'priceAsc', 'priceDesc']) sort:
    | 'newest'
    | 'name'
    | 'priceAsc'
    | 'priceDesc' = 'newest';
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
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StorefrontOrderLineDto)
  items: StorefrontOrderLineDto[];
}

export const STOREFRONT_PAGE_SLUG_PATTERN =
  /^(?:home|[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?)$/;
export const STOREFRONT_PAGE_TYPES = [
  'home',
  'about',
  'contact',
  'promotion',
  'landing',
  'delivery',
  'faq',
  'custom',
] as const;

export class CreateStorefrontPageDto {
  @IsString() @Length(1, 120) title: string;
  @IsString()
  @Length(1, 80)
  @Matches(STOREFRONT_PAGE_SLUG_PATTERN)
  slug: string;
  @IsIn(STOREFRONT_PAGE_TYPES) pageType: (typeof STOREFRONT_PAGE_TYPES)[number];
  @IsOptional() @IsIn(['blank', 'template', 'guided']) startMode:
    | 'blank'
    | 'template'
    | 'guided' = 'template';
  @IsOptional() @IsObject() facts?: Record<string, unknown>;
  @IsOptional() @IsBoolean() includeInNavigation = false;
  @IsOptional()
  @IsArray()
  @IsIn(['en', 'bn'], { each: true })
  enabledLocales: Array<'en' | 'bn'> = ['en'];
}

export class UpdateStorefrontPageDto {
  @IsInt() @Min(1) expectedVersion: number;
  @IsOptional() @IsString() @Length(1, 120) title?: string;
  @IsOptional()
  @IsString()
  @Length(1, 80)
  @Matches(STOREFRONT_PAGE_SLUG_PATTERN)
  slug?: string;
  @IsOptional() @IsBoolean() createRedirect?: boolean;
  @IsOptional() @IsBoolean() includeInNavigation?: boolean;
  @IsOptional() @IsObject() navigationLabel?: Record<string, string>;
  @IsOptional() @IsInt() @Min(0) @Max(10000) navigationOrder?: number;
  @IsOptional()
  @IsArray()
  @IsIn(['en', 'bn'], { each: true })
  enabledLocales?: Array<'en' | 'bn'>;
  @IsOptional() @IsObject() seoSettings?: StorefrontSeoSettings;
  @IsOptional() @IsObject() document?: StorefrontDocument;
  @IsOptional() @IsIn(['manual', 'template', 'ai', 'restore']) origin?:
    | 'manual'
    | 'template'
    | 'ai'
    | 'restore';
}

export class DuplicateStorefrontPageDto {
  @IsString() @Length(1, 120) title: string;
  @IsString()
  @Length(1, 80)
  @Matches(STOREFRONT_PAGE_SLUG_PATTERN)
  slug: string;
}

export class RestoreStorefrontPageRevisionDto {
  @IsInt() @Min(1) expectedVersion: number;
}

export class UpdateCmsAiPreferenceDto {
  @IsBoolean() enabled: boolean;
}
