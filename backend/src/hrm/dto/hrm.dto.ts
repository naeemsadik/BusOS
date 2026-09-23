import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AttendanceStatus, EmploymentStatus, PayType, PayrollAdjustmentType } from '../../entities';

export class UpdateHrmSettingsDto {
  @IsString() @MaxLength(100) timezone: string;
  @IsString() @Length(3, 3) currencyCode: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  workDays: number[];
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/) workStartTime: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/) workEndTime: string;
  @IsInt() @Min(0) @Max(240) @Type(() => Number) graceMinutes: number;
}

export class CreateDepartmentDto {
  @IsString() @Length(1, 100) name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() @Length(1, 100) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class CreateDesignationDto extends CreateDepartmentDto {
  @IsOptional() @IsUUID() departmentId?: string;
}

export class UpdateDesignationDto extends UpdateDepartmentDto {
  @IsOptional() @IsUUID() departmentId?: string;
}

