import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeFilterDto,
  PromoteEmployeeDto,
  AssignManagerDto,
  AssignTeamMembersDto,
  UpdateMyProfileDto,
  ChangePasswordDto,
} from './dto/employee.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

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
          managerId: dto.managerId,
          joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
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
}
