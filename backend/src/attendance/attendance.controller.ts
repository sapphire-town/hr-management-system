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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import {
  MarkAttendanceDto,
  BulkAttendanceDto,
  AttendanceFilterDto,
  CreateHolidayDto,
  UpdateHolidayDto,
  OverrideAttendanceDto,
} from './dto/attendance.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  @ApiOperation({ summary: 'Mark attendance for today' })
  async markAttendance(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MarkAttendanceDto,
  ) {
    if (!user.employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.attendanceService.markAttendance(user.employeeId, dto);
  }

  @Post('bulk')
  @Roles(UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark bulk attendance' })
  async markBulkAttendance(@Body() dto: BulkAttendanceDto) {
    return this.attendanceService.markBulkAttendance(dto);
  }

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get all attendance records' })
  async findAll(@Query() filters: AttendanceFilterDto) {
    return this.attendanceService.findAll(filters);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my attendance records' })
  async getMyAttendance(
    @CurrentUser() user: JwtPayload,
    @Query() filters: AttendanceFilterDto,
  ) {
    if (!user.employeeId) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
    return this.attendanceService.getMyAttendance(user.employeeId, filters);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today attendance status' })
  async getTodayStatus(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return { marked: false, status: null };
    }
    return this.attendanceService.getTodayStatus(user.employeeId);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get attendance calendar view' })
  async getCalendar(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    if (!user.employeeId) {
      return [];
    }
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();
    return this.attendanceService.getCalendar(user.employeeId, m, y);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get attendance summary for a month' })
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    if (!user.employeeId) {
      return { present: 0, absent: 0, halfDay: 0, paidLeave: 0, holiday: 0, total: 0 };
    }
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();
    return this.attendanceService.getSummary(user.employeeId, m, y);
  }

  @Get('team')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Get team attendance' })
  async getTeamAttendance(
    @CurrentUser() user: JwtPayload,
    @Query('date') date?: string,
  ) {
    if (!user.employeeId) {
      return [];
    }
    return this.attendanceService.getTeamAttendance(user.employeeId, date);
  }

  // Calendar with holidays
  @Get('calendar-full')
  @ApiOperation({ summary: 'Get attendance calendar with holidays' })
  async getCalendarWithHolidays(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    if (!user.employeeId) {
      return [];
    }
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();
    return this.attendanceService.getCalendarWithHolidays(user.employeeId, m, y);
  }

  // Get all employees attendance for a date (HR view)
  @Get('all-employees')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get all employees attendance for a date' })
  async getAllEmployeesAttendance(@Query('date') date: string) {
    return this.attendanceService.getAllEmployeesAttendance(date);
  }

  // HR Override attendance
  @Post('override')
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Override attendance (HR only)' })
  async overrideAttendance(
    @CurrentUser() user: JwtPayload,
    @Body() dto: OverrideAttendanceDto,
  ) {
    return this.attendanceService.overrideAttendance(dto, user.employeeId || user.sub);
  }

  // Holiday Management
  @Get('holidays')
  @ApiOperation({ summary: 'Get all holidays' })
  async getAllHolidays(@Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : undefined;
    return this.attendanceService.getAllHolidays(y);
  }

  @Get('holidays/month')
  @ApiOperation({ summary: 'Get holidays for a month' })
  async getHolidaysForMonth(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();
    return this.attendanceService.getHolidaysForMonth(m, y);
  }

  @Post('holidays')
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Create a holiday' })
  async createHoliday(@Body() dto: CreateHolidayDto) {
    return this.attendanceService.createHoliday(dto);
  }

  @Patch('holidays/:id')
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update a holiday' })
  async updateHoliday(
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.attendanceService.updateHoliday(id, dto);
  }

  @Delete('holidays/:id')
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Delete a holiday' })
  async deleteHoliday(@Param('id') id: string) {
    return this.attendanceService.deleteHoliday(id);
  }
}
