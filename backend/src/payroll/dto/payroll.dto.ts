import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

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
