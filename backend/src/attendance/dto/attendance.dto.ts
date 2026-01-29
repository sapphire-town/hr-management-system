import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class MarkAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAttendanceDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsArray()
  records: {
    employeeId: string;
    status: AttendanceStatus;
    notes?: string;
  }[];
}

export class AttendanceFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}

export class CreateHolidayDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateHolidayDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class OverrideAttendanceDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
