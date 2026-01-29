import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsObject, IsBoolean } from 'class-validator';

export class ReportDataValueDto {
  @ApiProperty({ example: 'calls_made' })
  @IsString()
  key: string;

  @ApiProperty({ example: 45 })
  value: number;
}

export class CreateDailyReportDto {
  @ApiProperty({ description: 'Date of the report (YYYY-MM-DD)' })
  @IsDateString()
  reportDate: string;

  @ApiProperty({
    description: 'Report data containing parameter values',
    example: { calls_made: 45, emails_sent: 20, meetings_attended: 3 },
  })
  @IsObject()
  reportData: Record<string, number>;
}

export class UpdateDailyReportDto {
  @ApiPropertyOptional({
    description: 'Report data containing parameter values',
  })
  @IsOptional()
  @IsObject()
  reportData?: Record<string, number>;
}

export class VerifyDailyReportDto {
  @ApiPropertyOptional({ description: 'Manager comment on the report' })
  @IsOptional()
  @IsString()
  managerComment?: string;
}

export class DailyReportFilterDto {
  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Verification status' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
