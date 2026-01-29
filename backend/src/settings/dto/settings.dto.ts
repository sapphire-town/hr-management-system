import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workingHoursStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workingHoursEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  workingDays?: number[];
}

export class UpdateLeavePoliciesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sickLeavePerYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  casualLeavePerYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  earnedLeavePerYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxConsecutiveDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  carryForwardAllowed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxCarryForward?: number;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inAppNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reminderDaysBefore?: number;
}
