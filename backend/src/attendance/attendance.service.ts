import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  MarkAttendanceDto,
  BulkAttendanceDto,
  AttendanceFilterDto,
} from './dto/attendance.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendance(employeeId: string, dto: MarkAttendanceDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance already marked
    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    if (existing) {
      // Update existing
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: dto.status,
          notes: dto.notes,
        },
      });
    }

    // Create new
    return this.prisma.attendance.create({
      data: {
        employee: { connect: { id: employeeId } },
        date: today,
        status: dto.status,
        markedBy: employeeId,
        notes: dto.notes,
      },
    });
  }

  async markBulkAttendance(dto: BulkAttendanceDto) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    const results = await Promise.all(
      dto.records.map(async (record) => {
        const existing = await this.prisma.attendance.findFirst({
          where: {
            employeeId: record.employeeId,
            date,
          },
        });

        if (existing) {
          return this.prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status: record.status,
              notes: record.notes,
            },
          });
        }

        return this.prisma.attendance.create({
          data: {
            employee: { connect: { id: record.employeeId } },
            date,
            status: record.status,
            markedBy: record.employeeId,
            notes: record.notes,
          },
        });
      }),
    );

    return { updated: results.length };
  }

  async findAll(filters: AttendanceFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              user: { select: { email: true } },
            },
          },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyAttendance(employeeId: string, filters: AttendanceFilterDto) {
    return this.findAll({ ...filters, employeeId });
  }

  async getCalendar(employeeId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    return records.map((r) => ({
      date: r.date,
      status: r.status,
      notes: r.notes,
    }));
  }

  async getTeamAttendance(managerId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const team = await this.prisma.employee.findMany({
      where: { managerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        attendance: {
          where: { date: targetDate },
          select: { status: true, notes: true },
          take: 1,
        },
      },
    });

    return team.map((member) => ({
      id: member.id,
      name: `${member.firstName} ${member.lastName}`,
      status: member.attendance[0]?.status || 'NOT_MARKED',
      notes: member.attendance[0]?.notes,
    }));
  }

  async getSummary(employeeId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      paidLeave: 0,
      holiday: 0,
      total: records.length,
    };

    records.forEach((r) => {
      switch (r.status) {
        case AttendanceStatus.PRESENT:
          summary.present++;
          break;
        case AttendanceStatus.ABSENT:
        case AttendanceStatus.ABSENT_DOUBLE_DEDUCTION:
          summary.absent++;
          break;
        case AttendanceStatus.HALF_DAY:
          summary.halfDay++;
          break;
        case AttendanceStatus.PAID_LEAVE:
          summary.paidLeave++;
          break;
        case AttendanceStatus.OFFICIAL_HOLIDAY:
          summary.holiday++;
          break;
      }
    });

    return summary;
  }

  async getTodayStatus(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    return {
      marked: !!record,
      status: record?.status || null,
      notes: record?.notes || null,
    };
  }
}
