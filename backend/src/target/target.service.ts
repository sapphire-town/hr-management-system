import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTargetDto, UpdateTargetDto, BulkCreateTargetDto } from './dto/target.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TargetService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a target for an employee
   */
  async create(dto: CreateTargetDto, setBy: string) {
    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if target already exists for this employee and month
    const existing = await this.prisma.employeeTarget.findUnique({
      where: {
        employeeId_targetMonth: {
          employeeId: dto.employeeId,
          targetMonth: dto.targetMonth,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Target already exists for this employee and month. Use update instead.');
    }

    return this.prisma.employeeTarget.create({
      data: {
        employeeId: dto.employeeId,
        targetMonth: dto.targetMonth,
        targetData: dto.targetData as unknown as Prisma.InputJsonValue,
        notes: dto.notes,
        setBy,
      },
    });
  }

  /**
   * Bulk create targets for multiple employees
   */
  async bulkCreate(dto: BulkCreateTargetDto, setBy: string) {
    const results = [];
    const errors = [];

    for (const employeeId of dto.employeeIds) {
      try {
        // Check if target already exists
        const existing = await this.prisma.employeeTarget.findUnique({
          where: {
            employeeId_targetMonth: {
              employeeId,
              targetMonth: dto.targetMonth,
            },
          },
        });

        if (existing) {
          // Update existing
          const updated = await this.prisma.employeeTarget.update({
            where: { id: existing.id },
            data: {
              targetData: dto.targetData as unknown as Prisma.InputJsonValue,
              notes: dto.notes,
              setBy,
            },
          });
          results.push({ employeeId, action: 'updated', target: updated });
        } else {
          // Create new
          const created = await this.prisma.employeeTarget.create({
            data: {
              employeeId,
              targetMonth: dto.targetMonth,
              targetData: dto.targetData as unknown as Prisma.InputJsonValue,
              notes: dto.notes,
              setBy,
            },
          });
          results.push({ employeeId, action: 'created', target: created });
        }
      } catch (error) {
        errors.push({ employeeId, error: error.message });
      }
    }

    return { results, errors };
  }

  /**
   * Get all targets (with optional filters)
   */
  async findAll(filters: { employeeId?: string; targetMonth?: string; managerId?: string }) {
    const where: any = { isActive: true };

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.targetMonth) {
      where.targetMonth = filters.targetMonth;
    }

    // If managerId is provided, get targets for manager's team
    if (filters.managerId) {
      const teamMembers = await this.prisma.employee.findMany({
        where: { managerId: filters.managerId },
        select: { id: true },
      });
      where.employeeId = { in: teamMembers.map(e => e.id) };
    }

    return this.prisma.employeeTarget.findMany({
      where,
      orderBy: [{ targetMonth: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get target by ID
   */
  async findOne(id: string) {
    const target = await this.prisma.employeeTarget.findUnique({
      where: { id },
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    return target;
  }

  /**
   * Get target for specific employee and month
   */
  async findByEmployeeAndMonth(employeeId: string, targetMonth: string) {
    return this.prisma.employeeTarget.findUnique({
      where: {
        employeeId_targetMonth: {
          employeeId,
          targetMonth,
        },
      },
    });
  }

  /**
   * Get targets for manager's team
   */
  async getTeamTargets(managerId: string, targetMonth?: string) {
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId },
      include: {
        role: true,
        user: { select: { email: true, isActive: true } },
      },
    });

    const where: any = {
      employeeId: { in: teamMembers.map(e => e.id) },
      isActive: true,
    };

    if (targetMonth) {
      where.targetMonth = targetMonth;
    }

    const targets = await this.prisma.employeeTarget.findMany({
      where,
      orderBy: { targetMonth: 'desc' },
    });

    // Map targets to employees
    return teamMembers.map(emp => ({
      employee: {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.user.email,
        role: emp.role,
        isActive: emp.user.isActive,
      },
      targets: targets.filter(t => t.employeeId === emp.id),
      currentTarget: targets.find(t => t.employeeId === emp.id && t.targetMonth === targetMonth),
    }));
  }

  /**
   * Update a target
   */
  async update(id: string, dto: UpdateTargetDto, updatedBy: string) {
    const target = await this.findOne(id);

    return this.prisma.employeeTarget.update({
      where: { id },
      data: {
        ...(dto.targetData && { targetData: dto.targetData as unknown as Prisma.InputJsonValue }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        setBy: updatedBy,
      },
    });
  }

  /**
   * Delete a target (soft delete by setting isActive = false)
   */
  async remove(id: string) {
    const target = await this.findOne(id);

    return this.prisma.employeeTarget.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Hard delete a target
   */
  async hardDelete(id: string) {
    await this.findOne(id);

    return this.prisma.employeeTarget.delete({
      where: { id },
    });
  }

  /**
   * Get target statistics for a manager's team
   */
  async getTeamTargetStats(managerId: string, targetMonth: string) {
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId },
      select: { id: true },
    });

    const targets = await this.prisma.employeeTarget.findMany({
      where: {
        employeeId: { in: teamMembers.map(e => e.id) },
        targetMonth,
        isActive: true,
      },
    });

    return {
      totalTeamMembers: teamMembers.length,
      membersWithTargets: targets.length,
      membersWithoutTargets: teamMembers.length - targets.length,
      targetMonth,
    };
  }
}
