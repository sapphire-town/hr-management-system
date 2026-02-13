import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DocumentStatus } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Document type', example: 'offer_letter' })
  @IsString()
  documentType: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UploadVerificationDocumentDto {
  @ApiProperty({ description: 'Document type', example: 'id_proof' })
  @IsString()
  documentType: string;
}

export class VerifyDocumentDto {
  @ApiProperty({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @ApiPropertyOptional({ description: 'Rejection reason if rejected' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ReleaseDocumentDto {
  @ApiProperty({ description: 'Employee ID to release document to' })
  @IsString()
  employeeId: string;

  @ApiProperty({ description: 'Document type', example: 'offer_letter' })
  @IsString()
  documentType: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkReleaseDocumentDto {
  @ApiProperty({ description: 'Comma-separated employee IDs' })
  @IsString()
  employeeIds: string;

  @ApiProperty({ description: 'Document type', example: 'offer_letter' })
  @IsString()
  documentType: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class DocumentFilterDto {
  @ApiPropertyOptional({ description: 'Filter by document type' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}
