import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { HolidayService } from './holiday.service';
import { ApplyLeaveDto, LeaveActionDto, LeaveFilterDto } from './dto/leave.dto';
import { UserRole, LeaveStatus, LeaveType } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private holidayService: HolidayService,
  ) {}

  async apply(employeeId: string, dto: ApplyLeaveDto) {
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

    // Check leave balance
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

    const balanceField = `${dto.leaveType.toLowerCase()}LeaveBalance` as
      | 'sickLeaveBalance'
      | 'casualLeaveBalance'
      | 'earnedLeaveBalance';

    if (employee[balanceField] < workingDays) {
      throw new BadRequestException(
        `Insufficient ${dto.leaveType.toLowerCase()} leave balance. Available: ${employee[balanceField]}, Requested: ${workingDays}`,
      );
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

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
    const limit = parseInt(filters.limit || '10', 10);
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

      // Deduct leave balance
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

      const updatedLeave = await this.prisma.leave.update({
        where: { id: leaveId },
        data: {
          status: LeaveStatus.APPROVED,
          hrApproved: true,
        },
      });

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
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        sickLeaveBalance: true,
        casualLeaveBalance: true,
        earnedLeaveBalance: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return {
      sick: employee.sickLeaveBalance,
      casual: employee.casualLeaveBalance,
      earned: employee.earnedLeaveBalance,
      total:
        employee.sickLeaveBalance +
        employee.casualLeaveBalance +
        employee.earnedLeaveBalance,
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
    };

    // Total days by type
    const totalDaysByType = {
      sick: byType.sick.reduce((sum, l) => sum + l.numberOfDays, 0),
      casual: byType.casual.reduce((sum, l) => sum + l.numberOfDays, 0),
      earned: byType.earned.reduce((sum, l) => sum + l.numberOfDays, 0),
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
      },
      totalDaysOff: totalDaysByType.sick + totalDaysByType.casual + totalDaysByType.earned,
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

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        role: emp.role.name,
        leavesTaken: {
          sick: sickDays,
          casual: casualDays,
          earned: earnedDays,
          total: sickDays + casualDays + earnedDays,
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
        },
      };
    });
  }
}
