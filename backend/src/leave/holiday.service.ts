import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateHolidayDto, UpdateHolidayDto, HolidayFilterDto } from './dto/holiday.dto';

@Injectable()
export class HolidayService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateHolidayDto) {
    const holidayDate = new Date(dto.date);
    holidayDate.setHours(0, 0, 0, 0);

    // Check if holiday already exists on this date
    const existing = await this.prisma.officialHoliday.findUnique({
      where: { date: holidayDate },
    });

    if (existing) {
      throw new ConflictException('A holiday already exists on this date');
    }

    return this.prisma.officialHoliday.create({
      data: {
        date: holidayDate,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAll(filters: HolidayFilterDto) {
    const where: any = {};

    if (filters.year) {
      const year = parseInt(filters.year, 10);
      where.date = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      };
    }

    if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return this.prisma.officialHoliday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const holiday = await this.prisma.officialHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }

    return holiday;
  }

  async update(id: string, dto: UpdateHolidayDto) {
    await this.findOne(id);

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.date) {
      const holidayDate = new Date(dto.date);
      holidayDate.setHours(0, 0, 0, 0);
      data.date = holidayDate;
    }

    return this.prisma.officialHoliday.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.officialHoliday.delete({
      where: { id },
    });
  }

  async getUpcoming(days: number = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.officialHoliday.findMany({
      where: {
        date: {
          gte: today,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async isHoliday(date: Date): Promise<boolean> {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const holiday = await this.prisma.officialHoliday.findUnique({
      where: { date: checkDate },
    });

    return !!holiday;
  }

  async getHolidaysInRange(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.prisma.officialHoliday.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async countHolidaysInRange(startDate: Date, endDate: Date): Promise<number> {
    const holidays = await this.getHolidaysInRange(startDate, endDate);
    return holidays.length;
  }
}
