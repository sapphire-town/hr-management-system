import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  MarkAttendanceDto,
  BulkAttendanceDto,
  AttendanceFilterDto,
  CreateHolidayDto,
  UpdateHolidayDto,
  OverrideAttendanceDto,
} from './dto/attendance.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markAttendance(employeeId: string, dto: MarkAttendanceDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // Check if attendance already marked
    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    if (existing) {
      // Update existing - record checkOutTime on re-mark
      const workingHours = existing.checkInTime
        ? parseFloat(((now.getTime() - existing.checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2))
        : null;

      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: dto.status,
          notes: dto.notes,
          checkOutTime: now,
          workingHours,
        },
      });
    }

    // Create new - record checkInTime
    return this.prisma.attendance.create({
      data: {
        employee: { connect: { id: employeeId } },
        date: today,
        status: dto.status,
        checkInTime: now,
        markedBy: employeeId,
        notes: dto.notes,
      },
    });
  }

  async checkOut(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        date: today,
      },
    });

    if (!existing) {
      throw new BadRequestException('You have not checked in today. Please mark your attendance first.');
    }

    if (existing.checkOutTime) {
      throw new BadRequestException('You have already checked out today.');
    }

    const workingHours = existing.checkInTime
      ? parseFloat(((now.getTime() - existing.checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2))
      : null;

    return this.prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOutTime: now,
        workingHours,
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
      checkInTime: record?.checkInTime || null,
      checkOutTime: record?.checkOutTime || null,
      workingHours: record?.workingHours || null,
    };
  }

  // Holiday Management
  async createHoliday(dto: CreateHolidayDto) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    const existing = await this.prisma.officialHoliday.findUnique({
      where: { date },
    });

    if (existing) {
      throw new BadRequestException('A holiday already exists on this date');
    }

    return this.prisma.officialHoliday.create({
      data: {
        date,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async updateHoliday(id: string, dto: UpdateHolidayDto) {
    const holiday = await this.prisma.officialHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.date !== undefined) {
      const newDate = new Date(dto.date);
      newDate.setHours(0, 0, 0, 0);
      updateData.date = newDate;
    }

    return this.prisma.officialHoliday.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteHoliday(id: string) {
    const holiday = await this.prisma.officialHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }

    await this.prisma.officialHoliday.delete({ where: { id } });
    return { message: 'Holiday deleted successfully' };
  }

  async getAllHolidays(year?: number) {
    const where: any = {};

    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.officialHoliday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async getHolidaysForMonth(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.prisma.officialHoliday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  // HR Override attendance
  async overrideAttendance(dto: OverrideAttendanceDto, overriddenBy: string) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const existing = await this.prisma.attendance.findFirst({
      where: {
        employeeId: dto.employeeId,
        date,
      },
    });

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: dto.status,
          notes: dto.notes ? `[HR Override] ${dto.notes}` : '[HR Override]',
          markedBy: overriddenBy,
        },
        include: {
          employee: {
            select: { firstName: true, lastName: true },
          },
        },
      });
    }

    return this.prisma.attendance.create({
      data: {
        employeeId: dto.employeeId,
        date,
        status: dto.status,
        notes: dto.notes ? `[HR Override] ${dto.notes}` : '[HR Override]',
        markedBy: overriddenBy,
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // Get calendar with holidays and approved leaves
  async getCalendarWithHolidays(employeeId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [attendanceRecords, holidays, approvedLeaves] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          employeeId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.officialHoliday.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      }),
      // Fetch approved leaves that overlap with this month
      this.prisma.leave.findMany({
        where: {
          employeeId,
          status: 'APPROVED',
          OR: [
            { startDate: { gte: startDate, lte: endDate } },
            { endDate: { gte: startDate, lte: endDate } },
            { startDate: { lte: startDate }, endDate: { gte: endDate } },
          ],
        },
      }),
    ]);

    // Create a map of dates to attendance
    const attendanceMap = new Map(
      attendanceRecords.map((r) => [r.date.toISOString().split('T')[0], r])
    );

    // Create a map of dates to holidays
    const holidayMap = new Map(
      holidays.map((h) => [h.date.toISOString().split('T')[0], h])
    );

    // Build a set of dates covered by approved leaves
    const leaveMap = new Map<string, { leaveType: string; reason: string }>();
    for (const leave of approvedLeaves) {
      const leaveStart = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()));
      const leaveEnd = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()));
      for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const dStr = d.toISOString().split('T')[0];
        // Skip holidays
        if (holidayMap.has(dStr)) continue;
        leaveMap.set(dStr, { leaveType: leave.leaveType, reason: leave.reason });
      }
    }

    // Generate calendar data for each day of the month
    const daysInMonth = endDate.getDate();
    const calendarData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const attendance = attendanceMap.get(dateStr);
      const holiday = holidayMap.get(dateStr);
      const leaveInfo = leaveMap.get(dateStr);

      // Determine status: attendance record takes priority, then leave
      let status = attendance?.status || null;
      let notes = attendance?.notes || null;
      let leaveType: string | null = null;

      if (!status && leaveInfo) {
        status = 'PAID_LEAVE';
        notes = `${leaveInfo.leaveType} Leave: ${leaveInfo.reason}`;
        leaveType = leaveInfo.leaveType;
      }

      calendarData.push({
        date: dateStr,
        dayOfWeek,
        isWeekend,
        isHoliday: !!holiday,
        holidayName: holiday?.name || null,
        status,
        notes,
        markedBy: attendance?.markedBy || null,
        checkInTime: attendance?.checkInTime || null,
        checkOutTime: attendance?.checkOutTime || null,
        workingHours: attendance?.workingHours || null,
        leaveType,
      });
    }

    return calendarData;
  }

  // Scheduled: Auto-mark absent employees at end of each working day (11 PM)
  @Cron('0 23 * * 1-5') // Mon-Fri at 11 PM
  async autoMarkAbsentees(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dayOfWeek = today.getDay();
      // Skip weekends (safety check, cron already limits to Mon-Fri)
      if (dayOfWeek === 0 || dayOfWeek === 6) return;

      // Check if today is an official holiday
      const holiday = await this.prisma.officialHoliday.findFirst({
        where: { date: today },
      });
      if (holiday) {
        console.log(`[AutoAbsent] Skipped - today is a holiday: ${holiday.name}`);
        return;
      }

      // Get all active employees
      const activeEmployees = await this.prisma.employee.findMany({
        where: { user: { isActive: true } },
        select: { id: true },
      });

      // Get employees who already have attendance for today
      const markedAttendance = await this.prisma.attendance.findMany({
        where: { date: today },
        select: { employeeId: true },
      });
      const markedSet = new Set(markedAttendance.map((a) => a.employeeId));

      // Get employees on approved leave today
      const onLeave = await this.prisma.leave.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { employeeId: true },
      });
      const leaveSet = new Set(onLeave.map((l) => l.employeeId));

      // Find employees with no attendance record and not on leave
      const absentees = activeEmployees.filter(
        (emp) => !markedSet.has(emp.id) && !leaveSet.has(emp.id),
      );

      if (absentees.length === 0) {
        console.log('[AutoAbsent] No absentees found for today.');
        return;
      }

      // Bulk create ABSENT records
      await this.prisma.attendance.createMany({
        data: absentees.map((emp) => ({
          employeeId: emp.id,
          date: today,
          status: AttendanceStatus.ABSENT,
          markedBy: 'SYSTEM',
          notes: 'Auto-marked absent (no check-in recorded)',
        })),
        skipDuplicates: true,
      });

      console.log(`[AutoAbsent] Marked ${absentees.length} employee(s) as absent for ${today.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('[AutoAbsent] Failed to auto-mark absentees:', error);
    }
  }

  // Get all employees attendance for a date (for HR)
  async getAllEmployeesAttendance(date: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const employees = await this.prisma.employee.findMany({
      where: {
        user: { isActive: true },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
        attendance: {
          where: { date: targetDate },
          select: { status: true, notes: true, markedBy: true },
          take: 1,
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return employees.map((emp) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      role: emp.role.name,
      status: emp.attendance[0]?.status || 'NOT_MARKED',
      notes: emp.attendance[0]?.notes || null,
      markedBy: emp.attendance[0]?.markedBy || null,
    }));
  }
}
