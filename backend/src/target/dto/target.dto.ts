import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

export class TargetParameterDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  value: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateTargetDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Format: YYYY-MM' })
  @IsString()
  targetMonth: string;

  @ApiProperty({ type: [TargetParameterDto] })
  @IsArray()
  targetData: TargetParameterDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTargetDto {
  @ApiPropertyOptional({ type: [TargetParameterDto] })
  @IsOptional()
  @IsArray()
  targetData?: TargetParameterDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkCreateTargetDto {
  @ApiProperty({ description: 'Format: YYYY-MM' })
  @IsString()
  targetMonth: string;

  @ApiProperty()
  @IsArray()
  employeeIds: string[];

  @ApiProperty({ type: [TargetParameterDto] })
  @IsArray()
  targetData: TargetParameterDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
