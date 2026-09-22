import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus, SubscriptionPlan } from '../../entities/enums';

export class EditSubscriptionDto {
  @ApiProperty({ 
    description: 'Subscription plan type', 
    enum: SubscriptionPlan, 
    required: false 
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiProperty({ 
    description: 'Subscription status', 
    enum: SubscriptionStatus, 
    required: false 
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ 
    description: 'Subscription expiration date', 
    type: String, 
    format: 'date-time', 
    required: false 
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ 
    description: 'Organization ID (for admin use)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
