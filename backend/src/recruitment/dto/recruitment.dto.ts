import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InterviewRoundStatus } from '@prisma/client';

class DriveRoleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  positions?: number;
}

export class CreatePlacementDriveDto {
  @ApiProperty()
  @IsString()
  collegeName: string;

  @ApiProperty()
  @IsDateString()
  driveDate: string;

  @ApiProperty({ type: [DriveRoleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriveRoleDto)
  roles: DriveRoleDto[];
}

export class UpdatePlacementDriveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collegeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  driveDate?: string;

  @ApiPropertyOptional({ type: [DriveRoleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriveRoleDto)
  roles?: DriveRoleDto[];
}

export class AssignInterviewersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  interviewerIds: string[];
}

export class CreateStudentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  studentData?: Record<string, any>;
}

export class BulkCreateStudentsDto {
  @ApiProperty({ type: [CreateStudentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStudentDto)
  students: CreateStudentDto[];
}

export class EvaluateStudentDto {
  @ApiProperty({ enum: InterviewRoundStatus })
  @IsEnum(InterviewRoundStatus)
  status: InterviewRoundStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class DriveFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
