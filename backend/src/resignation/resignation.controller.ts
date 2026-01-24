import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ResignationService } from './resignation.service';
import {
  CreateResignationDto,
  ApproveResignationDto,
  RejectResignationDto,
  ResignationFilterDto,
  UpdateExitStatusDto,
} from './dto/resignation.dto';

@ApiTags('Resignations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resignations')
export class ResignationController {
  constructor(private readonly resignationService: ResignationService) {}

  // Employee endpoints
  @Post()
  @ApiOperation({ summary: 'Submit resignation' })
  async submitResignation(@Request() req: any, @Body() dto: CreateResignationDto) {
    return this.resignationService.submitResignation(req.user.employeeId, dto);
  }

  @Get('my-resignation')
  @ApiOperation({ summary: 'Get my resignation status' })
  async getMyResignation(@Request() req: any) {
    return this.resignationService.getMyResignation(req.user.employeeId);
  }

  @Delete('withdraw')
  @ApiOperation({ summary: 'Withdraw resignation' })
  async withdrawResignation(@Request() req: any) {
    return this.resignationService.withdrawResignation(req.user.employeeId);
  }

  // Manager endpoints
  @Get('team')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get team resignations' })
  async getTeamResignations(@Request() req: any, @Query() filters: ResignationFilterDto) {
    return this.resignationService.getTeamResignations(req.user.employeeId, filters);
  }

  @Patch(':id/manager-approve')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Manager approve resignation' })
  async managerApprove(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ApproveResignationDto,
  ) {
    return this.resignationService.managerApprove(id, req.user.employeeId, dto);
  }

  @Patch(':id/manager-reject')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Manager reject resignation' })
  async managerReject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: RejectResignationDto,
  ) {
    return this.resignationService.managerReject(id, req.user.employeeId, dto);
  }

  // HR endpoints
  @Get('stats')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get resignation statistics' })
  async getStats() {
    return this.resignationService.getResignationStats();
  }

  @Get('all')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get all resignations' })
  async getAllResignations(@Query() filters: ResignationFilterDto) {
    return this.resignationService.getAllResignations(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resignation by ID' })
  async getResignationById(@Param('id') id: string) {
    return this.resignationService.getResignationById(id);
  }

  @Patch(':id/hr-approve')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'HR approve resignation' })
  async hrApprove(@Param('id') id: string, @Body() dto: ApproveResignationDto) {
    return this.resignationService.hrApprove(id, dto);
  }

  @Patch(':id/hr-reject')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'HR reject resignation' })
  async hrReject(@Param('id') id: string, @Body() dto: RejectResignationDto) {
    return this.resignationService.hrReject(id, dto);
  }

  @Patch(':id/exit-status')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Update exit status' })
  async updateExitStatus(@Param('id') id: string, @Body() dto: UpdateExitStatusDto) {
    return this.resignationService.updateExitStatus(id, dto);
  }
}
