import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateDailyReportDto,
  UpdateDailyReportDto,
  VerifyDailyReportDto,
  DailyReportFilterDto,
} from './dto/daily-report.dto';
import {
  ReportPerformancePeriod,
  ReportPerformanceFilterDto,
  ParameterPerformance,
  TimeBucketData,
  EmployeeReportPerformance,
  TeamReportPerformance,
} from './dto/daily-report-performance.dto';
import { Prisma } from '@prisma/client';
import {
  startOfDay, endOfDay, parseISO, format,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
} from 'date-fns';

@Injectable()
export class DailyReportService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private async getWorkingDays(): Promise<number[]> {
    const settings = await this.prisma.companySettings.findFirst();
    return (settings?.workingDays as number[]) || [1, 2, 3, 4, 5];
  }

  /**
   * Get the daily reporting parameters for an employee's role
   */
  async getMyReportingParams(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true },
    });

    console.log('[DailyReport] getMyReportingParams - employeeId:', employeeId);
    console.log('[DailyReport] getMyReportingParams - role name:', employee?.role?.name);
    console.log('[DailyReport] getMyReportingParams - dailyReportingParams:', JSON.stringify(employee?.role?.dailyReportingParams));

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

    const report = await this.prisma.dailyReport.create({
      data: {
        employeeId,
        reportDate,
        reportData: dto.reportData as unknown as Prisma.InputJsonValue,
        generalNotes: dto.generalNotes,
        attachments: (dto.attachments || []) as unknown as Prisma.InputJsonValue,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            managerId: true,
            role: { select: { name: true, dailyReportingParams: true } },
          },
        },
      },
    });

    // Notify manager about the submission (fire-and-forget)
    if (report.employee.managerId) {
      this.prisma.employee.findUnique({
        where: { id: report.employee.managerId },
        include: { user: { select: { id: true } } },
      }).then(manager => {
        if (manager?.user) {
          this.notificationService.sendNotification({
            recipientId: manager.user.id,
            subject: `Daily Report Submitted`,
            message: `${report.employee.firstName} ${report.employee.lastName} has submitted their daily report for ${format(reportDate, 'MMMM d, yyyy')}.`,
            type: 'in-app',
          }).catch(err => console.error('DailyReport create notification failed:', err));
        }
      }).catch(err => console.error('DailyReport create manager lookup failed:', err));
    }

    return report;
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

    const updateData: any = {};
    if (dto.reportData !== undefined) {
      updateData.reportData = dto.reportData as unknown as Prisma.InputJsonValue;
    }
    if (dto.generalNotes !== undefined) {
      updateData.generalNotes = dto.generalNotes;
    }
    if (dto.attachments !== undefined) {
      updateData.attachments = dto.attachments as unknown as Prisma.InputJsonValue;
    }

    return this.prisma.dailyReport.update({
      where: { id },
      data: updateData,
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

    // Calculate working days in the period using configured working days
    const configuredWorkingDays = await this.getWorkingDays();
    let workingDays = 0;
    const current = new Date(startDate);
    while (current <= endDate && current <= now) {
      const dayOfWeek = current.getDay();
      if (configuredWorkingDays.includes(dayOfWeek)) {
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

  // ============================================================
  // PERFORMANCE ANALYTICS
  // ============================================================

  private getDateRangeForPeriod(
    period: ReportPerformancePeriod,
    customStart?: string,
    customEnd?: string,
  ): { start: Date; end: Date } {
    if (customStart && customEnd) {
      return { start: startOfDay(parseISO(customStart)), end: endOfDay(parseISO(customEnd)) };
    }
    const now = new Date();
    switch (period) {
      case ReportPerformancePeriod.WEEKLY:
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case ReportPerformancePeriod.MONTHLY:
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case ReportPerformancePeriod.QUARTERLY:
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case ReportPerformancePeriod.ANNUAL:
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }

  private async getWorkingDaysInRange(start: Date, end: Date): Promise<number> {
    const effectiveEnd = end > new Date() ? new Date() : end;
    if (effectiveEnd < start) return 0;
    const configuredWorkingDays = await this.getWorkingDays();
    const holidays = await this.prisma.officialHoliday.findMany({
      where: { date: { gte: start, lte: effectiveEnd } },
    });
    const holidayDates = new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')));
    const allDays = eachDayOfInterval({ start, end: effectiveEnd });
    return allDays.filter(d => configuredWorkingDays.includes(d.getDay()) && !holidayDates.has(format(d, 'yyyy-MM-dd'))).length;
  }

  private getTimeBuckets(
    period: ReportPerformancePeriod,
    start: Date,
    end: Date,
    configuredWorkingDays: number[] = [1, 2, 3, 4, 5],
  ): Array<{ label: string; start: Date; end: Date }> {
    const effectiveEnd = end > new Date() ? new Date() : end;
    if (effectiveEnd < start) return [];

    switch (period) {
      case ReportPerformancePeriod.WEEKLY: {
        // Each day is a bucket
        return eachDayOfInterval({ start, end: effectiveEnd })
          .filter(d => configuredWorkingDays.includes(d.getDay()))
          .map(d => ({
            label: format(d, 'EEE M/d'),
            start: startOfDay(d),
            end: endOfDay(d),
          }));
      }
      case ReportPerformancePeriod.MONTHLY: {
        // Each week is a bucket
        const weeks = eachWeekOfInterval({ start, end: effectiveEnd }, { weekStartsOn: 1 });
        return weeks.map((weekStart, i) => {
          const weekEnd = i < weeks.length - 1
            ? new Date(weeks[i + 1].getTime() - 1)
            : effectiveEnd;
          return {
            label: `Week ${i + 1}`,
            start: weekStart < start ? start : weekStart,
            end: weekEnd > effectiveEnd ? effectiveEnd : weekEnd,
          };
        });
      }
      case ReportPerformancePeriod.QUARTERLY:
      case ReportPerformancePeriod.ANNUAL: {
        // Each month is a bucket
        return eachMonthOfInterval({ start, end: effectiveEnd }).map(monthStart => {
          const monthEnd = endOfMonth(monthStart);
          return {
            label: format(monthStart, 'MMM yyyy'),
            start: monthStart < start ? start : monthStart,
            end: monthEnd > effectiveEnd ? effectiveEnd : monthEnd,
          };
        });
      }
      default:
        return [];
    }
  }

  private extractParamValue(data: any, key: string): number {
    if (!data || data[key] === undefined || data[key] === null) return 0;
    const val = data[key];
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val.value !== undefined) return Number(val.value) || 0;
    return Number(val) || 0;
  }

  async getEmployeeReportPerformance(
    employeeId: string,
    filters: ReportPerformanceFilterDto,
  ): Promise<EmployeeReportPerformance> {
    const period = filters.period || ReportPerformancePeriod.MONTHLY;
    const { start, end } = this.getDateRangeForPeriod(period, filters.startDate, filters.endDate);

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: { select: { name: true, dailyReportingParams: true } } },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.role) throw new BadRequestException('Employee has no role assigned');

    const reports = await this.prisma.dailyReport.findMany({
      where: {
        employeeId,
        reportDate: { gte: startOfDay(start), lte: endOfDay(end) },
      },
      orderBy: { reportDate: 'asc' },
    });

    // Only include measurable parameters (exclude text type which have no numeric target)
    const allParams = (employee.role.dailyReportingParams as any[]) || [];
    const params = allParams.filter(p => p.type !== 'text');
    const workingDays = await this.getWorkingDaysInRange(start, end);

    // Per-parameter aggregation
    const paramPerformances: ParameterPerformance[] = params.map(param => {
      let totalActual = 0;
      let daysReported = 0;
      for (const report of reports) {
        const val = this.extractParamValue(report.reportData, param.key);
        if (val > 0 || (report.reportData as any)?.[param.key] !== undefined) {
          totalActual += val;
          daysReported++;
        }
      }
      const totalTarget = (param.target || 0) * workingDays;
      return {
        paramKey: param.key,
        paramLabel: param.label,
        paramType: param.type || 'number',
        target: param.target || 0,
        totalTarget,
        totalActual: Math.round(totalActual * 10) / 10,
        achievementPct: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 1000) / 10 : 0,
        averageDaily: daysReported > 0 ? Math.round((totalActual / daysReported) * 10) / 10 : 0,
        daysReported,
      };
    });

    // Time series buckets
    const configuredWorkingDays = await this.getWorkingDays();
    const buckets = this.getTimeBuckets(period, start, end, configuredWorkingDays);
    const timeSeries: TimeBucketData[] = [];

    for (const bucket of buckets) {
      const bucketReports = reports.filter(r => {
        const d = new Date(r.reportDate);
        return d >= bucket.start && d <= bucket.end;
      });
      const bucketWorkingDays = await this.getWorkingDaysInRange(bucket.start, bucket.end);

      const bucketParams: Record<string, { actual: number; target: number; achievementPct: number }> = {};
      for (const param of params) {
        let actual = 0;
        for (const report of bucketReports) {
          actual += this.extractParamValue(report.reportData, param.key);
        }
        const target = (param.target || 0) * bucketWorkingDays;
        bucketParams[param.key] = {
          actual: Math.round(actual * 10) / 10,
          target,
          achievementPct: target > 0 ? Math.round((actual / target) * 1000) / 10 : 0,
        };
      }

      timeSeries.push({
        bucketLabel: bucket.label,
        bucketStart: bucket.start.toISOString(),
        bucketEnd: bucket.end.toISOString(),
        parameters: bucketParams,
        submissionCount: bucketReports.length,
        expectedSubmissions: bucketWorkingDays,
      });
    }

    // Overall achievement
    const overallAchievementPct = paramPerformances.length > 0
      ? Math.round(paramPerformances.reduce((s, p) => s + p.achievementPct, 0) / paramPerformances.length * 10) / 10
      : 0;

    // Best/worst
    const sorted = [...paramPerformances].sort((a, b) => b.achievementPct - a.achievementPct);
    const best = sorted[0] || null;
    const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null;

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      roleName: employee.role.name,
      parameters: paramPerformances,
      overallAchievementPct,
      submissionRate: workingDays > 0 ? Math.round((reports.length / workingDays) * 1000) / 10 : 0,
      totalReports: reports.length,
      totalWorkingDays: workingDays,
      timeSeries,
      bestParameter: best ? { key: best.paramKey, label: best.paramLabel, pct: best.achievementPct } : null,
      worstParameter: worst ? { key: worst.paramKey, label: worst.paramLabel, pct: worst.achievementPct } : null,
    };
  }

  async getTeamReportPerformance(
    managerId: string,
    filters: ReportPerformanceFilterDto,
  ): Promise<TeamReportPerformance> {
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId },
      select: { id: true },
    });

    const employees: EmployeeReportPerformance[] = [];
    for (const member of teamMembers) {
      try {
        const perf = await this.getEmployeeReportPerformance(member.id, filters);
        employees.push(perf);
      } catch (e) {
        // Skip employees with no role or errors
      }
    }

    return this.aggregateTeamPerformance(employees);
  }

  async getAllEmployeesReportPerformance(
    filters: ReportPerformanceFilterDto,
  ): Promise<TeamReportPerformance> {
    const allEmployees = await this.prisma.employee.findMany({
      where: {
        user: { isActive: true },
        role: { isActive: true },
      },
      select: { id: true },
    });

    const employees: EmployeeReportPerformance[] = [];
    for (const emp of allEmployees) {
      try {
        const perf = await this.getEmployeeReportPerformance(emp.id, filters);
        if (perf.parameters.length > 0) {
          employees.push(perf);
        }
      } catch (e) {
        // Skip employees with errors
      }
    }

    return this.aggregateTeamPerformance(employees);
  }

  private aggregateTeamPerformance(employees: EmployeeReportPerformance[]): TeamReportPerformance {
    const teamAverageAchievement = employees.length > 0
      ? Math.round(employees.reduce((s, e) => s + e.overallAchievementPct, 0) / employees.length * 10) / 10
      : 0;
    const teamAverageSubmissionRate = employees.length > 0
      ? Math.round(employees.reduce((s, e) => s + e.submissionRate, 0) / employees.length * 10) / 10
      : 0;

    // Aggregate parameter averages across all employees who share the same params
    const paramMap = new Map<string, { total: number; count: number; label: string; type: string; target: number; totalTarget: number; totalActual: number; daysReported: number }>();
    for (const emp of employees) {
      for (const p of emp.parameters) {
        const existing = paramMap.get(p.paramKey);
        if (existing) {
          existing.total += p.achievementPct;
          existing.count++;
          existing.totalTarget += p.totalTarget;
          existing.totalActual += p.totalActual;
          existing.daysReported += p.daysReported;
        } else {
          paramMap.set(p.paramKey, {
            total: p.achievementPct,
            count: 1,
            label: p.paramLabel,
            type: p.paramType,
            target: p.target,
            totalTarget: p.totalTarget,
            totalActual: p.totalActual,
            daysReported: p.daysReported,
          });
        }
      }
    }

    const parameterAverages: ParameterPerformance[] = Array.from(paramMap.entries()).map(([key, val]) => ({
      paramKey: key,
      paramLabel: val.label,
      paramType: val.type,
      target: val.target,
      totalTarget: val.totalTarget,
      totalActual: Math.round(val.totalActual * 10) / 10,
      achievementPct: Math.round(val.total / val.count * 10) / 10,
      averageDaily: val.daysReported > 0 ? Math.round((val.totalActual / val.daysReported) * 10) / 10 : 0,
      daysReported: val.daysReported,
    }));

    return {
      employees: employees.sort((a, b) => b.overallAchievementPct - a.overallAchievementPct),
      teamAverageAchievement,
      teamAverageSubmissionRate,
      parameterAverages,
    };
  }

  // ============================================================
  // CRON: Overdue report detection - runs at 6:30 PM on weekdays
  // ============================================================

  @Cron('30 18 * * *')
  async checkOverdueReports() {
    try {
      const today = startOfDay(new Date());
      const configuredWorkingDays = await this.getWorkingDays();
      if (!configuredWorkingDays.includes(today.getDay())) return;

      // Skip holidays
      const holiday = await this.prisma.officialHoliday.findFirst({
        where: { date: today },
      });
      if (holiday) return;

      const employees = await this.prisma.employee.findMany({
        where: {
          user: { isActive: true },
          role: { isActive: true },
        },
        include: {
          user: { select: { id: true } },
          role: { select: { dailyReportingParams: true } },
        },
      });

      for (const employee of employees) {
        const params = (employee.role?.dailyReportingParams as any[]) || [];
        if (params.length === 0) continue;

        const report = await this.prisma.dailyReport.findUnique({
          where: {
            employeeId_reportDate: {
              employeeId: employee.id,
              reportDate: today,
            },
          },
        });

        if (!report && employee.user) {
          this.notificationService.sendNotification({
            recipientId: employee.user.id,
            subject: 'Daily Report Overdue',
            message: `Your daily report for ${format(today, 'MMMM d, yyyy')} has not been submitted. Please submit it at your earliest convenience.`,
            type: 'in-app',
          }).catch(err => console.error(`DailyReport cron overdue notification failed for ${employee.id}:`, err));
        }
      }

      console.log('[DailyReport Cron] Checked overdue reports for', format(today, 'yyyy-MM-dd'));
    } catch (error) {
      console.error('[DailyReport Cron] Error checking overdue reports:', error);
    }
  }
}
