import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { EmployeeType, UserRole, InternType } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty()
  @IsNumber()
  salary: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: EmployeeType })
  @IsOptional()
  @IsEnum(EmployeeType)
  employeeType?: EmployeeType;

  @ApiPropertyOptional({ enum: InternType, description: 'Type of internship (only for interns)' })
  @IsOptional()
  @IsEnum(InternType)
  internType?: InternType;

  @ApiPropertyOptional({ description: 'Contract/internship end date' })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional({ description: 'Duration of internship (e.g., "3 months")' })
  @IsOptional()
  @IsString()
  internshipDuration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinDate?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankIfsc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankBranch?: string;
}

export class PromoteEmployeeDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  newUserRole: UserRole;

  @ApiPropertyOptional({ description: 'New job designation role ID. If not provided, system will try to auto-match a role by access level name.' })
  @IsOptional()
  @IsUUID()
  newRoleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  newSalary?: number;
}

export class AssignManagerDto {
  @ApiProperty()
  @IsUUID()
  managerId: string;
}

export class AssignTeamMembersDto {
  @ApiProperty({ type: [String] })
  @IsUUID('4', { each: true })
  employeeIds: string[];
}

export class UpdateMyProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.emergencyContactEmail !== '')
  @IsEmail()
  emergencyContactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankIfsc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankBranch?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export interface BulkEmployeeRecord {
  email: string;
  firstName: string;
  lastName: string;
  userRole: string;
  roleName: string;
  salary: number;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  employeeType?: string;
  joinDate?: string;
  managerEmail?: string;
}

export interface BulkImportResult {
  email: string;
  status: 'success' | 'failed';
  message?: string;
  temporaryPassword?: string;
}

export class EmployeeFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ enum: EmployeeType })
  @IsOptional()
  @IsEnum(EmployeeType)
  employeeType?: EmployeeType;

  @ApiPropertyOptional({ description: 'Filter by active status: true, false, or all' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
