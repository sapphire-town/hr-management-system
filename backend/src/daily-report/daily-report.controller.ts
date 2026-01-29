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
import { DailyReportService } from './daily-report.service';
import {
  CreateDailyReportDto,
  UpdateDailyReportDto,
  VerifyDailyReportDto,
  DailyReportFilterDto,
} from './dto/daily-report.dto';

@ApiTags('Daily Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('daily-reports')
export class DailyReportController {
  constructor(private readonly dailyReportService: DailyReportService) {}

  // Employee endpoints

  @Get('my-params')
  @ApiOperation({ summary: 'Get my daily reporting parameters based on role' })
  async getMyReportingParams(@Request() req: any) {
    return this.dailyReportService.getMyReportingParams(req.user.employeeId);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a daily report' })
  async create(@Request() req: any, @Body() dto: CreateDailyReportDto) {
    return this.dailyReportService.create(req.user.employeeId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my daily reports' })
  async getMyReports(@Request() req: any, @Query() filters: DailyReportFilterDto) {
    return this.dailyReportService.getMyReports(req.user.employeeId, filters);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s report' })
  async getTodayReport(@Request() req: any) {
    return this.dailyReportService.getTodayReport(req.user.employeeId);
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get my report statistics' })
  async getMyStats(@Request() req: any, @Query('month') month?: string) {
    return this.dailyReportService.getMyStats(req.user.employeeId, month);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a daily report' })
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateDailyReportDto,
  ) {
    return this.dailyReportService.update(id, req.user.employeeId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a daily report' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.dailyReportService.delete(id, req.user.employeeId);
  }

  // Manager endpoints

  @Get('team')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get team daily reports' })
  async getTeamReports(@Request() req: any, @Query() filters: DailyReportFilterDto) {
    return this.dailyReportService.getTeamReports(req.user.employeeId, filters);
  }

  @Get('team/pending')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get pending team reports for verification' })
  async getPendingTeamReports(@Request() req: any) {
    return this.dailyReportService.getPendingTeamReports(req.user.employeeId);
  }

  @Patch(':id/verify')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Verify a daily report' })
  async verify(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: VerifyDailyReportDto,
  ) {
    return this.dailyReportService.verify(id, req.user.employeeId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a daily report by ID' })
  async getById(@Param('id') id: string) {
    return this.dailyReportService.getById(id);
  }
}
