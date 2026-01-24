import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AssetService } from './asset.service';
import {
  CreateAssetRequestDto,
  ApproveAssetRequestDto,
  RejectAssetRequestDto,
  AllocateAssetDto,
  AssetFilterDto,
} from './dto/asset.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  // Employee endpoints
  @Post('request')
  @ApiOperation({ summary: 'Create a new asset request' })
  async createRequest(@Request() req: any, @Body() dto: CreateAssetRequestDto) {
    return this.assetService.createRequest(req.user.employeeId, dto);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get my asset requests' })
  async getMyRequests(@Request() req: any) {
    return this.assetService.getMyRequests(req.user.employeeId);
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge receipt of asset' })
  async acknowledgeAsset(@Param('id') id: string, @Request() req: any) {
    return this.assetService.acknowledgeAsset(id, req.user.employeeId);
  }

  // Manager endpoints
  @Get('team')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get team asset requests' })
  async getTeamRequests(@Request() req: any, @Query() filters: AssetFilterDto) {
    return this.assetService.getTeamRequests(req.user.employeeId, filters);
  }

  @Patch(':id/manager-approve')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Manager approve asset request' })
  async managerApprove(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ApproveAssetRequestDto,
  ) {
    return this.assetService.managerApprove(id, req.user.employeeId, dto);
  }

  @Patch(':id/manager-reject')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Manager reject asset request' })
  async managerReject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: RejectAssetRequestDto,
  ) {
    return this.assetService.managerReject(id, req.user.employeeId, dto);
  }

  // HR endpoints
  @Get('types')
  @ApiOperation({ summary: 'Get asset types' })
  async getAssetTypes() {
    return this.assetService.getAssetTypes();
  }

  @Get('stats')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get asset statistics' })
  async getStats() {
    return this.assetService.getAssetStats();
  }

  @Get('pending')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get pending asset requests' })
  async getPendingRequests(@Request() req: any, @Query() filters: AssetFilterDto) {
    return this.assetService.getPendingRequests(filters, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset request by ID' })
  async getRequestById(@Param('id') id: string) {
    return this.assetService.getRequestById(id);
  }

  @Patch(':id/hr-approve')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'HR approve asset request' })
  async hrApprove(@Param('id') id: string, @Body() dto: ApproveAssetRequestDto) {
    return this.assetService.hrApprove(id, dto);
  }

  @Patch(':id/hr-reject')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'HR reject asset request' })
  async hrReject(@Param('id') id: string, @Body() dto: RejectAssetRequestDto) {
    return this.assetService.hrReject(id, dto);
  }

  @Patch(':id/allocate')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Allocate asset to employee' })
  async allocateAsset(@Param('id') id: string, @Body() dto: AllocateAssetDto) {
    return this.assetService.allocateAsset(id, dto);
  }
}
