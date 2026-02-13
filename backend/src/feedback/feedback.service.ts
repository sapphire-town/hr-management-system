import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateFeedbackDto, HRFeedbackDto, BulkHRFeedbackDto, FeedbackFilterDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  // Employee submits feedback (about manager, company, etc.)
  async create(fromId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        fromId,
        toId: dto.toId || null,
        subject: dto.subject,
        content: dto.content,
        isConfidential: dto.isConfidential ?? true,
      },
      include: {
        from: {
          select: { firstName: true, lastName: true },
        },
        to: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // HR sends feedback to employee
  async createHRFeedback(fromId: string, dto: HRFeedbackDto) {
    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.toId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.feedback.create({
      data: {
        fromId,
        toId: dto.toId,
        subject: dto.subject,
        content: dto.content,
        isConfidential: false,
      },
      include: {
        from: {
          select: { firstName: true, lastName: true },
        },
        to: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // HR sends feedback to multiple employees at once
  async createBulkHRFeedback(fromId: string, dto: BulkHRFeedbackDto) {
    // Verify all employees exist
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: dto.toIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    if (employees.length === 0) {
      throw new NotFoundException('No valid employees found');
    }

    const validIds = employees.map((e) => e.id);
    const invalidIds = dto.toIds.filter((id) => !validIds.includes(id));

    // Create feedback for each valid employee
    const feedbacks = await Promise.all(
      validIds.map((toId) =>
        this.prisma.feedback.create({
          data: {
            fromId,
            toId,
            subject: dto.subject,
            content: dto.content,
            isConfidential: false,
          },
          include: {
            from: { select: { firstName: true, lastName: true } },
            to: { select: { firstName: true, lastName: true } },
          },
        }),
      ),
    );

    return {
      sent: feedbacks.length,
      failed: invalidIds.length,
      feedbacks,
      ...(invalidIds.length > 0 && { invalidEmployeeIds: invalidIds }),
    };
  }

  // Get all feedback (HR view)
  async findAll(filters: FeedbackFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.subject) {
      where.subject = filters.subject;
    }

    if (filters.fromId) {
      where.fromId = filters.fromId;
    }

    if (filters.toId) {
      where.toId = filters.toId;
    }

    const [records, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          from: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
            },
          },
          to: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.feedback.count({ where }),
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

  // Get employee's submitted feedback
  async getMySubmittedFeedback(employeeId: string) {
    return this.prisma.feedback.findMany({
      where: { fromId: employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        to: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // Get feedback received by employee (from HR/managers)
  async getMyReceivedFeedback(employeeId: string) {
    return this.prisma.feedback.findMany({
      where: { toId: employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        from: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // Get feedback about a specific subject (HR view)
  async getFeedbackBySubject(subject: string) {
    return this.prisma.feedback.findMany({
      where: { subject },
      orderBy: { createdAt: 'desc' },
      include: {
        from: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
      },
    });
  }

  // Get single feedback
  async findOne(id: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
      include: {
        from: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
        to: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  // Get feedback statistics for HR dashboard
  async getStatistics() {
    const [total, bySubject, confidentialCount, recent] = await Promise.all([
      this.prisma.feedback.count(),
      this.prisma.feedback.groupBy({
        by: ['subject'],
        _count: { id: true },
      }),
      this.prisma.feedback.count({
        where: { isConfidential: true },
      }),
      this.prisma.feedback.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          from: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    // Convert bySubject to Record format
    const bySubjectMap: Record<string, number> = {};
    bySubject.forEach((s) => {
      bySubjectMap[s.subject] = s._count.id;
    });

    return {
      total,
      bySubject: bySubjectMap,
      confidentialCount,
      recent,
    };
  }

  // Delete feedback (HR only)
  async delete(id: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    await this.prisma.feedback.delete({ where: { id } });
    return { message: 'Feedback deleted successfully' };
  }
}