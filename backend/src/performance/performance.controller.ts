import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PerformanceService } from './performance.service';
import { PerformanceFilterDto } from './dto/performance.dto';

@ApiTags('Performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // Get my own performance
  @Get('my-performance')
  @ApiOperation({ summary: 'Get my performance metrics' })
  async getMyPerformance(@Request() req: any, @Query() filters: PerformanceFilterDto) {
    return this.performanceService.getEmployeePerformance(req.user.employeeId, filters);
  }

  // Get my performance history (trends over months)
  @Get('my-history')
  @ApiOperation({ summary: 'Get my performance history' })
  async getMyHistory(@Request() req: any, @Query('months') months?: number) {
    return this.performanceService.getEmployeePerformanceHistory(
      req.user.employeeId,
      months || 6,
    );
  }

  // Get specific employee performance (HR/Director/Manager)
  @Get('employee/:id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get employee performance metrics' })
  async getEmployeePerformance(
    @Param('id') employeeId: string,
    @Query() filters: PerformanceFilterDto,
  ) {
    return this.performanceService.getEmployeePerformance(employeeId, filters);
  }

  // Get employee performance history (HR/Director/Manager)
  @Get('employee/:id/history')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get employee performance history' })
  async getEmployeeHistory(
    @Param('id') employeeId: string,
    @Query('months') months?: number,
  ) {
    return this.performanceService.getEmployeePerformanceHistory(employeeId, months || 6);
  }

  // Get team performance (Manager)
  @Get('team')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get team performance metrics' })
  async getTeamPerformance(@Request() req: any, @Query() filters: PerformanceFilterDto) {
    return this.performanceService.getTeamPerformance(req.user.employeeId, filters);
  }

  // Get all employees performance (Director/HR)
  @Get('all-employees')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get all employees performance' })
  async getAllEmployeesPerformance(@Query() filters: PerformanceFilterDto) {
    return this.performanceService.getAllEmployeesPerformance(filters);
  }

  // Get department performance (Director/HR)
  @Get('departments')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get department-wise performance' })
  async getDepartmentPerformance(@Query() filters: PerformanceFilterDto) {
    return this.performanceService.getDepartmentPerformance(filters);
  }

  // Get company-wide performance (Director)
  @Get('company')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get company-wide performance metrics' })
  async getCompanyPerformance(@Query() filters: PerformanceFilterDto) {
    return this.performanceService.getCompanyPerformance(filters);
  }

  // Get performance trends
  @Get('trends')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get performance trends' })
  async getPerformanceTrends(@Query('months') months?: number) {
    return this.performanceService.getPerformanceTrends(months || 6);
  }

  // Get chart data
  @Get('chart/:type')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get performance chart data' })
  async getChartData(
    @Param('type') type: 'department' | 'trend' | 'distribution',
    @Query() filters: PerformanceFilterDto,
  ) {
    return this.performanceService.getPerformanceChartData(type, filters);
  }
}
