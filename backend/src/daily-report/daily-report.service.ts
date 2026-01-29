import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateDailyReportDto,
  UpdateDailyReportDto,
  VerifyDailyReportDto,
  DailyReportFilterDto,
} from './dto/daily-report.dto';
import { Prisma } from '@prisma/client';
import { startOfDay, endOfDay, parseISO, format } from 'date-fns';

@Injectable()
export class DailyReportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get the daily reporting parameters for an employee's role
   */
  async getMyReportingParams(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.role) {
      throw new BadRequestException('Employee has no role assigned');
    }

    return {
      roleName: employee.role.name,
      parameters: employee.role.dailyReportingParams || [],
    };
  }

  /**
   * Submit a daily report
   */
  async create(employeeId: string, dto: CreateDailyReportDto) {
    const reportDate = startOfDay(parseISO(dto.reportDate));

    // Check if report already exists for this date
    const existing = await this.prisma.dailyReport.findUnique({
      where: {
        employeeId_reportDate: {
          employeeId,
          reportDate,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'A report already exists for this date. Please update the existing report.',
      );
    }

    // Get employee's role to validate report data
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true },
    });

    if (!employee?.role) {
      throw new BadRequestException('Employee has no role assigned');
    }

    return this.prisma.dailyReport.create({
      data: {
        employeeId,
        reportDate,
        reportData: dto.reportData as unknown as Prisma.InputJsonValue,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true, dailyReportingParams: true } },
          },
        },
      },
    });
  }

  /**
   * Update an existing daily report (only if not verified)
   */
  async update(id: string, employeeId: string, dto: UpdateDailyReportDto) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.employeeId !== employeeId) {
      throw new ForbiddenException('You can only update your own reports');
    }

    if (report.isVerified) {
      throw new BadRequestException('Cannot update a verified report');
    }

    return this.prisma.dailyReport.update({
      where: { id },
      data: {
        reportData: dto.reportData as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Get my daily reports
   */
  async getMyReports(employeeId: string, filters: DailyReportFilterDto) {
    const where: any = { employeeId };

    if (filters.startDate) {
      where.reportDate = {
        ...where.reportDate,
        gte: startOfDay(parseISO(filters.startDate)),
      };
    }

    if (filters.endDate) {
      where.reportDate = {
        ...where.reportDate,
        lte: endOfDay(parseISO(filters.endDate)),
      };
    }

    if (filters.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    const reports = await this.prisma.dailyReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true, dailyReportingParams: true } },
          },
        },
      },
    });

    return reports;
  }

  /**
   * Get today's report for an employee
   */
  async getTodayReport(employeeId: string) {
    const today = startOfDay(new Date());

    const report = await this.prisma.dailyReport.findUnique({
      where: {
        employeeId_reportDate: {
          employeeId,
          reportDate: today,
        },
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true, dailyReportingParams: true } },
          },
        },
      },
    });

    return report;
  }

  /**
   * Get team daily reports (for managers)
   */
  async getTeamReports(managerId: string, filters: DailyReportFilterDto) {
    // Get team members
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId },
      select: { id: true },
    });

    const teamMemberIds = teamMembers.map((m) => m.id);

    const where: any = {
      employeeId: { in: teamMemberIds },
    };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.startDate) {
      where.reportDate = {
        ...where.reportDate,
        gte: startOfDay(parseISO(filters.startDate)),
      };
    }

    if (filters.endDate) {
      where.reportDate = {
        ...where.reportDate,
        lte: endOfDay(parseISO(filters.endDate)),
      };
    }

    if (filters.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    return this.prisma.dailyReport.findMany({
      where,
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true, dailyReportingParams: true } },
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  /**
   * Get pending (unverified) reports for manager's team
   */
  async getPendingTeamReports(managerId: string) {
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId },
      select: { id: true },
    });

    const teamMemberIds = teamMembers.map((m) => m.id);

    return this.prisma.dailyReport.findMany({
      where: {
        employeeId: { in: teamMemberIds },
        isVerified: false,
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true, dailyReportingParams: true } },
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  /**
   * Verify a daily report (manager action)
   */
  async verify(id: string, verifiedBy: string, dto: VerifyDailyReportDto) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    // Verify that the manager is the employee's manager
    const manager = await this.prisma.employee.findUnique({
      where: { id: verifiedBy },
    });

    if (report.employee.managerId !== verifiedBy) {
      throw new ForbiddenException(
        'You can only verify reports from your team members',
      );
    }

    if (report.isVerified) {
      throw new BadRequestException('Report is already verified');
    }

    return this.prisma.dailyReport.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedBy,
        verifiedAt: new Date(),
        managerComment: dto.managerComment,
      },
    });
  }

  /**
   * Get report by ID
   */
  async getById(id: string) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true, dailyReportingParams: true } },
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    return report;
  }

  /**
   * Get report statistics for an employee
   */
  async getMyStats(employeeId: string, month?: string) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (month) {
      // month format: "2024-01"
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0, 23, 59, 59);
    } else {
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const [totalReports, verifiedReports, employee] = await Promise.all([
      this.prisma.dailyReport.count({
        where: {
          employeeId,
          reportDate: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.dailyReport.count({
        where: {
          employeeId,
          reportDate: { gte: startDate, lte: endDate },
          isVerified: true,
        },
      }),
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: { role: { select: { dailyReportingParams: true } } },
      }),
    ]);

    // Calculate working days in the period (rough estimate - Mon-Fri)
    let workingDays = 0;
    const current = new Date(startDate);
    while (current <= endDate && current <= now) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      totalReports,
      verifiedReports,
      pendingReports: totalReports - verifiedReports,
      workingDays,
      submissionRate: workingDays > 0 ? Math.round((totalReports / workingDays) * 100) : 0,
      month: month || format(now, 'yyyy-MM'),
    };
  }

  /**
   * Delete a daily report (only if not verified)
   */
  async delete(id: string, employeeId: string) {
    const report = await this.prisma.dailyReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Daily report not found');
    }

    if (report.employeeId !== employeeId) {
      throw new ForbiddenException('You can only delete your own reports');
    }

    if (report.isVerified) {
      throw new BadRequestException('Cannot delete a verified report');
    }

    return this.prisma.dailyReport.delete({
      where: { id },
    });
  }
}
