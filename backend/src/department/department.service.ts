import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateDepartmentDto,
  DepartmentFilterDto,
  SetDepartmentRequirementDto,
  UpdateDepartmentDto,
} from './dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto, createdBy: string) {
    const name = dto.name.trim();
    const existing = await this.prisma.department.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException('Department with this name already exists');
    }

    return this.prisma.department.create({
      data: {
        name,
        createdBy,
      },
      include: {
        _count: { select: { employees: true } },
      },
    });
  }

  async findAll(filters?: DepartmentFilterDto) {
    const where: any = {};
    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const departments = await this.prisma.department.findMany({
      where,
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((dept) => ({
      ...dept,
      employeeCount: dept._count.employees,
    }));
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return {
      ...department,
      employeeCount: department._count.employees,
    };
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== department.name) {
        const existing = await this.prisma.department.findUnique({ where: { name } });
        if (existing) {
          throw new ConflictException('Department with this name already exists');
        }
      }
      updateData.name = name;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return this.prisma.department.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { employees: true } },
      },
    });
  }

  async setRequirements(id: string, dto: SetDepartmentRequirementDto) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.prisma.department.update({
      where: { id },
      data: { minimumRequired: dto.minimumRequired },
      include: {
        _count: { select: { employees: true } },
      },
    });
  }

  async delete(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }
    if (department._count.employees > 0) {
      throw new BadRequestException(
        'Cannot delete department with assigned employees. Reassign employees first.',
      );
    }

    await this.prisma.department.delete({ where: { id } });
    return { message: 'Department deleted successfully' };
  }

  async getStatistics() {
    const departments = await this.prisma.department.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    const stats = departments.map((dept) => {
      const current = dept._count.employees;
      const required = dept.minimumRequired || 0;
      const shortage = Math.max(0, required - current);
      const fulfillmentRate = required > 0 ? Math.min(100, (current / required) * 100) : 100;

      return {
        id: dept.id,
        name: dept.name,
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
      departments: stats,
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
