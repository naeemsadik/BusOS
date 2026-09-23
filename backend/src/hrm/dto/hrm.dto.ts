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

export class CreateEmployeeDto {
  @IsOptional() @IsString() @Length(1, 32) employeeCode?: string;
  @IsString() @Length(1, 100) firstName: string;
  @IsString() @Length(1, 100) lastName: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(2000) address?: string;
  @IsOptional() @IsString() @MaxLength(150) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(50) emergencyContactPhone?: string;
  @IsDateString() joiningDate: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() designationId?: string;
  @IsOptional() @IsUUID() linkedUserId?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsInt({ each: true })
  @Min(0, { each: true }) @Max(6, { each: true }) workDaysOverride?: number[];
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/) workStartTimeOverride?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/) workEndTimeOverride?: string;
  @IsOptional() @IsInt() @Min(0) @Max(240) @Type(() => Number) graceMinutesOverride?: number;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @Length(1, 32) employeeCode?: string;
  @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(2000) address?: string;
  @IsOptional() @IsString() @MaxLength(150) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(50) emergencyContactPhone?: string;
  @IsOptional() @IsDateString() joiningDate?: string;
  @IsOptional() @IsDateString() terminationDate?: string;
  @IsOptional() @IsString() @MaxLength(2000) terminationReason?: string;
  @IsOptional() @IsEnum(EmploymentStatus) status?: EmploymentStatus;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() designationId?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsInt({ each: true })
  @Min(0, { each: true }) @Max(6, { each: true }) workDaysOverride?: number[];
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/) workStartTimeOverride?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/) workEndTimeOverride?: string;
  @IsOptional() @IsInt() @Min(0) @Max(240) @Type(() => Number) graceMinutesOverride?: number;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}

export class EmployeeQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(EmploymentStatus) status?: EmploymentStatus;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() designationId?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit = 20;
}

export class LinkEmployeeAccountDto {
  @IsOptional() @IsUUID() userId?: string | null;
}

export class AttendanceQueryDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit = 31;
}

export class UpsertAttendanceDto {
  @IsUUID() employeeId: string;
  @IsDateString() workDate: string;
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @IsOptional() @IsDateString() checkInAt?: string;
  @IsOptional() @IsDateString() checkOutAt?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class BulkAttendanceDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsUUID('4', { each: true }) employeeIds: string[];
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsEnum(AttendanceStatus) status: AttendanceStatus;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
