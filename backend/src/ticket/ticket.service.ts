import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateTicketDto,
  UpdateTicketStatusDto,
  AddCommentDto,
  TicketFilterDto,
} from './dto/ticket.dto';
import { TicketStatus, NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class TicketService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(createdBy: string, dto: CreateTicketDto) {
    // Find the employee's manager or HR to assign
    const employee = await this.prisma.employee.findUnique({
      where: { id: createdBy },
      include: { manager: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Assign to manager if exists, otherwise find HR
    let assignedTo = employee.managerId;

    if (!assignedTo) {
      const hrUser = await this.prisma.user.findFirst({
        where: { role: 'HR_HEAD', isActive: true },
        include: { employee: true },
      });
      assignedTo = hrUser?.employee?.id || createdBy;
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        subject: dto.subject,
        description: dto.description,
        category: dto.category || 'General',
        createdBy,
        assignedTo,
        status: TicketStatus.OPEN,
        comments: [],
      },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Notify assignee immediately
    if (assignedTo && assignedTo !== createdBy) {
      try {
        const assigneeUser = await this.prisma.user.findFirst({
          where: { employee: { id: assignedTo } },
        });
        if (assigneeUser) {
          const creatorName = ticket.creator
            ? `${ticket.creator.firstName} ${ticket.creator.lastName}`
            : 'An employee';
          await this.prisma.notification.create({
            data: {
              recipientId: assigneeUser.id,
              subject: `New Ticket Assigned: ${dto.subject}`,
              message: `${creatorName} has raised a ticket "${dto.subject}" (${dto.category || 'General'}) and it has been assigned to you.`,
              type: 'TICKET_ASSIGNED' as NotificationType,
              channel: NotificationChannel.BOTH,
              metadata: {
                ticketId: ticket.id,
                category: dto.category || 'General',
                creatorName,
              },
              sentAt: new Date(),
            },
          });
        }
      } catch (error) {
        console.error('Failed to notify assignee about ticket:', error);
      }
    }

    return ticket;
  }

  async getMyTickets(employeeId: string) {
    return this.prisma.ticket.findMany({
      where: { createdBy: employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async getAssignedTickets(employeeId: string) {
    return this.prisma.ticket.findMany({
      where: { assignedTo: employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async getTeamTickets(managerId: string) {
    // Get all direct reports of this manager
    const teamMembers = await this.prisma.employee.findMany({
      where: { managerId },
      select: { id: true },
    });
    const teamIds = teamMembers.map((m) => m.id);
    // Include manager's own tickets too
    teamIds.push(managerId);

    return this.prisma.ticket.findMany({
      where: {
        OR: [
          { createdBy: { in: teamIds } },
          { assignedTo: { in: teamIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async getAll(filters: TicketFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;

    const [records, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
            },
          },
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: records,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async updateStatus(id: string, employeeId: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Prevent reopening resolved or closed tickets
    if (
      (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) &&
      (dto.status === TicketStatus.OPEN || dto.status === TicketStatus.IN_PROGRESS)
    ) {
      throw new BadRequestException(
        'Resolved or closed tickets cannot be reopened. Please create a new ticket instead.',
      );
    }

    const data: any = { status: dto.status };
    if (dto.status === TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Notify the ticket creator about the status change
    try {
      const creatorUser = await this.prisma.user.findFirst({
        where: { employee: { id: ticket.createdBy } },
      });
      if (creatorUser && ticket.createdBy !== employeeId) {
        const statusLabel = dto.status.replace('_', ' ');
        await this.prisma.notification.create({
          data: {
            recipientId: creatorUser.id,
            subject: `Ticket Updated: ${ticket.subject}`,
            message: `Your ticket "${ticket.subject}" has been updated to ${statusLabel}.`,
            type: 'TICKET_STATUS_UPDATED' as NotificationType,
            channel: NotificationChannel.IN_APP,
            metadata: {
              ticketId: ticket.id,
              oldStatus: ticket.status,
              newStatus: dto.status,
            },
            sentAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to notify creator about ticket status change:', error);
    }

    return updated;
  }

  async addComment(id: string, employeeId: string, dto: AddCommentDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, lastName: true },
    });

    const existingComments = (ticket.comments as any[]) || [];
    const newComment = {
      id: crypto.randomUUID(),
      employeeId,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
      comment: dto.comment,
      createdAt: new Date().toISOString(),
    };

    return this.prisma.ticket.update({
      where: { id },
      data: {
        comments: [...existingComments, newComment],
      },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async resolve(id: string, employeeId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Only the assignee can mark a ticket as resolved
    if (ticket.assignedTo !== employeeId) {
      throw new ForbiddenException(
        'Only the assigned person can resolve this ticket.',
      );
    }

    // Prevent resolving already resolved/closed tickets
    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('This ticket is already resolved or closed.');
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
        assignee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Notify the ticket creator that their ticket has been resolved
    try {
      const creatorUser = await this.prisma.user.findFirst({
        where: { employee: { id: ticket.createdBy } },
      });
      if (creatorUser && ticket.createdBy !== employeeId) {
        const resolverName = updated.assignee
          ? `${updated.assignee.firstName} ${updated.assignee.lastName}`
          : 'The assignee';
        await this.prisma.notification.create({
          data: {
            recipientId: creatorUser.id,
            subject: `Ticket Resolved: ${ticket.subject}`,
            message: `${resolverName} has resolved your ticket "${ticket.subject}".`,
            type: 'TICKET_STATUS_UPDATED' as NotificationType,
            channel: NotificationChannel.BOTH,
            metadata: {
              ticketId: ticket.id,
              oldStatus: ticket.status,
              newStatus: 'RESOLVED',
            },
            sentAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to notify creator about ticket resolution:', error);
    }

    return updated;
  }

  async getStatistics() {
    const [total, byStatus, byCategory, recentTickets] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      this.prisma.ticket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { firstName: true, lastName: true } },
          assignee: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s) => { statusMap[s.status] = s._count.id; });

    const categoryMap: Record<string, number> = {};
    byCategory.forEach((c) => { categoryMap[c.category || 'General'] = c._count.id; });

    return {
      total,
      open: statusMap['OPEN'] || 0,
      inProgress: statusMap['IN_PROGRESS'] || 0,
      resolved: statusMap['RESOLVED'] || 0,
      closed: statusMap['CLOSED'] || 0,
      byCategory: categoryMap,
      recentTickets,
    };
  }
}
