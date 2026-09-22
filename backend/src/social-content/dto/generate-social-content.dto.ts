import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export enum SocialPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  X = 'x',
}

export enum SocialGoal {
  PRODUCT = 'product',
  PROMOTION = 'promotion',
  AWARENESS = 'awareness',
  EDUCATIONAL = 'educational',
  SEASONAL = 'seasonal',
}

export enum SocialTone {
  FRIENDLY = 'friendly',
  PROFESSIONAL = 'professional',
  PREMIUM = 'premium',
  URGENT = 'urgent',
  PLAYFUL = 'playful',
}

export enum SocialLanguage {
  ENGLISH = 'english',
  BANGLA = 'bangla',
}

export enum SocialAspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '4:5',
  STORY = '9:16',
  LANDSCAPE = '16:9',
}

export class GenerateSocialContentDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsEnum(SocialGoal)
  goal: SocialGoal;

  @IsString()
  @Length(3, 500)
  topic: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  offer?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  audience?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  visualDirection?: string;

  @IsEnum(SocialTone)
  tone: SocialTone;

  @IsEnum(SocialLanguage)
  language: SocialLanguage;

  @IsEnum(SocialAspectRatio)
  aspectRatio: SocialAspectRatio;

  @IsBoolean()
  generateImage: boolean;
}
