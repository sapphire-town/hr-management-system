import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({ description: 'Holiday date', example: '2024-01-26' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Holiday name', example: 'Republic Day' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Holiday description' })
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

export class HolidayFilterDto {
  @ApiPropertyOptional({ description: 'Year to filter holidays' })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({ description: 'Start date for range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
