import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  Matches,
  IsInt,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';

export class GeneratePayslipsDto {
  @ApiProperty({ description: 'Month in YYYY-MM format', example: '2024-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' })
  month: string;
}

export class PayslipFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Month in YYYY-MM format' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: 'Year filter' })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}

export class SetWorkingDaysDto {
  @ApiProperty({ description: 'Month in YYYY-MM format', example: '2024-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' })
  month: string;

  @ApiProperty({ description: 'Number of working days in the month', example: 22 })
  @IsInt()
  @Min(0)
  workingDays: number;

  @ApiPropertyOptional({ description: 'Notes about the working days configuration' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Per-employee overrides',
    example: [{ employeeId: 'uuid', workingDays: 20, reason: 'Joined mid-month' }],
  })
  @IsOptional()
  @IsArray()
  overrides?: Array<{ employeeId: string; workingDays: number; reason?: string }>;
}

export class AdjustLeaveBalanceDto {
  @ApiProperty({ description: 'Leave type to adjust', enum: ['SICK', 'CASUAL', 'EARNED'] })
  @IsString()
  @IsEnum(['SICK', 'CASUAL', 'EARNED'], { message: 'leaveType must be SICK, CASUAL, or EARNED' })
  leaveType: 'SICK' | 'CASUAL' | 'EARNED';

  @ApiProperty({ description: 'Adjustment amount (positive to add, negative to deduct)', example: 2 })
  @IsNumber()
  adjustment: number;

  @ApiProperty({ description: 'Reason for the adjustment' })
  @IsString()
  reason: string;
}
