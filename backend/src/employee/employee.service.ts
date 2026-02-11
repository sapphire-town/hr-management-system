import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeFilterDto,
  PromoteEmployeeDto,
  AssignManagerDto,
  AssignTeamMembersDto,
  UpdateMyProfileDto,
  ChangePasswordDto,
  BulkEmployeeRecord,
  BulkImportResult,
} from './dto/employee.dto';
import { UserRole, EmployeeType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(dto: CreateEmployeeDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Generate random password
    const password = this.generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and employee in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: dto.role,
        },
      });

      // Default leave balances - Interns get NO paid leave
      const isIntern = dto.employeeType === 'INTERN';
      const defaultLeaveBalances = isIntern
        ? {
            sickLeaveBalance: 0,     // Interns don't get paid leave
            casualLeaveBalance: 0,   // Interns don't get paid leave
            earnedLeaveBalance: 0,   // Interns don't get paid leave
          }
        : {
            sickLeaveBalance: 12,    // 12 sick leave days per year
            casualLeaveBalance: 12,  // 12 casual leave days per year
            earnedLeaveBalance: 15,  // 15 earned leave days per year
          };

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roleId: dto.roleId,
          salary: dto.salary,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          phone: dto.phone,
          address: dto.address,
          employeeType: dto.employeeType,
          internType: dto.internType,
          contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
          internshipDuration: dto.internshipDuration,
          managerId: dto.managerId,
          joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
          // Initialize leave balances for new employee
          ...defaultLeaveBalances,
        },
        include: {
          user: { select: { id: true, email: true, role: true } },
          role: { select: { id: true, name: true } },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return { employee, temporaryPassword: password };
    });

    // Send welcome email with credentials
    try {
      await this.notificationService.sendWelcomeEmail(
        dto.email,
        password,
        dto.firstName,
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the employee creation if email fails
    }

    // Notify HR to release onboarding documents (offer letter, contract, etc.)
    try {
      await this.notificationService.notifyHRNewEmployeeOnboarding({
        id: result.employee.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        roleName: result.employee.role?.name || 'Unknown',
        joinDate: result.employee.joinDate,
      });
    } catch (error) {
      console.error('Failed to notify HR about new employee:', error);
      // Don't fail the employee creation if notification fails
    }

    return result;
  }

  async findAll(filters: EmployeeFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.roleId) {
      where.roleId = filters.roleId;
    }

    if (filters.managerId) {
      where.managerId = filters.managerId;
    }

    if (filters.employeeType) {
      where.employeeType = filters.employeeType;
    }

    // Filter by active status
    if (filters.status && filters.status !== 'all') {
      where.user = {
        ...where.user,
        isActive: filters.status === 'active',
      };
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, email: true, role: true, isActive: true } },
          role: { select: { id: true, name: true } },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true, lastLogin: true } },
        role: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  /**
   * Get comprehensive employee details including attendance, reports, documents, etc.
   * For Director and HR Head only
   */
  async findOneComprehensive(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true } },
        role: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
        subordinates: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
            user: { select: { isActive: true } },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get attendance for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendance = await this.prisma.attendance.findMany({
      where: {
        employeeId: id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      take: 30,
    });

    // Get daily reports for last 30 days
    const dailyReports = await this.prisma.dailyReport.findMany({
      where: {
        employeeId: id,
        reportDate: { gte: thirtyDaysAgo },
      },
      orderBy: { reportDate: 'desc' },
      take: 30,
      select: {
        id: true,
        reportDate: true,
        reportData: true,
        isVerified: true,
        verifiedAt: true,
        managerComment: true,
        createdAt: true,
      },
    });

    // Get documents
    const documents = await this.prisma.document.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Get document verifications
    const documentVerifications = await this.prisma.documentVerification.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Get rewards
    const rewards = await this.prisma.reward.findMany({
      where: { employeeId: id },
      orderBy: { awardDate: 'desc' },
      take: 10,
    });

    // Get leaves for current year
    const currentYear = new Date().getFullYear();
    const leaves = await this.prisma.leave.findMany({
      where: {
        employeeId: id,
        startDate: {
          gte: new Date(`${currentYear}-01-01`),
        },
      },
      orderBy: { startDate: 'desc' },
    });

    // Get director's list entries
    const directorsListEntries = await this.prisma.directorList.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        nominator: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Calculate attendance summary
    const attendanceSummary = {
      present: attendance.filter(a => a.status === 'PRESENT').length,
      absent: attendance.filter(a => a.status === 'ABSENT' || a.status === 'ABSENT_DOUBLE_DEDUCTION').length,
      halfDay: attendance.filter(a => a.status === 'HALF_DAY').length,
      paidLeave: attendance.filter(a => a.status === 'PAID_LEAVE').length,
      total: attendance.length,
    };

    // Calculate leave summary
    const leaveSummary = {
      approved: leaves.filter(l => l.status === 'APPROVED').length,
      pending: leaves.filter(l => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HR').length,
      rejected: leaves.filter(l => l.status === 'REJECTED').length,
      totalDays: leaves.filter(l => l.status === 'APPROVED').reduce((sum, l) => sum + l.numberOfDays, 0),
    };

    return {
      ...employee,
      // Leave balances are already in employee model
      leaveBalances: {
        sick: employee.sickLeaveBalance,
        casual: employee.casualLeaveBalance,
        earned: employee.earnedLeaveBalance,
      },
      // Bank details
      bankDetails: {
        accountHolder: employee.bankAccountHolder,
        accountNumber: employee.bankAccountNumber,
        ifsc: employee.bankIfsc,
        bankName: employee.bankName,
        branch: employee.bankBranch,
      },
      // Emergency contact
      emergencyContact: {
        name: employee.emergencyContactName,
        relation: employee.emergencyContactRelation,
        phone: employee.emergencyContactPhone,
        email: employee.emergencyContactEmail,
      },
      // Recent data
      recentAttendance: attendance,
      attendanceSummary,
      recentDailyReports: dailyReports,
      documents,
      documentVerifications,
      rewards,
      leaves,
      leaveSummary,
      directorsListEntries,
      // Recognition stats
      recognitionStats: {
        directorsListCount: employee.directorsListCount,
        totalRewardsAmount: employee.totalRewardsAmount,
        rewardsCount: rewards.length,
      },
    };
  }

  async findByUserId(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, role: true } },
        role: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return employee;
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.employee.update({
      where: { userId },
      data: {
        phone: dto.phone,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactRelation: dto.emergencyContactRelation,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactEmail: dto.emergencyContactEmail,
        bankAccountHolder: dto.bankAccountHolder,
        bankAccountNumber: dto.bankAccountNumber,
        bankIfsc: dto.bankIfsc,
        bankName: dto.bankName,
        bankBranch: dto.bankBranch,
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
        role: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
        role: { select: { id: true, name: true } },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Soft delete by deactivating user
    await this.prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: false },
    });

    return { message: 'Employee deactivated successfully' };
  }

  async getTeam(managerId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { managerId },
      include: {
        user: { select: { email: true, isActive: true } },
        role: { select: { name: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    return employees;
  }

  async getTeamAttendanceToday(managerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const team = await this.prisma.employee.findMany({
      where: { managerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        attendance: {
          where: { date: today },
          select: { status: true },
          take: 1,
        },
      },
    });

    return team.map((member) => ({
      id: member.id,
      name: `${member.firstName} ${member.lastName}`,
      status: member.attendance[0]?.status || 'NOT_MARKED',
    }));
  }

  async promote(id: string, dto: PromoteEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Update both user role and employee role in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update user's role
      await tx.user.update({
        where: { id: employee.userId },
        data: { role: dto.newUserRole },
      });

      // Update employee's role and salary if provided
      const updatedEmployee = await tx.employee.update({
        where: { id },
        data: {
          roleId: dto.newRoleId,
          ...(dto.newSalary && { salary: dto.newSalary }),
        },
        include: {
          user: { select: { id: true, email: true, role: true } },
          role: { select: { id: true, name: true } },
        },
      });

      return updatedEmployee;
    });

    return result;
  }

  async assignManager(id: string, dto: AssignManagerDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify manager exists
    const manager = await this.prisma.employee.findUnique({
      where: { id: dto.managerId },
      include: { user: true },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    return this.prisma.employee.update({
      where: { id },
      data: { managerId: dto.managerId },
      include: {
        user: { select: { id: true, email: true, role: true } },
        role: { select: { id: true, name: true } },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async assignTeamMembers(managerId: string, dto: AssignTeamMembersDto) {
    // Verify manager exists
    const manager = await this.prisma.employee.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    // Update all specified employees to have this manager
    await this.prisma.employee.updateMany({
      where: { id: { in: dto.employeeIds } },
      data: { managerId },
    });

    // Return updated team
    return this.getTeam(managerId);
  }

  async getManagers() {
    const managers = await this.prisma.employee.findMany({
      where: {
        user: {
          role: { in: ['MANAGER', 'HR_HEAD', 'DIRECTOR'] },
          isActive: true,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { role: true } },
        role: { select: { name: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    return managers;
  }

  async resetPassword(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const newPassword = this.generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: employee.userId },
      data: { password: hashedPassword },
    });

    // Send password reset email
    try {
      await this.notificationService.sendPasswordResetEmail(
        employee.user.email,
        newPassword,
        employee.firstName,
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return {
      temporaryPassword: newPassword,
      email: employee.user.email,
    };
  }

  async reactivate(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    await this.prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: true },
    });

    return { message: 'Employee reactivated successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Initialize/reset leave balances for all employees based on company settings
   */
  async initializeAllLeaveBalances() {
    // Get leave policies from settings
    const settings = await this.prisma.companySettings.findFirst();
    const leavePolicies = (settings?.leavePolicies as Record<string, number>) || {};

    const sickLeave = leavePolicies.sickLeavePerYear ?? 12;
    const casualLeave = leavePolicies.casualLeavePerYear ?? 12;
    const earnedLeave = leavePolicies.earnedLeavePerYear ?? 15;

    // Update all employees with the correct leave balances
    const result = await this.prisma.employee.updateMany({
      data: {
        sickLeaveBalance: sickLeave,
        casualLeaveBalance: casualLeave,
        earnedLeaveBalance: earnedLeave,
      },
    });

    return {
      message: `Updated leave balances for ${result.count} employees`,
      leaveBalances: {
        sick: sickLeave,
        casual: casualLeave,
        earned: earnedLeave,
      },
    };
  }

  /**
   * Helper to extract plain text value from Excel cell
   * Handles hyperlinks, rich text, formulas, and other complex cell types
   */
  private extractCellValue(cellValue: any): string | number | null {
    if (cellValue === null || cellValue === undefined) {
      return null;
    }

    // Handle Date objects
    if (cellValue instanceof Date) {
      return cellValue.toISOString().split('T')[0];
    }

    // Handle hyperlink objects: { text: '...', hyperlink: '...' }
    if (typeof cellValue === 'object' && cellValue.text !== undefined) {
      return String(cellValue.text);
    }

    // Handle rich text objects: { richText: [{ text: '...' }, ...] }
    if (typeof cellValue === 'object' && Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((rt: any) => rt.text || '').join('');
    }

    // Handle formula results: { formula: '...', result: '...' }
    if (typeof cellValue === 'object' && cellValue.result !== undefined) {
      return this.extractCellValue(cellValue.result);
    }

    // Handle error values
    if (typeof cellValue === 'object' && cellValue.error) {
      return null;
    }

    // Handle other objects by converting to string
    if (typeof cellValue === 'object') {
      return String(cellValue);
    }

    // Return primitive values directly
    return cellValue;
  }

  /**
   * Bulk import employees from Excel file
   */
  async bulkImport(fileBuffer: Buffer): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: BulkImportResult[];
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Invalid Excel file - no worksheet found');
    }

    const records: BulkEmployeeRecord[] = [];
    const headers: string[] = [];

    // Get headers from first row
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const value = this.extractCellValue(cell.value);
      headers[colNumber] = String(value || '').toLowerCase().trim();
    });

    // Parse data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const record: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const value = this.extractCellValue(cell.value);
          record[header] = value;
        }
      });

      // Helper to get string value from record
      const getString = (value: any): string => {
        if (value === null || value === undefined) return '';
        return String(value).trim();
      };

      // Map column names to expected fields
      const mappedRecord: BulkEmployeeRecord = {
        email: getString(record.email || record['email address']),
        firstName: getString(record.firstname || record['first name'] || record.first_name),
        lastName: getString(record.lastname || record['last name'] || record.last_name),
        userRole: getString(record.userrole || record['user role'] || record.user_role || record.role) || 'EMPLOYEE',
        roleName: getString(record.rolename || record['role name'] || record.role_name || record.designation || record.position),
        salary: parseFloat(String(record.salary)) || 0,
        phone: getString(record.phone || record.mobile || record['phone number']),
        gender: getString(record.gender),
        dateOfBirth: getString(record.dateofbirth || record['date of birth'] || record.dob || record.date_of_birth),
        employeeType: getString(record.employeetype || record['employee type'] || record.employee_type || record.type) || 'FULL_TIME',
        joinDate: getString(record.joindate || record['join date'] || record.join_date || record['joining date']),
        managerEmail: getString(record.manageremail || record['manager email'] || record.manager_email || record.manager),
      };

      if (mappedRecord.email && mappedRecord.firstName && mappedRecord.lastName) {
        records.push(mappedRecord);
      }
    });

    if (records.length === 0) {
      throw new BadRequestException('No valid employee records found in the Excel file');
    }

    // Get all roles for lookup
    const roles = await this.prisma.role.findMany();
    const roleMap = new Map(roles.map(r => [r.name.toLowerCase(), r.id]));

    // Get all existing users for manager lookup and duplicate check
    const existingEmails = new Set(
      (await this.prisma.user.findMany({ select: { email: true } }))
        .map(u => u.email.toLowerCase())
    );

    // Get manager email to ID mapping
    const managerUsers = await this.prisma.user.findMany({
      where: { role: { in: ['MANAGER', 'HR_HEAD', 'DIRECTOR'] } },
      include: { employee: true },
    });
    const managerEmailToId = new Map(
      managerUsers
        .filter(u => u.employee)
        .map(u => [u.email.toLowerCase(), u.employee!.id])
    );

    const results: BulkImportResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process each record
    for (const record of records) {
      try {
        // Validate email uniqueness
        if (existingEmails.has(record.email.toLowerCase())) {
          results.push({
            email: record.email,
            status: 'failed',
            message: 'Email already exists',
          });
          failed++;
          continue;
        }

        // Validate and map user role
        const validUserRoles = ['DIRECTOR', 'HR_HEAD', 'MANAGER', 'EMPLOYEE', 'INTERVIEWER'];
        const userRole = record.userRole.toUpperCase() as UserRole;
        if (!validUserRoles.includes(userRole)) {
          results.push({
            email: record.email,
            status: 'failed',
            message: `Invalid user role: ${record.userRole}. Valid roles: ${validUserRoles.join(', ')}`,
          });
          failed++;
          continue;
        }

        // Find or create role
        let roleId = roleMap.get(record.roleName.toLowerCase());
        if (!roleId) {
          // Create new role if it doesn't exist
          const newRole = await this.prisma.role.create({
            data: {
              name: record.roleName,
              dailyReportingParams: [],
              performanceChartConfig: {},
              createdBy: 'system',
            },
          });
          roleId = newRole.id;
          roleMap.set(record.roleName.toLowerCase(), roleId);
        }

        // Get manager ID if provided
        let managerId: string | undefined;
        if (record.managerEmail) {
          managerId = managerEmailToId.get(record.managerEmail.toLowerCase());
          if (!managerId) {
            results.push({
              email: record.email,
              status: 'failed',
              message: `Manager not found with email: ${record.managerEmail}`,
            });
            failed++;
            continue;
          }
        }

        // Validate salary
        if (!record.salary || record.salary <= 0) {
          results.push({
            email: record.email,
            status: 'failed',
            message: 'Invalid salary value',
          });
          failed++;
          continue;
        }

        // Validate employee type
        const validEmployeeTypes = ['INTERN', 'FULL_TIME'];
        const employeeType = (record.employeeType?.toUpperCase() || 'FULL_TIME') as EmployeeType;
        if (!validEmployeeTypes.includes(employeeType)) {
          results.push({
            email: record.email,
            status: 'failed',
            message: `Invalid employee type: ${record.employeeType}. Valid types: ${validEmployeeTypes.join(', ')}`,
          });
          failed++;
          continue;
        }

        // Generate password and create user/employee
        const password = this.generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        const defaultLeaveBalances = {
          sickLeaveBalance: 12,
          casualLeaveBalance: 12,
          earnedLeaveBalance: 15,
        };

        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: record.email,
              password: hashedPassword,
              role: userRole,
            },
          });

          await tx.employee.create({
            data: {
              userId: user.id,
              firstName: record.firstName,
              lastName: record.lastName,
              roleId: roleId!,
              salary: record.salary,
              phone: record.phone || undefined,
              gender: record.gender || undefined,
              dateOfBirth: record.dateOfBirth ? new Date(record.dateOfBirth) : undefined,
              employeeType,
              managerId,
              joinDate: record.joinDate ? new Date(record.joinDate) : new Date(),
              ...defaultLeaveBalances,
            },
          });
        });

        existingEmails.add(record.email.toLowerCase());

        // Try to send welcome email
        try {
          await this.notificationService.sendWelcomeEmail(
            record.email,
            password,
            record.firstName,
          );
        } catch (error) {
          console.error(`Failed to send welcome email to ${record.email}:`, error);
        }

        // Notify HR about new employee for onboarding documents
        try {
          await this.notificationService.notifyHRNewEmployeeOnboarding({
            id: record.email, // Using email as temp ID since we don't have employee ID from bulk transaction
            firstName: record.firstName,
            lastName: record.lastName,
            email: record.email,
            roleName: record.roleName,
            joinDate: record.joinDate ? new Date(record.joinDate) : new Date(),
          });
        } catch (error) {
          console.error(`Failed to notify HR about new employee ${record.email}:`, error);
        }

        results.push({
          email: record.email,
          status: 'success',
          temporaryPassword: password,
        });
        successful++;
      } catch (error: any) {
        results.push({
          email: record.email,
          status: 'failed',
          message: error.message || 'Unknown error occurred',
        });
        failed++;
      }
    }

    return {
      total: records.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Generate Excel template for bulk import
   */
  async generateBulkImportTemplate(): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Employee Import Template');

      // Define columns
      worksheet.columns = [
        { header: 'Email', key: 'email', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'User Role', key: 'userRole', width: 15 },
        { header: 'Role Name', key: 'roleName', width: 25 },
        { header: 'Salary', key: 'salary', width: 15 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
        { header: 'Employee Type', key: 'employeeType', width: 15 },
        { header: 'Join Date', key: 'joinDate', width: 15 },
        { header: 'Manager Email', key: 'managerEmail', width: 30 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Add sample data row
      worksheet.addRow({
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        userRole: 'EMPLOYEE',
        roleName: 'Software Engineer',
        salary: 50000,
        phone: '9876543210',
        gender: 'Male',
        dateOfBirth: '1990-01-15',
        employeeType: 'FULL_TIME',
        joinDate: '2024-01-01',
        managerEmail: 'manager@company.com',
      });

      // Add instructions sheet
      const instructionsSheet = workbook.addWorksheet('Instructions');
      instructionsSheet.columns = [
        { header: 'Column', key: 'column', width: 20 },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Required', key: 'required', width: 15 },
        { header: 'Valid Values', key: 'validValues', width: 40 },
      ];

      const instructionsHeaderRow = instructionsSheet.getRow(1);
      instructionsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      instructionsHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' },
      };

      const instructions = [
        { column: 'Email', description: 'Employee email address (unique)', required: 'Yes', validValues: 'Valid email format' },
        { column: 'First Name', description: 'Employee first name', required: 'Yes', validValues: 'Text' },
        { column: 'Last Name', description: 'Employee last name', required: 'Yes', validValues: 'Text' },
        { column: 'User Role', description: 'System access role', required: 'Yes', validValues: 'DIRECTOR, HR_HEAD, MANAGER, EMPLOYEE, INTERVIEWER' },
        { column: 'Role Name', description: 'Job designation/position', required: 'Yes', validValues: 'e.g., Software Engineer, HR Manager' },
        { column: 'Salary', description: 'Monthly salary amount', required: 'Yes', validValues: 'Number > 0' },
        { column: 'Phone', description: 'Contact phone number', required: 'No', validValues: 'Phone number' },
        { column: 'Gender', description: 'Employee gender', required: 'No', validValues: 'Male, Female, Other' },
        { column: 'Date of Birth', description: 'Date of birth', required: 'No', validValues: 'YYYY-MM-DD format' },
        { column: 'Employee Type', description: 'Employment type', required: 'No', validValues: 'FULL_TIME, INTERN' },
        { column: 'Join Date', description: 'Date of joining', required: 'No', validValues: 'YYYY-MM-DD format' },
        { column: 'Manager Email', description: 'Reporting manager email', required: 'No', validValues: 'Existing manager/HR/Director email' },
      ];

      instructions.forEach(instruction => instructionsSheet.addRow(instruction));

      const arrayBuffer = await workbook.xlsx.writeBuffer();
      // Convert ArrayBuffer to Buffer for Node.js
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error generating bulk import template:', error);
      throw new BadRequestException('Failed to generate Excel template');
    }
  }
}
