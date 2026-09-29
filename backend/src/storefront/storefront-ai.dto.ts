import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { STOREFRONT_PAGE_TYPES } from './storefront.dto';

export class CmsAiSourceDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  productIds: string[] = [];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  categoryNames: string[] = [];
  @IsOptional() @IsObject() facts: Record<string, unknown> = {};
  @IsOptional() @IsBoolean() useOrganizationProfile = true;
}

export class CmsAiOutlineDto extends CmsAiSourceDto {
  @IsIn(STOREFRONT_PAGE_TYPES) pageType: (typeof STOREFRONT_PAGE_TYPES)[number];
  @IsString() @Length(1, 500) purpose: string;
  @IsOptional() @IsString() @Length(0, 300) audience?: string;
  @IsIn(['en', 'bn']) locale: 'en' | 'bn';
  @IsOptional() @IsIn(['friendly', 'professional', 'direct']) tone:
    | 'friendly'
    | 'professional'
    | 'direct' = 'friendly';
}

export class CmsAiPageDraftDto extends CmsAiSourceDto {
  @IsUUID() pageId: string;
  @IsInt() @Min(1) expectedVersion: number;
  @IsArray()
  @ArrayMaxSize(30)
  @IsIn(
    [
      'announcement',
      'hero',
      'categoryNavigation',
      'productGrid',
      'promotionalBanner',
      'imageText',
      'contactHours',
    ],
    { each: true },
  )
  outline: string[];
  @IsIn(['en', 'bn']) locale: 'en' | 'bn';
  @IsOptional() @IsIn(['friendly', 'professional', 'direct']) tone:
    | 'friendly'
    | 'professional'
    | 'direct' = 'friendly';
}

export class CmsAiFieldSuggestionDto extends CmsAiSourceDto {
  @IsUUID() pageId: string;
  @IsInt() @Min(1) expectedVersion: number;
  @IsString() @Length(1, 80) sectionId: string;
  @IsIn(['title', 'body', 'ctaLabel', 'imageAlt', 'seoTitle', 'seoDescription'])
  field: string;
  @IsIn([
    'suggest',
    'shorter',
    'clearer',
    'friendly',
    'professional',
    'grammar',
    'cta',
    'alt',
  ])
  action: string;
  @IsString() @Length(0, 2000) currentValue: string;
  @IsIn(['en', 'bn']) locale: 'en' | 'bn';
}

export class CmsAiTranslateDto extends CmsAiSourceDto {
  @IsUUID() pageId: string;
  @IsInt() @Min(1) expectedVersion: number;
  @IsString() @Length(1, 80) sectionId: string;
  @IsIn(['title', 'body', 'ctaLabel', 'imageAlt']) field: string;
  @IsString() @Length(1, 2000) currentValue: string;
  @IsIn(['en', 'bn']) sourceLocale: 'en' | 'bn';
  @IsIn(['en', 'bn']) targetLocale: 'en' | 'bn';
}

export class CmsAiReviewDto {
  @IsUUID() pageId: string;
  @IsInt() @Min(1) expectedVersion: number;
}

export class CmsAiSuggestionOutcomeDto {
  @IsIn(['accepted', 'edited', 'rejected']) outcome:
    | 'accepted'
    | 'edited'
    | 'rejected';
}
