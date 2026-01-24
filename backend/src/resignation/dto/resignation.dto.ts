import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';
import { ResignationStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateResignationDto {
  @ApiProperty({ description: 'Notice period in days', example: 30 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  noticePeriodDays: number;

  @ApiProperty({ description: 'Reason for resignation' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Last working day', example: '2024-02-15' })
  @IsDateString()
  lastWorkingDay: string;
}

export class ApproveResignationDto {
  @ApiPropertyOptional({ description: 'Comments for approval' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ description: 'Adjusted last working day' })
  @IsOptional()
  @IsDateString()
  adjustedLastWorkingDay?: string;
}

export class RejectResignationDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  rejectionReason: string;
}

export class ResignationFilterDto {
  @ApiPropertyOptional({ enum: ResignationStatus })
  @IsOptional()
  @IsEnum(ResignationStatus)
  status?: ResignationStatus;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class UpdateExitStatusDto {
  @ApiPropertyOptional({ description: 'Asset handover completed' })
  @IsOptional()
  assetHandover?: boolean;

  @ApiPropertyOptional({ description: 'Account deactivated' })
  @IsOptional()
  accountDeactivated?: boolean;

  @ApiPropertyOptional({ description: 'No dues clearance sent' })
  @IsOptional()
  noDueClearanceSent?: boolean;
}
