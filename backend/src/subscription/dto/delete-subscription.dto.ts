import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteSubscriptionDto {
  @ApiProperty({ 
    description: 'Subscription ID to delete (optional - defaults to current organization subscription)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  id?: string;
}
