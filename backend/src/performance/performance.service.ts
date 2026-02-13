import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  PerformanceFilterDto,
  PerformancePeriod,
  EmployeePerformanceDto,
  TeamPerformanceDto,
  DepartmentPerformanceDto,
  CompanyPerformanceDto,
  PerformanceChartDataDto,
  PerformanceTrendDto,
} from './dto/performance.dto';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isWeekend,
  eachDayOfInterval,
} from 'date-fns';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(period: PerformancePeriod, startDate?: string, endDate?: string) {
    const now = new Date();

    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }

    switch (period) {
      case PerformancePeriod.WEEKLY:
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case PerformancePeriod.MONTHLY:
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case PerformancePeriod.QUARTERLY:
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case PerformancePeriod.YEARLY:
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }

  private getWorkingDays(startDate: Date, endDate: Date): number {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.filter(day => !isWeekend(day)).length;
  }

  private calculateAttendanceScore(present: number, halfDays: number, workingDays: number): number {
    if (workingDays === 0) return 100;
    const effectivePresent = present + (halfDays * 0.5);
    return Math.min(100, Math.round((effectivePresent / workingDays) * 100));
  }

  private calculateLeaveScore(leaveDays: number, workingDays: number): number {
    if (workingDays === 0) return 100;
    // Lower leave usage = higher score
    const leaveRate = leaveDays / workingDays;
    if (leaveRate <= 0.05) return 100; // 5% or less
    if (leaveRate <= 0.1) return 90; // 10% or less
    if (leaveRate <= 0.15) return 80; // 15% or less
    if (leaveRate <= 0.2) return 70; // 20% or less
    return Math.max(50, 100 - Math.round(leaveRate * 200));
  }

  private calculateOverallScore(
    attendanceScore: number,
    leaveScore: number,
    taskCompletionScore: number = 85, // Default if no task data
  ): number {
    // Weighted average: Attendance 40%, Leave Management 30%, Task Completion 30%
    return Math.round(
      attendanceScore * 0.4 +
      leaveScore * 0.3 +
      taskCompletionScore * 0.3
    );
  }

  private determineTrend(currentScore: number, previousScore: number): 'up' | 'down' | 'stable' {
    const diff = currentScore - previousScore;
    if (diff > 2) return 'up';
    if (diff < -2) return 'down';
    return 'stable';
  }

  async getEmployeePerformance(
    employeeId: string,
    filters: PerformanceFilterDto,
  ): Promise<EmployeePerformanceDto> {
    const { start, end } = this.getDateRange(
      filters.period || PerformancePeriod.MONTHLY,
      filters.startDate,
      filters.endDate,
    );

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { email: true, role: true } },
        role: true,
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get attendance data
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: start, lte: end },
      },
    });

    // Get leave data
    const leaveRecords = await this.prisma.leave.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    // Get holidays in range
    const holidays = await this.prisma.officialHoliday.findMany({
      where: {
        date: { gte: start, lte: end },
      },
    });

    const workingDays = this.getWorkingDays(start, end) - holidays.length;

    const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const halfDays = attendanceRecords.filter(a => a.status === 'HALF_DAY').length;
    const absentDays = attendanceRecords.filter(a =>
      a.status === 'ABSENT' || a.status === 'ABSENT_DOUBLE_DEDUCTION'
    ).length;
    const leaveDays = attendanceRecords.filter(a => a.status === 'PAID_LEAVE').length;

    // Get ticket data for task completion score
    const tickets = await this.prisma.ticket.findMany({
      where: {
        assignedTo: employeeId,
        createdAt: { gte: start, lte: end },
      },
    });

    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const totalTickets = tickets.length;
    const taskCompletionScore = totalTickets > 0
      ? Math.round((resolvedTickets / totalTickets) * 100)
      : 85; // Default score if no tickets

    const attendanceScore = this.calculateAttendanceScore(presentDays, halfDays, workingDays);
    const leaveScore = this.calculateLeaveScore(leaveDays, workingDays);
    const overallScore = this.calculateOverallScore(attendanceScore, leaveScore, taskCompletionScore);

    // Get previous period score for trend
    const previousStart = subMonths(start, 1);
    const previousEnd = subMonths(end, 1);
    const previousAttendance = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: previousStart, lte: previousEnd },
      },
    });

    const prevWorkingDays = this.getWorkingDays(previousStart, previousEnd);
    const prevPresent = previousAttendance.filter(a => a.status === 'PRESENT').length;
    const prevHalfDays = previousAttendance.filter(a => a.status === 'HALF_DAY').length;
    const prevAttendanceScore = this.calculateAttendanceScore(prevPresent, prevHalfDays, prevWorkingDays);
    const previousScore = this.calculateOverallScore(prevAttendanceScore, 80, 85);

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.role?.name || 'Unassigned',
      role: employee.user?.role || 'EMPLOYEE',
      overallScore,
      attendanceScore,
      punctualityScore: attendanceScore, // Can be refined with check-in time data
      leaveScore,
      taskCompletionScore,
      totalWorkingDays: workingDays,
      daysPresent: presentDays,
      daysAbsent: absentDays,
      halfDays,
      leaveDays,
      trend: this.determineTrend(overallScore, previousScore),
      previousScore,
    };
  }

  async getTeamPerformance(managerId: string, filters: PerformanceFilterDto): Promise<TeamPerformanceDto> {
    const manager = await this.prisma.employee.findUnique({
      where: { id: managerId },
      include: { user: true },
    });

    if (!manager) {
      throw new Error('Manager not found');
    }

    // Get team members (employees reporting to this manager)
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId: managerId },
      include: { user: true },
    });

    const teamPerformances: EmployeePerformanceDto[] = [];

    for (const member of teamMembers) {
      const performance = await this.getEmployeePerformance(member.id, filters);
      teamPerformances.push(performance);
    }

    const averageScore = teamPerformances.length > 0
      ? Math.round(teamPerformances.reduce((sum, p) => sum + p.overallScore, 0) / teamPerformances.length)
      : 0;

    const attendanceRate = teamPerformances.length > 0
      ? Math.round(teamPerformances.reduce((sum, p) => sum + p.attendanceScore, 0) / teamPerformances.length)
      : 0;

    // Sort by score
    const sorted = [...teamPerformances].sort((a, b) => b.overallScore - a.overallScore);
    const topPerformers = sorted.slice(0, 3);
    const needsImprovement = sorted.filter(p => p.overallScore < 70).slice(0, 3);

    // Calculate trend
    const previousScores = teamPerformances.map(p => p.previousScore);
    const currentScores = teamPerformances.map(p => p.overallScore);
    const avgPrevious = previousScores.length > 0
      ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length
      : 0;
    const avgCurrent = currentScores.length > 0
      ? currentScores.reduce((a, b) => a + b, 0) / currentScores.length
      : 0;

    return {
      teamId: managerId,
      managerId,
      managerName: `${manager.firstName} ${manager.lastName}`,
      teamSize: teamMembers.length,
      averageScore,
      topPerformers,
      needsImprovement,
      attendanceRate,
      trend: this.determineTrend(avgCurrent, avgPrevious),
    };
  }

  async getDepartmentPerformance(filters: PerformanceFilterDto): Promise<DepartmentPerformanceDto[]> {
    // Using roles instead of departments since this system is role-based
    const roles = await this.prisma.role.findMany({
      where: { isActive: true },
      include: {
        employees: {
          include: { user: true },
        },
      },
    });

    const departmentPerformances: DepartmentPerformanceDto[] = [];

    for (const role of roles) {
      if (role.employees.length === 0) continue;

      const employeePerformances: EmployeePerformanceDto[] = [];

      for (const employee of role.employees) {
        try {
          const performance = await this.getEmployeePerformance(employee.id, filters);
          employeePerformances.push(performance);
        } catch (e) {
          // Skip employees with errors
        }
      }

      if (employeePerformances.length === 0) continue;

      const avgScore = Math.round(
        employeePerformances.reduce((sum, p) => sum + p.overallScore, 0) / employeePerformances.length
      );

      const avgAttendance = Math.round(
        employeePerformances.reduce((sum, p) => sum + p.attendanceScore, 0) / employeePerformances.length
      );

      const topPerformer = employeePerformances.sort((a, b) => b.overallScore - a.overallScore)[0];

      const avgPrevious = employeePerformances.reduce((sum, p) => sum + p.previousScore, 0) / employeePerformances.length;

      departmentPerformances.push({
        department: role.name,
        employeeCount: role.employees.length,
        averageScore: avgScore,
        attendanceRate: avgAttendance,
        topPerformer: {
          name: topPerformer.employeeName,
          score: topPerformer.overallScore,
        },
        trend: this.determineTrend(avgScore, avgPrevious),
      });
    }

    return departmentPerformances.sort((a, b) => b.averageScore - a.averageScore);
  }

  async getCompanyPerformance(filters: PerformanceFilterDto): Promise<CompanyPerformanceDto> {
    const employees = await this.prisma.employee.findMany({
      include: { user: true, role: true },
    });

    const employeePerformances: EmployeePerformanceDto[] = [];

    for (const employee of employees) {
      try {
        const performance = await this.getEmployeePerformance(employee.id, filters);
        employeePerformances.push(performance);
      } catch (e) {
        // Skip employees with errors
      }
    }

    const totalEmployees = employees.length;
    const averagePerformanceScore = employeePerformances.length > 0
      ? Math.round(employeePerformances.reduce((sum, p) => sum + p.overallScore, 0) / employeePerformances.length)
      : 0;

    const overallAttendanceRate = employeePerformances.length > 0
      ? Math.round(employeePerformances.reduce((sum, p) => sum + p.attendanceScore, 0) / employeePerformances.length)
      : 0;

    const departmentPerformance = await this.getDepartmentPerformance(filters);

    // Performance distribution
    const distribution = {
      excellent: employeePerformances.filter(p => p.overallScore >= 90).length,
      good: employeePerformances.filter(p => p.overallScore >= 75 && p.overallScore < 90).length,
      average: employeePerformances.filter(p => p.overallScore >= 60 && p.overallScore < 75).length,
      needsImprovement: employeePerformances.filter(p => p.overallScore < 60).length,
    };

    // Top performers
    const topPerformers = [...employeePerformances]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5);

    // Calculate trends (last 6 months)
    const trends = await this.getPerformanceTrends(6);

    return {
      totalEmployees,
      averagePerformanceScore,
      overallAttendanceRate,
      departmentPerformance,
      trends,
      topPerformers,
      performanceDistribution: distribution,
    };
  }

  async getPerformanceTrends(months: number = 6): Promise<PerformanceTrendDto[]> {
    const trends: PerformanceTrendDto[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const employees = await this.prisma.employee.findMany();
      const workingDays = this.getWorkingDays(monthStart, monthEnd);

      let totalScore = 0;
      let totalAttendanceRate = 0;
      let validEmployees = 0;

      for (const employee of employees) {
        const attendance = await this.prisma.attendance.findMany({
          where: {
            employeeId: employee.id,
            date: { gte: monthStart, lte: monthEnd },
          },
        });

        if (attendance.length > 0) {
          const present = attendance.filter(a => a.status === 'PRESENT').length;
          const halfDays = attendance.filter(a => a.status === 'HALF_DAY').length;
          const attendanceScore = this.calculateAttendanceScore(present, halfDays, workingDays);
          const score = this.calculateOverallScore(attendanceScore, 80, 85);

          totalScore += score;
          totalAttendanceRate += attendanceScore;
          validEmployees++;
        }
      }

      trends.push({
        date: format(monthStart, 'MMM yyyy'),
        score: validEmployees > 0 ? Math.round(totalScore / validEmployees) : 0,
        attendanceRate: validEmployees > 0 ? Math.round(totalAttendanceRate / validEmployees) : 0,
        employeeCount: employees.length,
      });
    }

    return trends;
  }

  async getPerformanceChartData(
    type: 'department' | 'trend' | 'distribution',
    filters: PerformanceFilterDto,
  ): Promise<PerformanceChartDataDto> {
    switch (type) {
      case 'department': {
        const deptPerformance = await this.getDepartmentPerformance(filters);
        return {
          labels: deptPerformance.map(d => d.department),
          datasets: [
            {
              label: 'Performance Score',
              data: deptPerformance.map(d => d.averageScore),
              backgroundColor: '#7c3aed',
              borderColor: '#7c3aed',
            },
            {
              label: 'Attendance Rate',
              data: deptPerformance.map(d => d.attendanceRate),
              backgroundColor: '#22c55e',
              borderColor: '#22c55e',
            },
          ],
        };
      }

      case 'trend': {
        const trends = await this.getPerformanceTrends(6);
        return {
          labels: trends.map(t => t.date),
          datasets: [
            {
              label: 'Performance Score',
              data: trends.map(t => t.score),
              backgroundColor: 'rgba(124, 58, 237, 0.2)',
              borderColor: '#7c3aed',
            },
            {
              label: 'Attendance Rate',
              data: trends.map(t => t.attendanceRate),
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              borderColor: '#22c55e',
            },
          ],
        };
      }

      case 'distribution': {
        const company = await this.getCompanyPerformance(filters);
        return {
          labels: ['Excellent (90+)', 'Good (75-89)', 'Average (60-74)', 'Needs Improvement (<60)'],
          datasets: [
            {
              label: 'Employees',
              data: [
                company.performanceDistribution.excellent,
                company.performanceDistribution.good,
                company.performanceDistribution.average,
                company.performanceDistribution.needsImprovement,
              ],
              backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
            },
          ],
        };
      }

      default:
        return { labels: [], datasets: [] };
    }
  }

  async getEmployeePerformanceHistory(
    employeeId: string,
    months: number = 6,
  ): Promise<PerformanceTrendDto[]> {
    const trends: PerformanceTrendDto[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const attendance = await this.prisma.attendance.findMany({
        where: {
          employeeId,
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      const workingDays = this.getWorkingDays(monthStart, monthEnd);
      const present = attendance.filter(a => a.status === 'PRESENT').length;
      const halfDays = attendance.filter(a => a.status === 'HALF_DAY').length;
      const leaves = attendance.filter(a => a.status === 'PAID_LEAVE').length;

      const attendanceScore = this.calculateAttendanceScore(present, halfDays, workingDays);
      const leaveScore = this.calculateLeaveScore(leaves, workingDays);
      const score = this.calculateOverallScore(attendanceScore, leaveScore, 85);

      trends.push({
        date: format(monthStart, 'MMM yyyy'),
        score,
        attendanceRate: attendanceScore,
        employeeCount: 1,
      });
    }

    return trends;
  }

  async getAllEmployeesPerformance(filters: PerformanceFilterDto): Promise<EmployeePerformanceDto[]> {
    const employees = await this.prisma.employee.findMany({
      include: { user: true, role: true },
    });

    const performances: EmployeePerformanceDto[] = [];

    for (const employee of employees) {
      try {
        const performance = await this.getEmployeePerformance(employee.id, filters);
        performances.push(performance);
      } catch (e) {
        // Skip employees with errors
      }
    }

    return performances.sort((a, b) => b.overallScore - a.overallScore);
  }

  // ==================== Team Performance Dashboard ====================

  async getTeamPerformanceDashboard(managerId: string, filters: PerformanceFilterDto) {
    const period = filters.period || PerformancePeriod.MONTHLY;
    const { start, end } = this.getDateRange(period, filters.startDate, filters.endDate);

    // Get manager info
    const manager = await this.prisma.employee.findUnique({
      where: { id: managerId },
      include: { role: true },
    });
    if (!manager) throw new Error('Manager not found');

    // Get current team members
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId },
      include: {
        user: true,
        role: true,
        resignation: true,
      },
    });

    // Calculate individual performance for each team member
    const memberPerformances: EmployeePerformanceDto[] = [];
    for (const member of teamMembers) {
      try {
        const perf = await this.getEmployeePerformance(member.id, filters);
        memberPerformances.push(perf);
      } catch (e) {
        // Skip on error
      }
    }

    // Aggregate metrics
    const teamSize = teamMembers.length;
    const avgScore = memberPerformances.length > 0
      ? Math.round(memberPerformances.reduce((s, p) => s + p.overallScore, 0) / memberPerformances.length)
      : 0;
    const avgAttendance = memberPerformances.length > 0
      ? Math.round(memberPerformances.reduce((s, p) => s + p.attendanceScore, 0) / memberPerformances.length)
      : 0;
    const avgLeave = memberPerformances.length > 0
      ? Math.round(memberPerformances.reduce((s, p) => s + p.leaveScore, 0) / memberPerformances.length)
      : 0;
    const avgTask = memberPerformances.length > 0
      ? Math.round(memberPerformances.reduce((s, p) => s + p.taskCompletionScore, 0) / memberPerformances.length)
      : 0;

    // Previous period comparison
    const avgPrevious = memberPerformances.length > 0
      ? Math.round(memberPerformances.reduce((s, p) => s + p.previousScore, 0) / memberPerformances.length)
      : 0;

    // Calculate attrition/iteration rate for the period
    const attritionRate = await this.calculateTeamAttritionRate(managerId, start, end);

    // Performance distribution
    const distribution = {
      excellent: memberPerformances.filter(p => p.overallScore >= 90).length,
      good: memberPerformances.filter(p => p.overallScore >= 75 && p.overallScore < 90).length,
      average: memberPerformances.filter(p => p.overallScore >= 60 && p.overallScore < 75).length,
      needsImprovement: memberPerformances.filter(p => p.overallScore < 60).length,
    };

    // Sort and rank
    const sorted = [...memberPerformances].sort((a, b) => b.overallScore - a.overallScore);

    return {
      managerId,
      managerName: `${manager.firstName} ${manager.lastName}`,
      managerRole: manager.role?.name || '',
      period: period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      teamSize,
      averageScore: avgScore,
      previousAverageScore: avgPrevious,
      trend: this.determineTrend(avgScore, avgPrevious),
      averageAttendance: avgAttendance,
      averageLeaveScore: avgLeave,
      averageTaskCompletion: avgTask,
      attritionRate,
      performanceDistribution: distribution,
      topPerformers: sorted.slice(0, 3),
      needsImprovement: sorted.filter(p => p.overallScore < 70).slice(0, 3),
      members: sorted,
    };
  }

  async getAllTeamsPerformance(filters: PerformanceFilterDto) {
    // Get all managers (employees who have subordinates)
    const managers = await this.prisma.employee.findMany({
      where: {
        subordinates: { some: {} },
      },
      include: {
        role: true,
        _count: { select: { subordinates: true } },
      },
    });

    const teams = [];
    for (const mgr of managers) {
      try {
        const dashboard = await this.getTeamPerformanceDashboard(mgr.id, filters);
        teams.push({
          managerId: mgr.id,
          managerName: `${mgr.firstName} ${mgr.lastName}`,
          managerRole: mgr.role?.name || '',
          teamSize: dashboard.teamSize,
          averageScore: dashboard.averageScore,
          previousAverageScore: dashboard.previousAverageScore,
          trend: dashboard.trend,
          averageAttendance: dashboard.averageAttendance,
          attritionRate: dashboard.attritionRate,
          performanceDistribution: dashboard.performanceDistribution,
        });
      } catch (e) {
        // Skip on error
      }
    }

    return teams.sort((a, b) => b.averageScore - a.averageScore);
  }

  private async calculateTeamAttritionRate(
    managerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ rate: number; left: number; startCount: number }> {
    // Count employees at the start of the period who were on this team
    // We approximate by counting current team + anyone who resigned during the period
    const currentTeam = await this.prisma.employee.count({
      where: { managerId },
    });

    // Count resignations from this manager's team during the period
    const resignations = await this.prisma.resignation.findMany({
      where: {
        employee: { managerId },
        status: { in: ['APPROVED', 'EXIT_COMPLETE'] as any },
        lastWorkingDay: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const left = resignations.length;
    const startCount = currentTeam + left; // Approximate team size at period start
    const rate = startCount > 0 ? Math.round((left / startCount) * 100 * 10) / 10 : 0;

    return { rate, left, startCount };
  }
}
