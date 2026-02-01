import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { UserRole } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  role: any;
  employeeId?: string;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get role-specific dashboard statistics' })
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getStats(user.sub, user.role, user.employeeId);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get recent activities for dashboard' })
  async getActivities(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentActivities(
      user.sub,
      user.role,
      user.employeeId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending approvals count' })
  async getPendingApprovals(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getPendingApprovals(
      user.sub,
      user.role,
      user.employeeId,
    );
  }

  @Get('charts/:type')
  @ApiOperation({ summary: 'Get chart data for dashboard' })
  async getChartData(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
  ) {
    return this.dashboardService.getChartData(type, user.role, user.employeeId);
  }

  @Get('reports/comprehensive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get comprehensive reports for Director and HR Head' })
  async getComprehensiveReports(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getComprehensiveReports();
  }
}
