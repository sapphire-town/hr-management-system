import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';
import { ReimbursementStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateReimbursementDto {
  @ApiProperty({ description: 'Expense category', example: 'Travel' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Amount', example: 1500.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Date of expense', example: '2024-01-15' })
  @IsDateString()
  expenseDate: string;

  @ApiProperty({ description: 'Description of expense' })
  @IsString()
  description: string;
}

export class ApproveReimbursementDto {
  @ApiPropertyOptional({ description: 'Comments for approval' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class RejectReimbursementDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  rejectionReason: string;
}

export class ReimbursementFilterDto {
  @ApiPropertyOptional({ enum: ReimbursementStatus })
  @IsOptional()
  @IsEnum(ReimbursementStatus)
  status?: ReimbursementStatus;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Start date for range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
