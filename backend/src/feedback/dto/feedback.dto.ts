import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, IsEnum, IsArray, ArrayMinSize } from 'class-validator';

export enum FeedbackSubject {
  MANAGER = 'Manager',
  COMPANY = 'Company',
  HR_HEAD = 'HR Head',
  DIRECTOR = 'Director',
  WORK_ENVIRONMENT = 'Work Environment',
  OTHER = 'Other',
}

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackSubject })
  @IsEnum(FeedbackSubject)
  subject: FeedbackSubject;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;
}

export class HRFeedbackDto {
  @ApiProperty()
  @IsUUID()
  toId: string;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  content: string;
}

export class BulkHRFeedbackDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  toIds: string[];

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  content: string;
}

export class FeedbackFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}