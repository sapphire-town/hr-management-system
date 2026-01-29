import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GeneratePayslipsDto, PayslipFilterDto } from './dto/payroll.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate payslips for all active employees for a given month
   */
  async generatePayslips(dto: GeneratePayslipsDto) {
    const { month } = dto;
    const [year, monthNum] = month.split('-').map(Number);

    // Get all active employees
    const employees = await this.prisma.employee.findMany({
      where: {
        user: { isActive: true },
      },
      include: {
        user: { select: { email: true } },
        role: { select: { name: true } },
      },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found');
    }

    // Calculate working days for the month
    const workingDays = await this.calculateWorkingDays(monthNum, year);

    const results = [];

    for (const employee of employees) {
      const payslipData = await this.calculatePayslip(
        employee.id,
        employee.salary,
        monthNum,
        year,
        workingDays,
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
   * Calculate working days in a month (excluding weekends and holidays)
   */
  private async calculateWorkingDays(month: number, year: number): Promise<number> {
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
   * Calculate holiday sandwich deductions
   * (Leave taken adjacent to weekends/holidays)
   */
  private async calculateHolidaySandwich(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<number> {
    // For simplicity, we'll return 0 for now
    // This can be enhanced with complex logic to detect sandwich patterns
    return 0;
  }

  /**
   * Get employee's own payslips
   */
  async getMyPayslips(employeeId: string, filters?: PayslipFilterDto) {
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

    return payslips;
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
   * Get a single payslip by ID
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
          },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    return payslip;
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
    const workingDays = await this.calculateWorkingDays(monthNum, year);

    const payslipData = await this.calculatePayslip(
      existingPayslip.employeeId,
      existingPayslip.employee.salary,
      monthNum,
      year,
      workingDays,
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
