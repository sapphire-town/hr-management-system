import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  NominateEmployeeDto,
  ApproveNominationDto,
  NominationFilterDto,
} from './dto/directors-list.dto';

@Injectable()
export class DirectorsListService {
  constructor(private prisma: PrismaService) {}

  /**
   * Nominate an employee for the director's list
   */
  async nominateEmployee(dto: NominateEmployeeDto, nominatorId: string) {
    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if already nominated for this period
    const existing = await this.prisma.directorList.findFirst({
      where: {
        employeeId: dto.employeeId,
        period: dto.period,
      },
    });

    if (existing) {
      throw new BadRequestException('Employee already nominated for this period');
    }

    // Cannot nominate yourself
    if (dto.employeeId === nominatorId) {
      throw new BadRequestException('Cannot nominate yourself');
    }

    return this.prisma.directorList.create({
      data: {
        employeeId: dto.employeeId,
        nominatedBy: nominatorId,
        period: dto.period,
        reason: dto.reason,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
        nominator: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Get all nominations with filters
   */
  async getAll(filters: NominationFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.period) {
      where.period = filters.period;
    }

    if (filters.status) {
      if (filters.status === 'approved') {
        where.isApproved = true;
      } else if (filters.status === 'rejected') {
        where.isApproved = false;
        where.approvedBy = { not: null };
      } else if (filters.status === 'pending') {
        where.approvedBy = null;
      }
    }

    const [nominations, total] = await Promise.all([
      this.prisma.directorList.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
              user: { select: { email: true } },
            },
          },
          nominator: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.directorList.count({ where }),
    ]);

    return {
      data: nominations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get nominations for current month
   */
  async getCurrentMonthNominations() {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return this.prisma.directorList.findMany({
      where: { period: currentPeriod },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
        nominator: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Approve or reject a nomination
   */
  async approveNomination(id: string, approvedBy: string, dto: ApproveNominationDto) {
    const nomination = await this.prisma.directorList.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!nomination) {
      throw new NotFoundException('Nomination not found');
    }

    if (nomination.approvedBy) {
      throw new BadRequestException('Nomination has already been processed');
    }

    // Update nomination
    const updated = await this.prisma.directorList.update({
      where: { id },
      data: {
        isApproved: dto.isApproved,
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
        nominator: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // If approved, increment the employee's directorsListCount
    if (dto.isApproved) {
      await this.prisma.employee.update({
        where: { id: nomination.employeeId },
        data: {
          directorsListCount: { increment: 1 },
        },
      });
    }

    return updated;
  }

  /**
   * Get nomination statistics
   */
  async getStats() {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [total, currentMonth, approved, pending] = await Promise.all([
      this.prisma.directorList.count(),
      this.prisma.directorList.count({ where: { period: currentPeriod } }),
      this.prisma.directorList.count({ where: { isApproved: true } }),
      this.prisma.directorList.count({ where: { approvedBy: null } }),
    ]);

    // Get top recognized employees
    const topEmployees = await this.prisma.employee.findMany({
      where: { directorsListCount: { gt: 0 } },
      orderBy: { directorsListCount: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        directorsListCount: true,
        role: { select: { name: true } },
      },
    });

    return {
      total,
      currentMonth,
      approved,
      pending,
      topEmployees,
    };
  }

  /**
   * Get nomination history for a specific employee
   */
  async getEmployeeNominationHistory(employeeId: string) {
    return this.prisma.directorList.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        nominator: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Get nominations by period
   */
  async getByPeriod(period: string) {
    return this.prisma.directorList.findMany({
      where: { period },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
        nominator: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }
}
