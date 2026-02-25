import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class CreateAssetRequestDto {
  @ApiProperty({ description: 'Type of asset', example: 'laptop' })
  @IsString()
  assetType: string;

  @ApiProperty({ description: 'Reason for request' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Urgency level', example: 'normal' })
  @IsString()
  urgency: string;
}

export class ApproveAssetRequestDto {
  @ApiPropertyOptional({ description: 'Comments for approval' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class RejectAssetRequestDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  rejectionReason: string;
}

export class AllocateAssetDto {
  @ApiProperty({ description: 'Asset serial number' })
  @IsString()
  assetSerialNo: string;
}

export class ReturnAssetDto {
  @ApiProperty({ description: 'Reason for returning the asset' })
  @IsString()
  returnReason: string;

  @ApiProperty({ description: 'Condition of the asset being returned', example: 'good' })
  @IsString()
  returnCondition: string;
}

export class AssetFilterDto {
  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ description: 'Filter by asset type' })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by urgency' })
  @IsOptional()
  @IsString()
  urgency?: string;
}
