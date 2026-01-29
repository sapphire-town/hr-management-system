import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min } from 'class-validator';

export enum Urgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateHiringRequestDto {
  @ApiProperty()
  @IsString()
  roleId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  positions: number;

  @ApiProperty()
  @IsString()
  justification: string;

  @ApiProperty({ enum: Urgency })
  @IsEnum(Urgency)
  urgency: Urgency;
}

export class UpdateHiringRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  positions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({ enum: Urgency })
  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;
}

export class ApproveHiringRequestDto {
  @ApiProperty()
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class HiringFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  urgency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
