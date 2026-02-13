import {
  Controller,
  Get,
  Post,
  Patch,
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
import { PayrollService } from './payroll.service';
import {
  GeneratePayslipsDto,
  PayslipFilterDto,
  SetWorkingDaysDto,
  AdjustLeaveBalanceDto,
} from './dto/payroll.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  /**
   * Get logged-in employee's payslips
   */
  @Get('my')
  @ApiOperation({ summary: 'Get my payslips' })
  async getMyPayslips(
    @CurrentUser() user: JwtPayload,
    @Query() filters: PayslipFilterDto,
  ) {
    if (!user.employeeId) {
      return [];
    }
    return this.payrollService.getMyPayslips(user.employeeId, filters);
  }

  /**
   * Generate payslips for all employees for a given month (HR only)
   */
  @Post('generate')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Generate payslips for a month' })
  async generatePayslips(@Body() dto: GeneratePayslipsDto) {
    return this.payrollService.generatePayslips(dto);
  }

  // ==================== WORKING DAYS CONFIG ====================

  /**
   * Get working days configuration for a month
   */
  @Get('working-days/:month')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get working days config for a month' })
  async getWorkingDays(@Param('month') month: string) {
    return this.payrollService.getMonthlyWorkingDays(month);
  }

  /**
   * Set working days for a month (HR only)
   */
  @Post('working-days')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Set working days for a month' })
  async setWorkingDays(
    @Body() dto: SetWorkingDaysDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.payrollService.setMonthlyWorkingDays(dto, user.employeeId || user.sub);
  }

  // ==================== LEAVE BALANCE MANAGEMENT ====================

  /**
   * Get all employee leave balances (HR view)
   */
  @Get('leave-balances')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get all employee leave balances' })
  async getLeaveBalances() {
    return this.payrollService.getLeaveBalances();
  }

  /**
   * Adjust an employee's leave balance (HR only)
   */
  @Patch('leave-balance/:employeeId')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Adjust employee leave balance' })
  async adjustLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Body() dto: AdjustLeaveBalanceDto,
  ) {
    return this.payrollService.adjustLeaveBalance(employeeId, dto);
  }

  // ==================== PAYSLIP QUERIES ====================

  /**
   * Get all payslips for a specific month (HR view)
   */
  @Get('month/:month')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get all payslips for a month' })
  async getPayslipsByMonth(@Param('month') month: string) {
    return this.payrollService.getPayslipsByMonth(month);
  }

  /**
   * Get payroll statistics for a month (HR view)
   */
  @Get('stats/:month')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get payroll statistics for a month' })
  async getPayrollStats(@Param('month') month: string) {
    return this.payrollService.getPayrollStats(month);
  }

  /**
   * Get a single payslip by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get payslip details' })
  async getPayslipById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // If not HR/Director, only allow viewing own payslips
    const employeeId =
      user.role === UserRole.HR_HEAD || user.role === UserRole.DIRECTOR
        ? undefined
        : user.employeeId;
    return this.payrollService.getPayslipById(id, employeeId);
  }

  /**
   * Regenerate a specific payslip (HR only)
   */
  @Post(':id/regenerate')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Regenerate a specific payslip' })
  async regeneratePayslip(@Param('id') id: string) {
    return this.payrollService.regeneratePayslip(id);
  }
}
