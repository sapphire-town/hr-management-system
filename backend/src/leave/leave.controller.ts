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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { LeaveService } from './leave.service';
import { ApplyLeaveDto, LeaveActionDto, LeaveFilterDto } from './dto/leave.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @ApiOperation({ summary: 'Apply for leave' })
  async apply(@CurrentUser() user: JwtPayload, @Body() dto: ApplyLeaveDto) {
    if (!user.employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.leaveService.apply(user.employeeId, dto);
  }

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all leave requests' })
  async findAll(@Query() filters: LeaveFilterDto) {
    return this.leaveService.findAll(filters);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my leave requests' })
  async getMyLeaves(
    @CurrentUser() user: JwtPayload,
    @Query() filters: LeaveFilterDto,
  ) {
    if (!user.employeeId) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
    return this.leaveService.findMyLeaves(user.employeeId, filters);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get my leave balance' })
  async getBalance(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return { sick: 0, casual: 0, earned: 0, total: 0 };
    }
    return this.leaveService.getBalance(user.employeeId);
  }

  @Get('pending/manager')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Get pending leaves for manager approval' })
  async getPendingForManager(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      throw new BadRequestException('Your account is not linked to an employee profile. Please contact HR.');
    }
    return this.leaveService.getPendingForManager(user.employeeId);
  }

  @Get('pending/hr')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get pending leaves for HR approval' })
  async getPendingForHR() {
    return this.leaveService.getPendingForHR();
  }

  // ==================== ANALYTICS & REPORTS ====================

  @Get('analytics')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get leave analytics' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async getAnalytics(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.leaveService.getLeaveAnalytics(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('reports')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get detailed leave report for all employees' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async getReport(
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.leaveService.getLeaveReport(
      parseInt(year, 10),
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('trends')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get monthly leave trends for a year' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getMonthlyTrend(@Query('year') year: string) {
    return this.leaveService.getMonthlyTrend(parseInt(year, 10));
  }

  @Get('team-calendar')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get team leave calendar with holidays' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  async getTeamCalendar(
    @CurrentUser() user: JwtPayload,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    if (!user.employeeId) {
      return { teamMembers: 0, leaves: [], holidays: [] };
    }
    return this.leaveService.getTeamLeaveCalendar(
      user.employeeId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('department-stats')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get leave statistics by department/role' })
  async getDepartmentStats() {
    return this.leaveService.getDepartmentLeaveStats();
  }

  // ==================== APPROVAL ACTIONS ====================

  @Patch(':id/approve')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Approve leave request' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: LeaveActionDto,
  ) {
    return this.leaveService.approve(id, user.role, user.sub, dto);
  }

  @Patch(':id/reject')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Reject leave request' })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: LeaveActionDto,
  ) {
    return this.leaveService.reject(id, user.role, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel leave request' })
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.leaveService.cancel(id, user.employeeId);
  }
}
