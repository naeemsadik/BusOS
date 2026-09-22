import { IsOptional, IsString, IsUrl, IsEmail, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ required: false, description: 'Steadfast Courier API Key' })
  @IsOptional()
  @IsString()
  steadfastApiKey?: string;

  @ApiProperty({ required: false, description: 'Steadfast Courier Secret Key' })
  @IsOptional()
  @IsString()
  steadfastSecretKey?: string;

  @ApiProperty({ required: false, description: 'Pathao Courier Client ID' })
  @IsOptional()
  @IsString()
  pathaoClientId?: string;

  @ApiProperty({ required: false, description: 'Pathao Courier Client Secret' })
  @IsOptional()
  @IsString()
  pathaoClientSecret?: string;

  @ApiProperty({ required: false, description: 'Pathao Courier Username' })
  @IsOptional()
  @IsString()
  pathaoUsername?: string;

  @ApiProperty({ required: false, description: 'Pathao Courier Password' })
  @IsOptional()
  @IsString()
  pathaoPassword?: string;

  @ApiProperty({ required: false, description: 'RedX Courier API Key' })
  @IsOptional()
  @IsString()
  redxApiKey?: string;

  @ApiProperty({ required: false, description: 'RedX Environment (production/development)' })
  @IsOptional()
  @IsString()
  redxEnvironment?: string;

  @ApiProperty({ required: false, description: 'Paperfly API Key (optional, for enhanced tracking)' })
  @IsOptional()
  @IsString()
  paperflyApiKey?: string;
}
