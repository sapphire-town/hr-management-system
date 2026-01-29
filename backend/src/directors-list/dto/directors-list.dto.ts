import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class NominateEmployeeDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Period in YYYY-MM format', example: '2024-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Period must be in YYYY-MM format' })
  period: string;

  @ApiProperty()
  @IsString()
  reason: string;
}

export class ApproveNominationDto {
  @ApiProperty()
  @IsBoolean()
  isApproved: boolean;
}

export class NominationFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
