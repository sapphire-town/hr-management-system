import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  GeneratePayslipsDto,
  PayslipFilterDto,
  SetWorkingDaysDto,
  AdjustLeaveBalanceDto,
} from './dto/payroll.dto';
import { AttendanceStatus, NotificationChannel, NotificationType } from '@prisma/client';

// Helper to access MonthlyWorkingDays model (Prisma DLL lock workaround)
const monthlyWorkingDaysModel = (prisma: PrismaService) =>
  (prisma as any).monthlyWorkingDays;

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  // ==================== AUTO-GENERATION CRON ====================

  /**
   * Auto-generate payslips on the 1st of each month at 10 AM
   * Generates for the previous month if not already generated
   */
  @Cron('0 10 1 * *')
  async autoGeneratePayslips() {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    // Check if payslips already generated for this month
    const existingCount = await this.prisma.payslip.count({
      where: { month },
    });

    if (existingCount > 0) {
      console.log(`Payslips already generated for ${month}, skipping auto-generation`);
      return;
    }

    try {
      console.log(`Auto-generating payslips for ${month}...`);
      const result = await this.generatePayslips({ month });

      // Process earned leave accrual after payslip generation
      await this.processEarnedLeaveAccrual(month);

      // Send notifications to all employees
      const payslips = result.data || [];
      for (const payslip of payslips) {
        try {
          const emp = payslip.employee;
          const user = await this.prisma.user.findFirst({
            where: { employee: { id: payslip.employeeId } },
            select: { id: true },
          });
          if (user) {
            await this.prisma.notification.create({
              data: {
                recipientId: user.id,
                subject: 'Payslip Ready',
                message: `Your payslip for ${month} is ready. Net pay: ₹${payslip.netPay.toLocaleString('en-IN')}`,
                type: 'PAYSLIP_GENERATED' as NotificationType,
                channel: NotificationChannel.IN_APP,
                metadata: { payslipId: payslip.id, month },
                sentAt: new Date(),
              },
            });
          }
        } catch (err) {
          console.error(`Failed to send payslip notification for ${payslip.employeeId}:`, err);
        }
      }

      console.log(`Auto-generated ${result.count} payslips for ${month}`);
    } catch (error) {
      console.error(`Auto-generation failed for ${month}:`, error);
    }
  }

  // ==================== WORKING DAYS CONFIGURATION ====================

  /**
   * Set monthly working days (HR Head defines)
   */
  async setMonthlyWorkingDays(dto: SetWorkingDaysDto, setBy: string) {
    const model = monthlyWorkingDaysModel(this.prisma);

    // Check if config already exists for this month
    const existing = await model.findUnique({
      where: { month: dto.month },
    });

    if (existing) {
      return model.update({
        where: { month: dto.month },
        data: {
          workingDays: dto.workingDays,
          overrides: dto.overrides || [],
          notes: dto.notes,
          setBy,
        },
      });
    }

    return model.create({
      data: {
        month: dto.month,
        workingDays: dto.workingDays,
        overrides: dto.overrides || [],
        setBy,
        notes: dto.notes,
      },
    });
  }

  /**
   * Get monthly working days config
   * Returns HR-defined config or auto-calculated default
   */
  async getMonthlyWorkingDays(month: string) {
    const model = monthlyWorkingDaysModel(this.prisma);

    const config = await model.findUnique({
      where: { month },
    });

    if (config) {
      return {
        month,
        workingDays: config.workingDays,
        overrides: config.overrides || [],
        isCustom: true,
        notes: config.notes,
        setBy: config.setBy,
      };
    }

    // Auto-calculate from calendar
    const [year, monthNum] = month.split('-').map(Number);
    const autoCalculated = await this.calculateWorkingDaysFromCalendar(monthNum, year);

    return {
      month,
      workingDays: autoCalculated,
      overrides: [],
      isCustom: false,
      notes: null,
      setBy: null,
    };
  }

  // ==================== LEAVE BALANCE MANAGEMENT ====================

  /**
   * HR adjusts an employee's leave balance
   */
  async adjustLeaveBalance(employeeId: string, dto: AdjustLeaveBalanceDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        sickLeaveBalance: true,
        casualLeaveBalance: true,
        earnedLeaveBalance: true,
        employeeType: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.employeeType === 'INTERN') {
      throw new BadRequestException('Cannot adjust leave balance for interns');
    }

    const balanceField = `${dto.leaveType.toLowerCase()}LeaveBalance` as
      | 'sickLeaveBalance'
      | 'casualLeaveBalance'
      | 'earnedLeaveBalance';

    const currentBalance = employee[balanceField];
    const newBalance = currentBalance + dto.adjustment;

    if (newBalance < 0) {
      throw new BadRequestException(
        `Adjustment would result in negative balance. Current: ${currentBalance}, Adjustment: ${dto.adjustment}`,
      );
    }

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { [balanceField]: newBalance },
    });

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      leaveType: dto.leaveType,
      previousBalance: currentBalance,
      adjustment: dto.adjustment,
      newBalance,
      reason: dto.reason,
    };
  }

  /**
   * Get all employee leave balances (HR view)
   */
  async getLeaveBalances() {
    const employees = (await this.prisma.employee.findMany({
      where: {
        user: { isActive: true },
        employeeType: 'FULL_TIME',
      },
      include: {
        role: { select: { name: true } },
      },
      orderBy: { firstName: 'asc' },
    })) as any[];

    return employees.map((e: any) => ({
      employeeId: e.id,
      name: `${e.firstName} ${e.lastName}`,
      role: e.role.name,
      sick: e.sickLeaveBalance,
      casual: e.casualLeaveBalance,
      earned: e.earnedLeaveBalance,
      total: e.sickLeaveBalance + e.casualLeaveBalance + e.earnedLeaveBalance,
      consecutiveWorkingDays: e.consecutiveWorkingDays,
    }));
  }

  // ==================== EARNED LEAVE ACCRUAL ====================

  /**
   * Process earned leave accrual for all full-time employees
   * Rule: 1 earned leave per 20 consecutive working days
   * Called after payslip generation
   */
  async processEarnedLeaveAccrual(month: string) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const employees = (await this.prisma.employee.findMany({
      where: {
        user: { isActive: true },
        employeeType: 'FULL_TIME',
      },
      select: {
        id: true,
        earnedLeaveBalance: true,
      },
    })) as any[];

    const results: Array<{ employeeId: string; accrued: number }> = [];

    for (const employee of employees) {
      // Get attendance records for the month, sorted by date
      const attendance = await this.prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
      });

      let consecutiveDays = employee.consecutiveWorkingDays;
      let accruedLeaves = 0;

      for (const record of attendance) {
        const status = record.status;
        if (
          status === AttendanceStatus.PRESENT ||
          status === AttendanceStatus.HALF_DAY ||
          status === AttendanceStatus.PAID_LEAVE
        ) {
          consecutiveDays++;
          if (consecutiveDays >= 20) {
            accruedLeaves++;
            consecutiveDays -= 20; // Keep remainder
          }
        } else if (
          status === AttendanceStatus.ABSENT ||
          status === AttendanceStatus.ABSENT_DOUBLE_DEDUCTION
        ) {
          consecutiveDays = 0; // Reset streak on absence
        }
        // OFFICIAL_HOLIDAY doesn't break or advance streak
      }

      // Update employee with new consecutive count and accrued balance
      if (accruedLeaves > 0 || consecutiveDays !== employee.consecutiveWorkingDays) {
        await this.prisma.employee.update({
          where: { id: employee.id },
          data: {
            consecutiveWorkingDays: consecutiveDays,
            ...(accruedLeaves > 0 && {
              earnedLeaveBalance: { increment: accruedLeaves },
            }),
          } as any,
        });
      }

      if (accruedLeaves > 0) {
        results.push({ employeeId: employee.id, accrued: accruedLeaves });
      }
    }

    return {
      month,
      processedEmployees: employees.length,
      accruals: results,
      totalAccrued: results.reduce((sum, r) => sum + r.accrued, 0),
    };
  }

  // ==================== PAYSLIP GENERATION ====================

  /**
   * Generate payslips for all active employees for a given month
   */
  async generatePayslips(dto: GeneratePayslipsDto) {
    const { month } = dto;
    const [year, monthNum] = month.split('-').map(Number);

    // Get all active FULL-TIME employees (exclude interns - they don't get payslips)
    const employees = await this.prisma.employee.findMany({
      where: {
        user: { isActive: true },
        employeeType: 'FULL_TIME', // Interns are excluded from payroll
      },
      include: {
        user: { select: { id: true, email: true } },
        role: { select: { name: true } },
      },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active full-time employees found for payroll');
    }

    // Get working days: prefer HR-defined, fall back to auto-calculation
    const workingDaysConfig = await this.getMonthlyWorkingDays(month);
    const defaultWorkingDays = workingDaysConfig.workingDays;

    // Build per-employee override map
    const overrideMap = new Map<string, number>();
    if (Array.isArray(workingDaysConfig.overrides)) {
      for (const override of workingDaysConfig.overrides as any[]) {
        if (override.employeeId && override.workingDays != null) {
          overrideMap.set(override.employeeId, override.workingDays);
        }
      }
    }

    const results = [];

    for (const employee of employees) {
      // Use per-employee override if available, otherwise default
      const employeeWorkingDays = overrideMap.get(employee.id) ?? defaultWorkingDays;

      const payslipData = await this.calculatePayslip(
        employee.id,
        employee.salary,
        monthNum,
        year,
        employeeWorkingDays,
      );

      // Upsert payslip (create or update if regenerating)
      const payslip = await this.prisma.payslip.upsert({
        where: {
          employeeId_month: {
            employeeId: employee.id,
            month,
          },
        },
        update: {
          ...payslipData,
          regeneratedAt: new Date(),
        },
        create: {
          employeeId: employee.id,
          month,
          ...payslipData,
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              user: { select: { email: true } },
            },
          },
        },
      });

      results.push(payslip);
    }

    return {
      message: `Generated ${results.length} payslips for ${month}`,
      count: results.length,
      data: results,
    };
  }

  /**
   * Calculate working days from calendar (excluding weekends and holidays)
   * This is the auto-calculation fallback when HR hasn't set custom working days
   */
  private async calculateWorkingDaysFromCalendar(month: number, year: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const daysInMonth = endDate.getDate();

    // Get official holidays for the month
    const holidays = await this.prisma.officialHoliday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().split('T')[0]),
    );

    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // Skip holidays
      if (holidayDates.has(dateStr)) {
        continue;
      }

      workingDays++;
    }

    return workingDays;
  }

  /**
   * Calculate working days - checks HR config first, falls back to calendar
   */
  private async calculateWorkingDays(month: number, year: number): Promise<number> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const config = await this.getMonthlyWorkingDays(monthStr);
    return config.workingDays;
  }

  /**
   * Calculate payslip data for an employee
   */
  private async calculatePayslip(
    employeeId: string,
    baseSalary: number,
    month: number,
    year: number,
    workingDays: number,
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    // Get attendance records for the month
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate actual working days from attendance
    let actualWorkingDays = 0;
    let unapprovedAbsences = 0;

    attendanceRecords.forEach((record) => {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          actualWorkingDays += 1;
          break;
        case AttendanceStatus.HALF_DAY:
          actualWorkingDays += 0.5;
          break;
        case AttendanceStatus.PAID_LEAVE:
        case AttendanceStatus.OFFICIAL_HOLIDAY:
          actualWorkingDays += 1; // Paid leave counts as working day
          break;
        case AttendanceStatus.ABSENT:
          // Regular absence
          break;
        case AttendanceStatus.ABSENT_DOUBLE_DEDUCTION:
          unapprovedAbsences += 1;
          break;
      }
    });

    // Get unpaid leaves for the month
    const unpaidLeaves = await this.prisma.leave.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        isPaid: false,
        OR: [
          {
            startDate: { gte: startDate, lte: endDate },
          },
          {
            endDate: { gte: startDate, lte: endDate },
          },
        ],
      },
    });

    let unpaidLeaveDays = 0;
    unpaidLeaves.forEach((leave) => {
      // Calculate days within this month
      const leaveStart = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()));
      const leaveEnd = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()));
      const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      unpaidLeaveDays += days;
    });

    // Calculate holiday sandwich (leave adjacent to weekend/holiday)
    const holidaySandwich = await this.calculateHolidaySandwich(
      employeeId,
      month,
      year,
    );

    // Get rewards for the month
    const rewards = await this.prisma.reward.aggregate({
      where: {
        employeeId,
        awardDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

    // Get approved and processed reimbursements for the month
    const reimbursements = await this.prisma.reimbursement.aggregate({
      where: {
        employeeId,
        status: { in: ['APPROVED', 'PAYMENT_PROCESSED', 'ACKNOWLEDGED'] },
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: { amount: true },
    });

    // Calculate per-day salary
    const perDaySalary = workingDays > 0 ? baseSalary / workingDays : 0;

    // Calculate deductions
    const unpaidLeaveDeduction = unpaidLeaveDays * perDaySalary;
    const unapprovedAbsenceDeduction = unapprovedAbsences * perDaySalary * 2; // Double deduction
    const holidaySandwichDeduction = holidaySandwich * perDaySalary;

    const totalDeductions =
      unpaidLeaveDeduction + unapprovedAbsenceDeduction + holidaySandwichDeduction;

    // Calculate gross pay and net pay
    const rewardAmount = rewards._sum.amount || 0;
    const reimbursementAmount = reimbursements._sum.amount || 0;
    const grossPay = baseSalary + rewardAmount + reimbursementAmount;
    const netPay = grossPay - totalDeductions;

    return {
      baseSalary,
      workingDays,
      actualWorkingDays,
      unpaidLeaves: unpaidLeaveDays,
      unapprovedAbsences,
      holidaySandwich,
      rewards: rewardAmount,
      reimbursements: reimbursementAmount,
      grossPay,
      deductions: totalDeductions,
      netPay,
    };
  }

  /**
   * Calculate holiday sandwich deductions.
   * Rule: If an employee is absent on the working day immediately BEFORE
   * and the working day immediately AFTER a non-working block (official
   * holiday or weekend), those non-working days are counted as absent.
   */
  private async calculateHolidaySandwich(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Fetch attendance records and holidays for the month
    const [attendanceRecords, holidays] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          employeeId,
          date: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.officialHoliday.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Build lookup maps
    const attendanceMap = new Map(
      attendanceRecords.map((r) => [r.date.toISOString().split('T')[0], r.status]),
    );
    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().split('T')[0]),
    );

    const isNonWorkingDay = (d: Date): boolean => {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) return true;
      return holidayDates.has(d.toISOString().split('T')[0]);
    };

    const isAbsent = (dateStr: string): boolean => {
      const status = attendanceMap.get(dateStr);
      return status === 'ABSENT' || status === 'ABSENT_DOUBLE_DEDUCTION';
    };

    let sandwichDays = 0;
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const current = new Date(year, month - 1, day);
      if (!isNonWorkingDay(current)) continue;

      // Find the contiguous non-working block starting from this day
      let blockEnd = new Date(current);
      while (blockEnd <= endDate) {
        const next = new Date(blockEnd);
        next.setDate(next.getDate() + 1);
        if (next > endDate || !isNonWorkingDay(next)) break;
        blockEnd = next;
      }

      // Find the working day immediately before and after the block
      const dayBefore = new Date(current);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(blockEnd);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const beforeStr = dayBefore.toISOString().split('T')[0];
      const afterStr = dayAfter.toISOString().split('T')[0];

      // Both sides must be absent for the sandwich rule to apply
      if (
        dayBefore >= startDate &&
        dayAfter <= endDate &&
        isAbsent(beforeStr) &&
        isAbsent(afterStr)
      ) {
        // Count the non-working days in this block (only holidays, not weekends normally paid)
        // Per spec: holiday marked as "Absent" if absent before AND after
        let d = new Date(current);
        while (d <= blockEnd) {
          const dStr = d.toISOString().split('T')[0];
          if (holidayDates.has(dStr)) {
            sandwichDays++;
          }
          d.setDate(d.getDate() + 1);
        }
      }

      // Skip to end of this block to avoid re-processing
      day = blockEnd.getDate();
    }

    return sandwichDays;
  }

  // ==================== PAYSLIP QUERIES ====================

  /**
   * Get employee's own payslips
   * Interns don't have payslips - returns empty array with a flag
   */
  async getMyPayslips(employeeId: string, filters?: PayslipFilterDto) {
    // Check if employee is an intern
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        employeeType: true,
        sickLeaveBalance: true,
        casualLeaveBalance: true,
        earnedLeaveBalance: true,
      },
    });

    // Interns don't get payslips
    if (employee?.employeeType === 'INTERN') {
      return {
        isIntern: true,
        message: 'Interns are not eligible for salary slips',
        payslips: [],
      };
    }

    const where: any = { employeeId };

    if (filters?.year) {
      where.month = { startsWith: filters.year };
    }

    const payslips = await this.prisma.payslip.findMany({
      where,
      orderBy: { month: 'desc' },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    return {
      isIntern: false,
      payslips,
      leaveBalance: employee
        ? {
            sick: employee.sickLeaveBalance,
            casual: employee.casualLeaveBalance,
            earned: employee.earnedLeaveBalance,
            total:
              employee.sickLeaveBalance +
              employee.casualLeaveBalance +
              employee.earnedLeaveBalance,
          }
        : null,
    };
  }

  /**
   * Get all payslips for a specific month (HR view)
   */
  async getPayslipsByMonth(month: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { month },
      orderBy: { employee: { firstName: 'asc' } },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            role: { select: { name: true } },
            sickLeaveBalance: true,
            casualLeaveBalance: true,
            earnedLeaveBalance: true,
          },
        },
      },
    });

    // Calculate totals
    const totals = payslips.reduce(
      (acc, p) => ({
        totalBaseSalary: acc.totalBaseSalary + p.baseSalary,
        totalGrossPay: acc.totalGrossPay + p.grossPay,
        totalDeductions: acc.totalDeductions + p.deductions,
        totalNetPay: acc.totalNetPay + p.netPay,
        totalRewards: acc.totalRewards + p.rewards,
        totalReimbursements: acc.totalReimbursements + p.reimbursements,
      }),
      {
        totalBaseSalary: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalRewards: 0,
        totalReimbursements: 0,
      },
    );

    return {
      data: payslips,
      summary: {
        employeeCount: payslips.length,
        ...totals,
      },
    };
  }

  /**
   * Get a single payslip by ID - now includes leave balance
   */
  async getPayslipById(id: string, employeeId?: string) {
    const where: any = { id };

    // If employeeId is provided, ensure the payslip belongs to that employee
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const payslip = await this.prisma.payslip.findFirst({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            role: { select: { name: true } },
            bankAccountHolder: true,
            bankAccountNumber: true,
            bankIfsc: true,
            bankName: true,
            sickLeaveBalance: true,
            casualLeaveBalance: true,
            earnedLeaveBalance: true,
          },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    return {
      ...payslip,
      leaveBalance: {
        sick: payslip.employee.sickLeaveBalance,
        casual: payslip.employee.casualLeaveBalance,
        earned: payslip.employee.earnedLeaveBalance,
        total:
          payslip.employee.sickLeaveBalance +
          payslip.employee.casualLeaveBalance +
          payslip.employee.earnedLeaveBalance,
      },
    };
  }

  /**
   * Regenerate a specific payslip
   */
  async regeneratePayslip(id: string) {
    const existingPayslip = await this.prisma.payslip.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existingPayslip) {
      throw new NotFoundException('Payslip not found');
    }

    const [year, monthNum] = existingPayslip.month.split('-').map(Number);

    // Get working days with per-employee override support
    const workingDaysConfig = await this.getMonthlyWorkingDays(existingPayslip.month);
    let employeeWorkingDays = workingDaysConfig.workingDays;

    // Check for per-employee override
    if (Array.isArray(workingDaysConfig.overrides)) {
      for (const override of workingDaysConfig.overrides as any[]) {
        if (override.employeeId === existingPayslip.employeeId && override.workingDays != null) {
          employeeWorkingDays = override.workingDays;
          break;
        }
      }
    }

    const payslipData = await this.calculatePayslip(
      existingPayslip.employeeId,
      existingPayslip.employee.salary,
      monthNum,
      year,
      employeeWorkingDays,
    );

    const updatedPayslip = await this.prisma.payslip.update({
      where: { id },
      data: {
        ...payslipData,
        regeneratedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            role: { select: { name: true } },
          },
        },
      },
    });

    return updatedPayslip;
  }

  /**
   * Get payroll statistics for a month
   */
  async getPayrollStats(month: string) {
    const payslips = await this.prisma.payslip.findMany({
      where: { month },
    });

    if (payslips.length === 0) {
      return {
        month,
        employeeCount: 0,
        totalBaseSalary: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalRewards: 0,
        totalReimbursements: 0,
        averageNetPay: 0,
      };
    }

    const stats = payslips.reduce(
      (acc, p) => ({
        totalBaseSalary: acc.totalBaseSalary + p.baseSalary,
        totalGrossPay: acc.totalGrossPay + p.grossPay,
        totalDeductions: acc.totalDeductions + p.deductions,
        totalNetPay: acc.totalNetPay + p.netPay,
        totalRewards: acc.totalRewards + p.rewards,
        totalReimbursements: acc.totalReimbursements + p.reimbursements,
      }),
      {
        totalBaseSalary: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalRewards: 0,
        totalReimbursements: 0,
      },
    );

    return {
      month,
      employeeCount: payslips.length,
      ...stats,
      averageNetPay: stats.totalNetPay / payslips.length,
    };
  }
}
