import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsObject, IsBoolean, IsArray } from 'class-validator';

// Structure for each parameter's data
export class ParamDataDto {
  @ApiProperty({ example: 45 })
  value: number;

  @ApiPropertyOptional({ example: 'Completed all assigned tasks' })
  notes?: string;

  @ApiPropertyOptional({ example: ['https://github.com/pr/123', 'https://jira.com/TASK-456'] })
  links?: string[];
}

// Structure for attachments
export class AttachmentDto {
  @ApiProperty({ example: 'screenshot.png' })
  fileName: string;

  @ApiProperty({ example: '/uploads/daily-reports/abc123/screenshot.png' })
  filePath: string;

  @ApiPropertyOptional({ example: 'tasks_completed', description: 'Parameter key this attachment belongs to' })
  paramKey?: string;
}

export class CreateDailyReportDto {
  @ApiProperty({ description: 'Date of the report (YYYY-MM-DD)' })
  @IsDateString()
  reportDate: string;

  @ApiProperty({
    description: 'Report data containing parameter values with optional notes and links',
    example: {
      tasks_completed: { value: 5, notes: 'Finished feature X', links: ['https://github.com/pr/123'] },
      bugs_fixed: { value: 3, notes: 'Fixed critical bugs' },
    },
  })
  @IsObject()
  reportData: Record<string, ParamDataDto>;

  @ApiPropertyOptional({ description: 'General notes/summary for the day' })
  @IsOptional()
  @IsString()
  generalNotes?: string;

  @ApiPropertyOptional({ description: 'Array of attachment objects', type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  attachments?: AttachmentDto[];
}

export class UpdateDailyReportDto {
  @ApiPropertyOptional({
    description: 'Report data containing parameter values with optional notes and links',
  })
  @IsOptional()
  @IsObject()
  reportData?: Record<string, ParamDataDto>;

  @ApiPropertyOptional({ description: 'General notes/summary for the day' })
  @IsOptional()
  @IsString()
  generalNotes?: string;

  @ApiPropertyOptional({ description: 'Array of attachment objects', type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  attachments?: AttachmentDto[];
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
