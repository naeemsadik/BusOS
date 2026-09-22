import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PosStatsDto {
  @ApiProperty({
    description: 'The period to get stats for',
    enum: [
      'last-24-hours',
      'last-7-days',
      'last-30-days',
      'last-90-days',
      'last-365-days',
      'this-month',
      'last-month',
      'custom'
    ],
    required: false,
    default: 'last-30-days'
  })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiProperty({
    description: 'Custom start date for date range (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Custom end date for date range (YYYY-MM-DD)',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
