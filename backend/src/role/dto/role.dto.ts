import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DailyReportingParamDto {
  @ApiProperty({ example: 'calls_made' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Calls Made' })
  @IsString()
  label: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  target: number;

  @ApiProperty({ example: 'number' })
  @IsString()
  type: string;

  @ApiProperty({ example: false, required: false, description: 'Allow employees to upload proof documents for this parameter' })
  @IsOptional()
  @IsBoolean()
  allowProof?: boolean;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'Sales Executive' })
  @IsString()
  name: string;

  @ApiProperty({ type: [DailyReportingParamDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyReportingParamDto)
  dailyReportingParams?: DailyReportingParamDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  performanceChartConfig?: any;
}

export class UpdateRoleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ type: [DailyReportingParamDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyReportingParamDto)
  dailyReportingParams?: DailyReportingParamDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  performanceChartConfig?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetRequirementDto {
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumRequired: number;
}

export class RoleFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}