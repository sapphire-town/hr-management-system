import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ArrayMinSize, IsUUID } from 'class-validator';

export class CreateDocumentTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'Offer Letter Template' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Document type', example: 'OFFER_LETTER' })
  @IsString()
  documentType: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class GenerateDocumentsDto {
  @ApiProperty({ description: 'Array of employee IDs to generate documents for' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  employeeIds: string[];
}
