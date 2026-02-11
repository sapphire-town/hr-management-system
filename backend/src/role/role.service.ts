import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, SetRequirementDto, RoleFilterDto } from './dto/role.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoleDto, createdBy: string) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
        dailyReportingParams: dto.dailyReportingParams
          ? JSON.parse(JSON.stringify(dto.dailyReportingParams))
          : [],
        performanceChartConfig: dto.performanceChartConfig
          ? JSON.parse(JSON.stringify(dto.performanceChartConfig))
          : {},
        createdBy,
      },
    });
  }

  async findAll(filters?: RoleFilterDto) {
    const where: any = {};

    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const roles = await this.prisma.role.findMany({
      where,
      include: {
        _count: {
          select: { employees: true },
        },
        employeeRequirements: true,
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      ...role,
      employeeCount: role._count.employees,
      minimumRequired: role.employeeRequirements[0]?.minimumRequired || 0,
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: { select: { email: true, isActive: true } },
          },
        },
        employeeRequirements: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      ...role,
      employeeCount: role.employees.length,
      minimumRequired: role.employeeRequirements[0]?.minimumRequired || 0,
    };
  }

  async update(id: string, dto: UpdateRoleDto) {
    console.log('[Role] update - id:', id);
    console.log('[Role] update - dto:', JSON.stringify(dto));

    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.dailyReportingParams !== undefined) {
      updateData.dailyReportingParams = JSON.parse(JSON.stringify(dto.dailyReportingParams));
    }
    if (dto.performanceChartConfig !== undefined) {
      updateData.performanceChartConfig = JSON.parse(JSON.stringify(dto.performanceChartConfig));
    }

    console.log('[Role] update - updateData:', JSON.stringify(updateData));

    const updated = await this.prisma.role.update({
      where: { id },
      data: updateData,
    });

    console.log('[Role] update - saved successfully:', updated.name);
    return updated;
  }

  async delete(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role._count.employees > 0) {
      throw new BadRequestException(
        'Cannot delete role with assigned employees. Reassign employees first.',
      );
    }

    await this.prisma.role.delete({ where: { id } });
    return { message: 'Role deleted successfully' };
  }

  async setRequirements(id: string, dto: SetRequirementDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.employeeRequirement.upsert({
      where: { roleId: id },
      update: { minimumRequired: dto.minimumRequired },
      create: {
        roleId: id,
        minimumRequired: dto.minimumRequired,
      },
    });
  }

  async getStatistics() {
    const roles = await this.prisma.role.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { employees: true } },
        employeeRequirements: true,
      },
    });

    const stats = roles.map((role) => {
      const current = role._count.employees;
      const required = role.employeeRequirements[0]?.minimumRequired || 0;
      const shortage = Math.max(0, required - current);
      const fulfillmentRate = required > 0 ? Math.min(100, (current / required) * 100) : 100;

      return {
        id: role.id,
        name: role.name,
        current,
        required,
        shortage,
        fulfillmentRate: Math.round(fulfillmentRate),
      };
    });

    const totalEmployees = stats.reduce((sum, s) => sum + s.current, 0);
    const totalRequired = stats.reduce((sum, s) => sum + s.required, 0);
    const totalShortage = stats.reduce((sum, s) => sum + s.shortage, 0);

    return {
      roles: stats,
      summary: {
        totalEmployees,
        totalRequired,
        totalShortage,
        overallFulfillment: totalRequired > 0
          ? Math.round((totalEmployees / totalRequired) * 100)
          : 100,
      },
    };
  }
}