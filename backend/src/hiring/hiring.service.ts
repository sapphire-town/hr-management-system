import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateHiringRequestDto,
  UpdateHiringRequestDto,
  ApproveHiringRequestDto,
  HiringFilterDto,
} from './dto/hiring.dto';
import { HiringRequestStatus, NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class HiringService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Create a new hiring request
   */
  async create(dto: CreateHiringRequestDto, requesterId: string) {
    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const request = await this.prisma.hiringRequest.create({
      data: {
        requestedBy: requesterId,
        roleId: dto.roleId,
        positions: dto.positions,
        justification: dto.justification,
        urgency: dto.urgency,
        status: HiringRequestStatus.PENDING,
      },
      include: {
        requester: {
          select: { firstName: true, lastName: true },
        },
        role: {
          select: { name: true },
        },
      },
    });

    // Notify all HR users about the new hiring request
    try {
      const hrUsers = await this.prisma.user.findMany({
        where: { role: 'HR_HEAD', isActive: true },
      });

      const requesterName = `${request.requester.firstName} ${request.requester.lastName}`;
      for (const hrUser of hrUsers) {
        await this.prisma.notification.create({
          data: {
            recipientId: hrUser.id,
            subject: `New Hiring Request: ${role.name} (${dto.positions} position${dto.positions > 1 ? 's' : ''})`,
            message: `${requesterName} has submitted a hiring request for ${dto.positions} ${role.name} position${dto.positions > 1 ? 's' : ''} with ${dto.urgency} urgency. Justification: ${dto.justification}`,
            type: 'HIRING_REQUEST_CREATED' as NotificationType,
            channel: NotificationChannel.BOTH,
            metadata: {
              hiringRequestId: request.id,
              roleName: role.name,
              positions: dto.positions,
              urgency: dto.urgency,
              requesterName,
            },
            sentAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to notify HR about hiring request:', error);
    }

    return request;
  }

  /**
   * Get all hiring requests with filters
   */
  async findAll(filters: HiringFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.urgency) {
      where.urgency = filters.urgency;
    }

    if (filters.roleId) {
      where.roleId = filters.roleId;
    }

    const [requests, total] = await Promise.all([
      this.prisma.hiringRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: {
            select: { firstName: true, lastName: true },
          },
          role: {
            select: { name: true },
          },
        },
      }),
      this.prisma.hiringRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single hiring request by ID
   */
  async findById(id: string) {
    const request = await this.prisma.hiringRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
        role: {
          select: { name: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Hiring request not found');
    }

    return request;
  }

  /**
   * Update a hiring request
   */
  async update(id: string, dto: UpdateHiringRequestDto) {
    const request = await this.prisma.hiringRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Hiring request not found');
    }

    if (request.status !== HiringRequestStatus.PENDING) {
      throw new BadRequestException('Can only update pending requests');
    }

    return this.prisma.hiringRequest.update({
      where: { id },
      data: dto,
      include: {
        requester: {
          select: { firstName: true, lastName: true },
        },
        role: {
          select: { name: true },
        },
      },
    });
  }

  /**
   * Approve or reject a hiring request
   */
  async approve(id: string, approvedBy: string, dto: ApproveHiringRequestDto) {
    const request = await this.prisma.hiringRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Hiring request not found');
    }

    if (request.status !== HiringRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    const newStatus = dto.approve
      ? HiringRequestStatus.APPROVED
      : HiringRequestStatus.REJECTED;

    const updated = await this.prisma.hiringRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy,
        approvedAt: new Date(),
        rejectionReason: dto.approve ? null : dto.rejectionReason,
      },
      include: {
        requester: {
          select: { firstName: true, lastName: true },
        },
        role: {
          select: { name: true },
        },
      },
    });

    // If approved, notify HR that this is now a target to fill
    if (dto.approve) {
      try {
        const hrUsers = await this.prisma.user.findMany({
          where: { role: 'HR_HEAD', isActive: true },
        });

        for (const hrUser of hrUsers) {
          await this.prisma.notification.create({
            data: {
              recipientId: hrUser.id,
              subject: `Hiring Approved: ${updated.role.name} (${updated.positions} position${updated.positions > 1 ? 's' : ''})`,
              message: `A hiring request for ${updated.positions} ${updated.role.name} position${updated.positions > 1 ? 's' : ''} has been approved by the Director. Please begin the recruitment process.`,
              type: 'HIRING_REQUEST_APPROVED' as NotificationType,
              channel: NotificationChannel.BOTH,
              metadata: {
                hiringRequestId: updated.id,
                roleName: updated.role.name,
                positions: updated.positions,
              },
              sentAt: new Date(),
            },
          });
        }
      } catch (error) {
        console.error('Failed to notify HR about hiring approval:', error);
      }
    }

    return updated;
  }

  /**
   * Update request status (e.g., to IN_PROGRESS or FILLED)
   */
  async updateStatus(id: string, status: HiringRequestStatus) {
    const request = await this.prisma.hiringRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Hiring request not found');
    }

    return this.prisma.hiringRequest.update({
      where: { id },
      data: { status },
      include: {
        requester: {
          select: { firstName: true, lastName: true },
        },
        role: {
          select: { name: true },
        },
      },
    });
  }

  /**
   * Delete a hiring request
   */
  async delete(id: string) {
    const request = await this.prisma.hiringRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Hiring request not found');
    }

    await this.prisma.hiringRequest.delete({ where: { id } });
    return { message: 'Hiring request deleted successfully' };
  }

  /**
   * Get hiring request statistics
   */
  async getStats() {
    const [total, pending, approved, inProgress, filled, rejected] = await Promise.all([
      this.prisma.hiringRequest.count(),
      this.prisma.hiringRequest.count({ where: { status: HiringRequestStatus.PENDING } }),
      this.prisma.hiringRequest.count({ where: { status: HiringRequestStatus.APPROVED } }),
      this.prisma.hiringRequest.count({ where: { status: HiringRequestStatus.IN_PROGRESS } }),
      this.prisma.hiringRequest.count({ where: { status: HiringRequestStatus.FILLED } }),
      this.prisma.hiringRequest.count({ where: { status: HiringRequestStatus.REJECTED } }),
    ]);

    // Get by urgency
    const byUrgency = await this.prisma.hiringRequest.groupBy({
      by: ['urgency'],
      where: { status: { in: [HiringRequestStatus.PENDING, HiringRequestStatus.APPROVED, HiringRequestStatus.IN_PROGRESS] } },
      _count: true,
    });

    // Get total positions needed
    const positionsAggregate = await this.prisma.hiringRequest.aggregate({
      where: { status: { in: [HiringRequestStatus.APPROVED, HiringRequestStatus.IN_PROGRESS] } },
      _sum: { positions: true },
    });

    return {
      total,
      pending,
      approved,
      inProgress,
      filled,
      rejected,
      totalPositionsOpen: positionsAggregate._sum.positions || 0,
      byUrgency: byUrgency.reduce((acc, item) => {
        acc[item.urgency] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get requests by role
   */
  async getByRole(roleId: string) {
    return this.prisma.hiringRequest.findMany({
      where: { roleId },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: { firstName: true, lastName: true },
        },
        role: {
          select: { name: true },
        },
      },
    });
  }
}
