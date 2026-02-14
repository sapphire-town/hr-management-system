import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { HolidayService } from './holiday.service';
import { AttendanceService } from '../attendance/attendance.service';
import { ApplyLeaveDto, LeaveActionDto, LeaveFilterDto } from './dto/leave.dto';
import { UserRole, LeaveStatus, LeaveType, AttendanceStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private holidayService: HolidayService,
    private attendanceService: AttendanceService,
  ) {}

  async apply(employeeId: string, dto: ApplyLeaveDto) {
    const isUnpaid = dto.leaveType === LeaveType.UNPAID;

    // First check if employee is an intern - interns can only apply for unpaid leave
    const employeeCheck = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { employeeType: true },
    });

    if (employeeCheck?.employeeType === 'INTERN' && !isUnpaid) {
      throw new ForbiddenException(
        'Interns are not eligible for paid leave. Please apply for unpaid leave.',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate working days (excluding weekends and holidays)
    const workingDays = await this.calculateWorkingDays(startDate, endDate);

    if (workingDays <= 0) {
      throw new BadRequestException('Leave period contains no working days');
    }

    // Check for overlapping leaves
    const overlapping = await this.prisma.leave.findFirst({
      where: {
        employeeId,
        status: { in: [LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_HR, LeaveStatus.APPROVED] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('You already have a leave request for overlapping dates');
    }

    // Check leave balance (skip for unpaid leave)
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { email: true } },
        manager: {
          include: { user: { select: { email: true } } },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!isUnpaid) {
      const balanceField = `${dto.leaveType.toLowerCase()}LeaveBalance` as
        | 'sickLeaveBalance'
        | 'casualLeaveBalance'
        | 'earnedLeaveBalance';

      if (employee[balanceField] < workingDays) {
        throw new BadRequestException(
          `Insufficient ${dto.leaveType.toLowerCase()} leave balance. Available: ${employee[balanceField]}, Requested: ${workingDays}`,
        );
      }
    }

    const leave = await this.prisma.leave.create({
      data: {
        employee: { connect: { id: employeeId } },
        leaveType: dto.leaveType,
        startDate,
        endDate,
        numberOfDays: workingDays,
        reason: dto.reason,
        status: LeaveStatus.PENDING_MANAGER,
        isPaid: !isUnpaid,
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

    // Send notification to manager
    if (employee.manager?.user?.email) {
      try {
        await this.notificationService.sendLeaveStatusEmail(
          employee.manager.user.email,
          leave.id,
          `New Leave Request from ${employee.firstName} ${employee.lastName}`,
          `${dto.leaveType} leave for ${workingDays} days (${startDate.toDateString()} - ${endDate.toDateString()})`,
        );
      } catch (error) {
        console.error('Failed to send notification to manager:', error);
      }
    }

    return leave;
  }

  private async calculateWorkingDays(startDate: Date, endDate: Date): Promise<number> {
    let workingDays = 0;
    const current = new Date(startDate);

    // Fetch configured working days from CompanySettings
    const settings = await this.prisma.companySettings.findFirst();
    const configuredWorkingDays: number[] = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5];

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Skip days not in configured working days
      if (configuredWorkingDays.includes(dayOfWeek)) {
        // Check if it's a holiday
        const isHoliday = await this.holidayService.isHoliday(current);
        if (!isHoliday) {
          workingDays++;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  async findAll(filters: LeaveFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.leaveType) {
      where.leaveType = filters.leaveType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.startDate) {
      where.startDate = { gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.endDate = { lte: new Date(filters.endDate) };
    }

    const [leaves, total] = await Promise.all([
      this.prisma.leave.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              user: { select: { email: true } },
              manager: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.leave.count({ where }),
    ]);

    return {
      data: leaves,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyLeaves(employeeId: string, filters: LeaveFilterDto) {
    return this.findAll({ ...filters, employeeId });
  }

  async getPendingForManager(managerId: string) {
    return this.prisma.leave.findMany({
      where: {
        employee: { managerId },
        status: LeaveStatus.PENDING_MANAGER,
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
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPendingForHR() {
    return this.prisma.leave.findMany({
      where: { status: LeaveStatus.PENDING_HR },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(
    leaveId: string,
    approverRole: UserRole,
    approverId: string,
    dto: LeaveActionDto,
  ) {
    const leave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          include: { user: { select: { email: true } } },
        },
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    const employeeEmail = leave.employee.user?.email;

    if (approverRole === UserRole.MANAGER) {
      if (leave.status !== LeaveStatus.PENDING_MANAGER) {
        throw new BadRequestException('Leave is not pending manager approval');
      }

      const updatedLeave = await this.prisma.leave.update({
        where: { id: leaveId },
        data: {
          status: LeaveStatus.PENDING_HR,
          managerApproved: true,
        },
      });

      // Send notification to employee
      if (employeeEmail) {
        try {
          await this.notificationService.sendLeaveStatusEmail(
            employeeEmail,
            leaveId,
            'Approved by Manager - Pending HR Approval',
            dto.comments || 'Your leave has been approved by your manager and is now pending HR approval.',
          );
        } catch (error) {
          console.error('Failed to send notification:', error);
        }
      }

      // Notify HR
      await this.notifyHR(leave, 'Manager Approved - Pending HR Review');

      return updatedLeave;
    }

    if (approverRole === UserRole.HR_HEAD || approverRole === UserRole.DIRECTOR) {
      if (leave.status !== LeaveStatus.PENDING_HR) {
        throw new BadRequestException('Leave is not pending HR approval');
      }

      // Deduct leave balance (skip for unpaid leave)
      if (leave.leaveType !== LeaveType.UNPAID) {
        const days = leave.numberOfDays;

        const balanceField = `${leave.leaveType.toLowerCase()}LeaveBalance` as
          | 'sickLeaveBalance'
          | 'casualLeaveBalance'
          | 'earnedLeaveBalance';

        await this.prisma.employee.update({
          where: { id: leave.employeeId },
          data: {
            [balanceField]: { decrement: days },
          },
        });
      }

      const updatedLeave = await this.prisma.leave.update({
        where: { id: leaveId },
        data: {
          status: LeaveStatus.APPROVED,
          hrApproved: true,
        },
      });

      // Create attendance records for each working day of the leave
      await this.createLeaveAttendanceRecords(leave);

      // Send notification to employee
      if (employeeEmail) {
        try {
          await this.notificationService.sendLeaveStatusEmail(
            employeeEmail,
            leaveId,
            'Approved',
            dto.comments || 'Your leave request has been fully approved.',
          );
        } catch (error) {
          console.error('Failed to send notification:', error);
        }
      }

      return updatedLeave;
    }

    throw new ForbiddenException('Not authorized to approve leaves');
  }

  /**
   * Create leave attendance records for each working day of an approved leave.
   * Uses PAID_LEAVE for paid leave types, UNPAID_LEAVE for unpaid leave.
   * Skips weekends, holidays, and days that already have attendance records.
   */
  private async createLeaveAttendanceRecords(leave: {
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    leaveType: LeaveType;
    reason: string;
  }) {
    try {
      const start = new Date(leave.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(leave.endDate);
      end.setHours(0, 0, 0, 0);

      // Fetch configured working days from CompanySettings
      const settings = await this.prisma.companySettings.findFirst();
      const configuredWorkingDays: number[] = (settings?.workingDays as number[]) || [1, 2, 3, 4, 5];

      const attendanceStatus = leave.leaveType === LeaveType.UNPAID
        ? AttendanceStatus.UNPAID_LEAVE
        : AttendanceStatus.PAID_LEAVE;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        // Skip days not in configured working days
        if (!configuredWorkingDays.includes(dayOfWeek)) continue;

        // Skip holidays
        const isHoliday = await this.holidayService.isHoliday(new Date(d));
        if (isHoliday) continue;

        const dateForRecord = new Date(d);
        dateForRecord.setHours(0, 0, 0, 0);

        // Check if attendance already exists for this date
        const existing = await this.prisma.attendance.findFirst({
          where: {
            employeeId: leave.employeeId,
            date: dateForRecord,
          },
        });

        if (!existing) {
          await this.prisma.attendance.create({
            data: {
              employeeId: leave.employeeId,
              date: dateForRecord,
              status: attendanceStatus,
              markedBy: 'SYSTEM',
              notes: `${leave.leaveType} Leave (Auto-recorded from approved leave request)`,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error creating leave attendance records:', error);
      // Don't throw - leave approval should still succeed even if attendance record creation fails
    }
  }

  async reject(
    leaveId: string,
    rejecterRole: UserRole,
    dto: LeaveActionDto,
  ) {
    const leave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          include: { user: { select: { email: true } } },
        },
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    const updatedLeave = await this.prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.REJECTED,
        rejectionReason: dto.comments,
      },
    });

    // Send rejection notification to employee
    const employeeEmail = leave.employee.user?.email;
    if (employeeEmail) {
      try {
        await this.notificationService.sendLeaveStatusEmail(
          employeeEmail,
          leaveId,
          'Rejected',
          dto.comments || 'Your leave request has been rejected.',
        );
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    return updatedLeave;
  }

  async getBalance(employeeId: string) {
    const [employee, settings] = await Promise.all([
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          sickLeaveBalance: true,
          casualLeaveBalance: true,
          earnedLeaveBalance: true,
          employeeType: true,
        },
      }),
      this.prisma.companySettings.findFirst(),
    ]);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if employee is an intern - they don't get paid leave
    const isIntern = employee.employeeType === 'INTERN';

    // Get leave policies from settings or use defaults
    const leavePolicies = (settings?.leavePolicies as Record<string, number>) || {};
    const sickTotal = leavePolicies.sickLeavePerYear ?? 12;
    const casualTotal = leavePolicies.casualLeavePerYear ?? 12;
    const earnedTotal = leavePolicies.earnedLeavePerYear ?? 15;

    return {
      isIntern,
      sick: employee.sickLeaveBalance,
      casual: employee.casualLeaveBalance,
      earned: employee.earnedLeaveBalance,
      total:
        employee.sickLeaveBalance +
        employee.casualLeaveBalance +
        employee.earnedLeaveBalance,
      allocation: isIntern
        ? { sick: 0, casual: 0, earned: 0, total: 0 }
        : {
            sick: sickTotal,
            casual: casualTotal,
            earned: earnedTotal,
            total: sickTotal + casualTotal + earnedTotal,
          },
    };
  }

  async cancel(leaveId: string, employeeId: string) {
    const leave = await this.prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.employeeId !== employeeId) {
      throw new ForbiddenException('Not authorized to cancel this leave');
    }

    if (leave.status === LeaveStatus.APPROVED) {
      throw new BadRequestException('Cannot cancel approved leave');
    }

    return this.prisma.leave.delete({
      where: { id: leaveId },
    });
  }

  private async notifyHR(leave: any, subject: string) {
    try {
      const hrHead = await this.prisma.user.findFirst({
        where: { role: UserRole.HR_HEAD, isActive: true },
      });

      if (hrHead?.email) {
        await this.notificationService.sendLeaveStatusEmail(
          hrHead.email,
          leave.id,
          subject,
          `Leave request from ${leave.employee.firstName} ${leave.employee.lastName} requires HR approval.`,
        );
      }
    } catch (error) {
      console.error('Failed to notify HR:', error);
    }
  }

  // ==================== ANALYTICS & REPORTS ====================

  async getLeaveAnalytics(year?: number, month?: number) {
    const currentYear = year || new Date().getFullYear();

    let startDate: Date;
    let endDate: Date;

    if (month) {
      startDate = new Date(currentYear, month - 1, 1);
      endDate = new Date(currentYear, month, 0, 23, 59, 59);
    } else {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    }

    // Get all leaves in the period
    const leaves = await this.prisma.leave.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
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

    // Calculate statistics
    const totalRequests = leaves.length;
    const approved = leaves.filter(l => l.status === LeaveStatus.APPROVED).length;
    const rejected = leaves.filter(l => l.status === LeaveStatus.REJECTED).length;
    const pending = leaves.filter(l =>
      l.status === LeaveStatus.PENDING_MANAGER || l.status === LeaveStatus.PENDING_HR
    ).length;

    // By leave type
    const byType = {
      sick: leaves.filter(l => l.leaveType === LeaveType.SICK),
      casual: leaves.filter(l => l.leaveType === LeaveType.CASUAL),
      earned: leaves.filter(l => l.leaveType === LeaveType.EARNED),
      unpaid: leaves.filter(l => l.leaveType === LeaveType.UNPAID),
    };

    // Total days by type
    const totalDaysByType = {
      sick: byType.sick.reduce((sum, l) => sum + l.numberOfDays, 0),
      casual: byType.casual.reduce((sum, l) => sum + l.numberOfDays, 0),
      earned: byType.earned.reduce((sum, l) => sum + l.numberOfDays, 0),
      unpaid: byType.unpaid.reduce((sum, l) => sum + l.numberOfDays, 0),
    };

    // Approval rate
    const approvalRate = totalRequests > 0
      ? Math.round((approved / totalRequests) * 100)
      : 0;

    // Average days per leave
    const avgDaysPerLeave = totalRequests > 0
      ? Math.round((leaves.reduce((sum, l) => sum + l.numberOfDays, 0) / totalRequests) * 10) / 10
      : 0;

    return {
      period: {
        year: currentYear,
        month: month || null,
        startDate,
        endDate,
      },
      summary: {
        totalRequests,
        approved,
        rejected,
        pending,
        approvalRate,
        avgDaysPerLeave,
      },
      byType: {
        sick: { count: byType.sick.length, totalDays: totalDaysByType.sick },
        casual: { count: byType.casual.length, totalDays: totalDaysByType.casual },
        earned: { count: byType.earned.length, totalDays: totalDaysByType.earned },
        unpaid: { count: byType.unpaid.length, totalDays: totalDaysByType.unpaid },
      },
      totalDaysOff: totalDaysByType.sick + totalDaysByType.casual + totalDaysByType.earned + totalDaysByType.unpaid,
    };
  }

  async getLeaveReport(year: number, month?: number) {
    let startDate: Date;
    let endDate: Date;

    if (month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    // Get all employees with their leaves
    const employees = await this.prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        sickLeaveBalance: true,
        casualLeaveBalance: true,
        earnedLeaveBalance: true,
        role: { select: { name: true } },
        leaves: {
          where: {
            status: LeaveStatus.APPROVED,
            startDate: { gte: startDate },
            endDate: { lte: endDate },
          },
        },
      },
    });

    const report = employees.map(emp => {
      const sickDays = emp.leaves
        .filter(l => l.leaveType === LeaveType.SICK)
        .reduce((sum, l) => sum + l.numberOfDays, 0);

      const casualDays = emp.leaves
        .filter(l => l.leaveType === LeaveType.CASUAL)
        .reduce((sum, l) => sum + l.numberOfDays, 0);

      const earnedDays = emp.leaves
        .filter(l => l.leaveType === LeaveType.EARNED)
        .reduce((sum, l) => sum + l.numberOfDays, 0);

      const unpaidDays = emp.leaves
        .filter(l => l.leaveType === LeaveType.UNPAID)
        .reduce((sum, l) => sum + l.numberOfDays, 0);

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        role: emp.role.name,
        leavesTaken: {
          sick: sickDays,
          casual: casualDays,
          earned: earnedDays,
          unpaid: unpaidDays,
          total: sickDays + casualDays + earnedDays + unpaidDays,
        },
        balanceRemaining: {
          sick: emp.sickLeaveBalance,
          casual: emp.casualLeaveBalance,
          earned: emp.earnedLeaveBalance,
          total: emp.sickLeaveBalance + emp.casualLeaveBalance + emp.earnedLeaveBalance,
        },
        leaveCount: emp.leaves.length,
      };
    });

    // Sort by total leaves taken (descending)
    report.sort((a, b) => b.leavesTaken.total - a.leavesTaken.total);

    return {
      period: { year, month: month || null },
      generatedAt: new Date(),
      employeeCount: report.length,
      report,
    };
  }

  async getMonthlyTrend(year: number) {
    const trends = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const leaves = await this.prisma.leave.findMany({
        where: {
          startDate: { gte: startDate },
          endDate: { lte: endDate },
          status: LeaveStatus.APPROVED,
        },
      });

      trends.push({
        month,
        monthName: startDate.toLocaleString('default', { month: 'long' }),
        totalRequests: leaves.length,
        totalDays: leaves.reduce((sum, l) => sum + l.numberOfDays, 0),
        byType: {
          sick: leaves.filter(l => l.leaveType === LeaveType.SICK).length,
          casual: leaves.filter(l => l.leaveType === LeaveType.CASUAL).length,
          earned: leaves.filter(l => l.leaveType === LeaveType.EARNED).length,
        },
      });
    }

    return {
      year,
      trends,
      totalRequests: trends.reduce((sum, t) => sum + t.totalRequests, 0),
      totalDays: trends.reduce((sum, t) => sum + t.totalDays, 0),
    };
  }

  async getTeamLeaveCalendar(managerId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get team members
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId },
      select: { id: true, firstName: true, lastName: true },
    });

    const teamIds = teamMembers.map(t => t.id);

    // Get approved leaves for team
    const leaves = await this.prisma.leave.findMany({
      where: {
        employeeId: { in: teamIds },
        status: LeaveStatus.APPROVED,
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { startDate: { lte: startDate }, endDate: { gte: endDate } },
        ],
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Get holidays in the month
    const holidays = await this.holidayService.getHolidaysInRange(startDate, endDate);

    return {
      year,
      month,
      monthName: startDate.toLocaleString('default', { month: 'long' }),
      teamMembers: teamMembers.length,
      leaves: leaves.map(l => ({
        id: l.id,
        employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        numberOfDays: l.numberOfDays,
      })),
      holidays: holidays.map(h => ({
        date: h.date,
        name: h.name,
      })),
    };
  }

  async getDepartmentLeaveStats() {
    const roles = await this.prisma.role.findMany({
      include: {
        employees: {
          select: {
            id: true,
            sickLeaveBalance: true,
            casualLeaveBalance: true,
            earnedLeaveBalance: true,
            leaves: {
              where: { status: LeaveStatus.APPROVED },
              select: { numberOfDays: true, leaveType: true },
            },
          },
        },
      },
    });

    return roles.map(role => {
      const totalEmployees = role.employees.length;
      const allLeaves = role.employees.flatMap(e => e.leaves);

      const totalLeavesTaken = allLeaves.reduce((sum, l) => sum + l.numberOfDays, 0);
      const avgLeaveBalance = totalEmployees > 0
        ? role.employees.reduce((sum, e) =>
            sum + e.sickLeaveBalance + e.casualLeaveBalance + e.earnedLeaveBalance, 0
          ) / totalEmployees
        : 0;

      return {
        roleName: role.name,
        totalEmployees,
        totalLeavesTaken: Math.round(totalLeavesTaken * 10) / 10,
        avgLeaveBalance: Math.round(avgLeaveBalance * 10) / 10,
        leavesByType: {
          sick: allLeaves.filter(l => l.leaveType === LeaveType.SICK).length,
          casual: allLeaves.filter(l => l.leaveType === LeaveType.CASUAL).length,
          earned: allLeaves.filter(l => l.leaveType === LeaveType.EARNED).length,
          unpaid: allLeaves.filter(l => l.leaveType === LeaveType.UNPAID).length,
        },
      };
    });
  }
}
