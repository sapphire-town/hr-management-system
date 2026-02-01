import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string, role: UserRole, employeeId?: string) {
    switch (role) {
      case UserRole.DIRECTOR:
        return this.getDirectorStats();
      case UserRole.HR_HEAD:
        return this.getHRStats();
      case UserRole.MANAGER:
        return this.getManagerStats(employeeId);
      case UserRole.EMPLOYEE:
        return this.getEmployeeStats(employeeId);
      case UserRole.INTERVIEWER:
        return this.getInterviewerStats(employeeId);
      default:
        return this.getEmployeeStats(employeeId);
    }
  }

  private async getDirectorStats() {
    const [
      totalEmployees,
      activeEmployees,
      departments,
      hiringRequests,
      recentResignations,
    ] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({
        where: { user: { isActive: true } },
      }),
      this.prisma.role.count({ where: { isActive: true } }),
      this.prisma.hiringRequest.count(),
      this.prisma.resignation.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const attendanceRate = await this.calculateAttendanceRate();

    return {
      totalEmployees,
      activeEmployees,
      departments,
      hiringRequests: hiringRequests || 0,
      resignations: recentResignations,
      attendanceRate,
    };
  }

  private async getHRStats() {
    const [
      pendingLeaves,
      pendingDocuments,
      pendingReimbursements,
      pendingAssets,
      activeResignations,
      newEmployeesThisMonth,
    ] = await Promise.all([
      this.prisma.leave.count({
        where: { status: 'PENDING_HR' },
      }),
      this.prisma.documentVerification.count({
        where: { status: { in: ['UPLOADED', 'UNDER_REVIEW'] } },
      }),
      this.prisma.reimbursement.count({
        where: { status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] } },
      }),
      this.prisma.assetRequest.count({
        where: { status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] } },
      }),
      this.prisma.resignation.count({
        where: { status: { in: ['SUBMITTED', 'MANAGER_APPROVED'] } },
      }),
      this.prisma.employee.count({
        where: {
          joinDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    return {
      pendingLeaves,
      pendingDocuments,
      pendingReimbursements,
      pendingAssets,
      activeResignations,
      newEmployeesThisMonth,
    };
  }

  private async getManagerStats(managerId?: string) {
    if (!managerId) {
      return {
        teamSize: 0,
        presentToday: 0,
        pendingLeaves: 0,
        pendingReports: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [teamSize, presentToday, pendingLeaves, pendingReports] = await Promise.all([
      this.prisma.employee.count({
        where: { managerId },
      }),
      this.prisma.attendance.count({
        where: {
          employee: { managerId },
          date: today,
          status: { in: ['PRESENT', 'HALF_DAY'] },
        },
      }),
      this.prisma.leave.count({
        where: {
          employee: { managerId },
          status: 'PENDING_MANAGER',
        },
      }),
      this.prisma.dailyReport.count({
        where: {
          employee: { managerId },
          isVerified: false,
          reportDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      teamSize,
      presentToday,
      pendingLeaves,
      pendingReports,
    };
  }

  private async getEmployeeStats(employeeId?: string) {
    if (!employeeId) {
      return {
        attendanceThisMonth: 0,
        totalWorkingDays: 22,
        pendingRequests: 0,
        leaveBalance: 0,
      };
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      attendanceThisMonth,
      employee,
      pendingLeaves,
      pendingReimbursements,
      pendingAssets,
    ] = await Promise.all([
      this.prisma.attendance.count({
        where: {
          employeeId,
          date: { gte: startOfMonth },
          status: { in: ['PRESENT', 'HALF_DAY', 'PAID_LEAVE'] },
        },
      }),
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          sickLeaveBalance: true,
          casualLeaveBalance: true,
          earnedLeaveBalance: true,
        },
      }),
      this.prisma.leave.count({
        where: { employeeId, status: { in: ['PENDING_MANAGER', 'PENDING_HR'] } },
      }),
      this.prisma.reimbursement.count({
        where: { employeeId, status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] } },
      }),
      this.prisma.assetRequest.count({
        where: { employeeId, status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] } },
      }),
    ]);

    const leaveBalance = employee
      ? employee.sickLeaveBalance + employee.casualLeaveBalance + employee.earnedLeaveBalance
      : 0;

    return {
      attendanceThisMonth,
      totalWorkingDays: 22,
      pendingRequests: pendingLeaves + pendingReimbursements + pendingAssets,
      leaveBalance,
    };
  }

  private async getInterviewerStats(employeeId?: string) {
    if (!employeeId) {
      return {
        scheduledInterviews: 0,
        completedThisMonth: 0,
        pendingEvaluations: 0,
        assignedDrives: 0,
      };
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [assignedDrives, pendingEvaluations] = await Promise.all([
      this.prisma.placementDriveInterviewer.count({
        where: {
          interviewerId: employeeId,
        },
      }),
      this.prisma.roundEvaluation.count({
        where: {
          evaluatorId: employeeId,
        },
      }),
    ]);

    return {
      scheduledInterviews: 0, // Would need interview scheduling model
      completedThisMonth: 0,
      pendingEvaluations,
      assignedDrives,
    };
  }

  private async calculateAttendanceRate(): Promise<number> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalEmployees = await this.prisma.employee.count();

    if (totalEmployees === 0) return 100;

    const presentCount = await this.prisma.attendance.count({
      where: {
        date: { gte: startOfMonth },
        status: { in: ['PRESENT', 'HALF_DAY'] },
      },
    });

    const workingDays = Math.ceil((Date.now() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000));
    const expectedAttendance = totalEmployees * Math.max(workingDays, 1);

    return Math.round((presentCount / expectedAttendance) * 100);
  }

  async getRecentActivities(userId: string, role: UserRole, employeeId?: string, limit = 10) {
    // Get recent notifications as activities
    const notifications = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications.map((n) => ({
      id: n.id,
      type: n.type.toLowerCase(),
      title: n.subject,
      description: n.message,
      timestamp: n.createdAt,
      read: n.isRead,
    }));
  }

  async getPendingApprovals(userId: string, role: UserRole, employeeId?: string) {
    const approvals = [];

    if (role === UserRole.HR_HEAD) {
      const [leaves, documents, reimbursements, assets] = await Promise.all([
        this.prisma.leave.count({ where: { status: 'PENDING_HR' } }),
        this.prisma.documentVerification.count({ where: { status: { in: ['UPLOADED', 'UNDER_REVIEW'] } } }),
        this.prisma.reimbursement.count({ where: { status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] } } }),
        this.prisma.assetRequest.count({ where: { status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] } } }),
      ]);

      approvals.push(
        { type: 'leave', title: 'Leave Requests', count: leaves },
        { type: 'document', title: 'Document Verification', count: documents },
        { type: 'reimbursement', title: 'Reimbursements', count: reimbursements },
        { type: 'asset', title: 'Asset Requests', count: assets },
      );
    } else if (role === UserRole.MANAGER && employeeId) {
      const [leaves, reports, reimbursements] = await Promise.all([
        this.prisma.leave.count({
          where: { employee: { managerId: employeeId }, status: 'PENDING_MANAGER' },
        }),
        this.prisma.dailyReport.count({
          where: { employee: { managerId: employeeId }, isVerified: false },
        }),
        this.prisma.reimbursement.count({
          where: { employee: { managerId: employeeId }, status: 'SUBMITTED' },
        }),
      ]);

      approvals.push(
        { type: 'leave', title: 'Leave Requests', count: leaves },
        { type: 'report', title: 'Daily Reports', count: reports },
        { type: 'reimbursement', title: 'Reimbursements', count: reimbursements },
      );
    }

    return approvals;
  }

  async getChartData(type: string, role: UserRole, employeeId?: string) {
    switch (type) {
      case 'attendance':
        return this.getAttendanceChartData(role, employeeId);
      case 'leave':
        return this.getLeaveChartData(role, employeeId);
      case 'department':
        return this.getDepartmentChartData();
      case 'recruitment':
        return this.getRecruitmentChartData();
      case 'resignation':
        return this.getResignationTrendData();
      case 'assets':
        return this.getAssetAllocationData();
      default:
        return [];
    }
  }

  async getComprehensiveReports() {
    const [
      employeeMetrics,
      attendanceStats,
      leaveStats,
      recruitmentStats,
      assetStats,
      resignationStats,
      departmentPerformance,
    ] = await Promise.all([
      this.getEmployeeMetrics(),
      this.getAttendanceStatistics(),
      this.getLeaveStatistics(),
      this.getRecruitmentStatistics(),
      this.getAssetStatistics(),
      this.getResignationStatistics(),
      this.getDepartmentPerformance(),
    ]);

    return {
      employeeMetrics,
      attendanceStats,
      leaveStats,
      recruitmentStats,
      assetStats,
      resignationStats,
      departmentPerformance,
    };
  }

  private async getEmployeeMetrics() {
    const [total, active, onLeave, newHires30Days, onboarding] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { user: { isActive: true } } }),
      this.prisma.leave.count({
        where: {
          status: 'APPROVED',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
      this.prisma.employee.count({
        where: {
          joinDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.employee.count({
        where: {
          joinDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return { total, active, onLeave, newHires30Days, onboarding };
  }

  private async getAttendanceStatistics() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalEmployees = await this.prisma.employee.count();

    const [present, absent, halfDay, onLeave] = await Promise.all([
      this.prisma.attendance.count({
        where: { date: { gte: startOfMonth }, status: 'PRESENT' },
      }),
      this.prisma.attendance.count({
        where: { date: { gte: startOfMonth }, status: 'ABSENT' },
      }),
      this.prisma.attendance.count({
        where: { date: { gte: startOfMonth }, status: 'HALF_DAY' },
      }),
      this.prisma.leave.count({
        where: {
          status: 'APPROVED',
          startDate: { lte: new Date() },
          endDate: { gte: startOfMonth },
        },
      }),
    ]);

    const workingDays = Math.ceil((Date.now() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000));
    const expectedAttendance = totalEmployees * Math.max(workingDays, 1);
    const attendanceRate = expectedAttendance > 0 ? Math.round((present / expectedAttendance) * 100) : 100;

    return {
      present,
      absent,
      halfDay,
      onLeave,
      attendanceRate,
      totalEmployees,
      workingDays,
    };
  }

  private async getLeaveStatistics() {
    const [pending, approved, rejected, onLeaveToday] = await Promise.all([
      this.prisma.leave.count({
        where: { status: { in: ['PENDING_MANAGER', 'PENDING_HR'] } },
      }),
      this.prisma.leave.count({
        where: {
          status: 'APPROVED',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.leave.count({
        where: {
          status: 'REJECTED',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.leave.count({
        where: {
          status: 'APPROVED',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
    ]);

    return { pending, approved, rejected, onLeaveToday };
  }

  private async getRecruitmentStatistics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeDrives,
      totalCandidates,
      selectedCandidates,
      pendingInterviews,
      hiringRequests,
    ] = await Promise.all([
      this.prisma.placementDrive.count({
        where: {
          driveDate: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.student.count(),
      this.prisma.roundEvaluation.count({
        where: { status: 'PASS', roundNumber: 2 },
      }),
      this.prisma.roundEvaluation.count({
        where: { status: { in: ['ON_HOLD'] } },
      }),
      this.prisma.hiringRequest.count({
        where: { status: { in: ['PENDING', 'APPROVED'] } },
      }),
    ]);

    const selectionRate = totalCandidates > 0
      ? Math.round((selectedCandidates / totalCandidates) * 100)
      : 0;

    return {
      activeDrives,
      totalCandidates,
      selectedCandidates,
      pendingInterviews,
      hiringRequests,
      selectionRate,
    };
  }

  private async getAssetStatistics() {
    const [total, assigned, pending, rejected, acknowledged] = await Promise.all([
      this.prisma.assetRequest.count(),
      this.prisma.assetRequest.count({
        where: { status: { in: ['ALLOCATED', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.assetRequest.count({
        where: { status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] } },
      }),
      this.prisma.assetRequest.count({
        where: { status: 'REJECTED' },
      }),
      this.prisma.assetRequest.count({
        where: { status: 'ACKNOWLEDGED' },
      }),
    ]);

    const available = total - assigned - pending - rejected;

    return { total, assigned, available: Math.max(0, available), pending, maintenance: 0 };
  }

  private async getResignationStatistics() {
    const [
      pending,
      approved,
      last30Days,
      last90Days,
      served,
    ] = await Promise.all([
      this.prisma.resignation.count({
        where: { status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] } },
      }),
      this.prisma.resignation.count({
        where: { status: 'APPROVED' },
      }),
      this.prisma.resignation.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.resignation.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.resignation.count({
        where: {
          status: 'EXIT_COMPLETE',
        },
      }),
    ]);

    return { pending, approved, last30Days, last90Days, served };
  }

  private async getDepartmentPerformance() {
    const roles = await this.prisma.role.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { employees: true } },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      employeeCount: role._count.employees,
      description: null,
    }));
  }

  private async getAttendanceChartData(role: UserRole, employeeId?: string) {
    const weeks = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7 + now.getDay()));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const presentCount = await this.prisma.attendance.count({
        where: {
          date: { gte: weekStart, lte: weekEnd },
          status: { in: ['PRESENT', 'HALF_DAY'] },
          ...(employeeId && role === UserRole.MANAGER
            ? { employee: { managerId: employeeId } }
            : {}),
        },
      });

      weeks.push({
        week: `Week ${4 - i}`,
        attendance: presentCount,
        target: 100,
      });
    }

    return weeks;
  }

  private async getLeaveChartData(role: UserRole, employeeId?: string) {
    const leaveTypes = ['SICK', 'CASUAL', 'EARNED'];
    const result = [];

    for (const type of leaveTypes) {
      const [pending, approved, rejected] = await Promise.all([
        this.prisma.leave.count({
          where: { leaveType: type as any, status: { in: ['PENDING_MANAGER', 'PENDING_HR'] } },
        }),
        this.prisma.leave.count({
          where: { leaveType: type as any, status: 'APPROVED' },
        }),
        this.prisma.leave.count({
          where: { leaveType: type as any, status: 'REJECTED' },
        }),
      ]);

      result.push({
        type: type.charAt(0) + type.slice(1).toLowerCase(),
        pending,
        approved,
        rejected,
      });
    }

    return result;
  }

  private async getDepartmentChartData() {
    const roles = await this.prisma.role.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { employees: true } },
      },
    });

    return roles.map((role) => ({
      name: role.name,
      employees: role._count.employees,
      performance: Math.floor(Math.random() * 15) + 85, // Placeholder
    }));
  }

  private async getRecruitmentChartData() {
    // Get last 6 months of placement drives
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [drives, candidates, selected] = await Promise.all([
        this.prisma.placementDrive.count({
          where: {
            driveDate: { gte: monthStart, lte: monthEnd },
          },
        }),
        this.prisma.student.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        this.prisma.roundEvaluation.count({
          where: {
            status: 'PASS',
            roundNumber: 2,
            evaluatedAt: { gte: monthStart, lte: monthEnd },
          },
        }),
      ]);

      months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        drives,
        candidates,
        selected,
      });
    }

    return months;
  }

  private async getResignationTrendData() {
    // Get last 6 months of resignations
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [submitted, completed] = await Promise.all([
        this.prisma.resignation.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        this.prisma.resignation.count({
          where: {
            status: 'EXIT_COMPLETE',
            updatedAt: { gte: monthStart, lte: monthEnd },
          },
        }),
      ]);

      months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        submitted,
        completed,
      });
    }

    return months;
  }

  private async getAssetAllocationData() {
    const assetTypes = await this.prisma.assetRequest.groupBy({
      by: ['assetType'],
      _count: { id: true },
    });

    const result = [];
    for (const item of assetTypes) {
      const assigned = await this.prisma.assetRequest.count({
        where: {
          assetType: item.assetType,
          status: { in: ['ALLOCATED', 'ACKNOWLEDGED'] },
        },
      });
      const pending = await this.prisma.assetRequest.count({
        where: {
          assetType: item.assetType,
          status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR'] },
        },
      });
      const available = item._count.id - assigned - pending;

      result.push({
        type: item.assetType,
        total: item._count.id,
        assigned,
        available: Math.max(0, available),
      });
    }

    return result;
  }
}
