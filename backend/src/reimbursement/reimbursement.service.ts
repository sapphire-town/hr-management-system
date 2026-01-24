import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateReimbursementDto,
  ApproveReimbursementDto,
  RejectReimbursementDto,
  ReimbursementFilterDto,
} from './dto/reimbursement.dto';
import { ReimbursementStatus, UserRole } from '@prisma/client';

@Injectable()
export class ReimbursementService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createClaim(
    employeeId: string,
    dto: CreateReimbursementDto,
    receiptPath: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { manager: { include: { user: true } } },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const claim = await this.prisma.reimbursement.create({
      data: {
        employeeId,
        category: dto.category,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        description: dto.description,
        receiptPath,
        status: 'SUBMITTED',
      },
    });

    // Notify manager
    if (employee.manager) {
      await this.notificationService.sendNotification({
        recipientId: employee.manager.userId,
        subject: 'New Reimbursement Claim',
        message: `${employee.firstName} ${employee.lastName} has submitted a reimbursement claim for ₹${dto.amount} (${dto.category}).`,
        type: 'both',
      });
    }

    return claim;
  }

  async getMyClaims(employeeId: string) {
    return this.prisma.reimbursement.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClaimById(id: string) {
    const claim = await this.prisma.reimbursement.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!claim) {
      throw new NotFoundException('Reimbursement claim not found');
    }

    return claim;
  }

  async getPendingClaims(filters: ReimbursementFilterDto, userRole: UserRole) {
    const where: any = {};

    if (userRole === UserRole.MANAGER) {
      where.status = 'SUBMITTED';
    } else if (userRole === UserRole.HR_HEAD || userRole === UserRole.DIRECTOR) {
      if (filters.status) {
        where.status = filters.status;
      }
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.startDate && filters.endDate) {
      where.expenseDate = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return this.prisma.reimbursement.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeamClaims(managerId: string, filters: ReimbursementFilterDto) {
    const where: any = {
      employee: { managerId },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    return this.prisma.reimbursement.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async managerApprove(id: string, managerId: string, dto: ApproveReimbursementDto) {
    const claim = await this.getClaimById(id);

    if (claim.status !== 'SUBMITTED') {
      throw new BadRequestException('Claim is not in submitted status');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: claim.employeeId },
    });

    if (employee?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to approve this claim');
    }

    const updated = await this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'PENDING_HR',
        managerApproved: true,
      },
    });

    // Notify HR
    const hrUsers = await this.prisma.user.findMany({
      where: { role: { in: ['HR_HEAD', 'DIRECTOR'] } },
    });

    for (const hr of hrUsers) {
      await this.notificationService.sendNotification({
        recipientId: hr.id,
        subject: 'Reimbursement Pending HR Approval',
        message: `Reimbursement claim for ₹${claim.amount} by ${claim.employee.firstName} ${claim.employee.lastName} is pending HR approval.`,
        type: 'both',
      });
    }

    return updated;
  }

  async managerReject(id: string, managerId: string, dto: RejectReimbursementDto) {
    const claim = await this.getClaimById(id);

    if (claim.status !== 'SUBMITTED') {
      throw new BadRequestException('Claim is not in submitted status');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: claim.employeeId },
      include: { user: true },
    });

    if (employee?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to reject this claim');
    }

    const updated = await this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
      },
    });

    // Notify employee
    await this.notificationService.sendNotification({
      recipientId: employee.userId,
      subject: 'Reimbursement Rejected',
      message: `Your reimbursement claim for ₹${claim.amount} has been rejected. Reason: ${dto.rejectionReason}`,
      type: 'both',
    });

    return updated;
  }

  async hrApprove(id: string, dto: ApproveReimbursementDto) {
    const claim = await this.getClaimById(id);

    if (claim.status !== 'PENDING_HR') {
      throw new BadRequestException('Claim is not pending HR approval');
    }

    const updated = await this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        hrApproved: true,
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: claim.employeeId },
      include: { user: true },
    });

    if (employee) {
      await this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Reimbursement Approved',
        message: `Your reimbursement claim for ₹${claim.amount} has been approved. Payment will be processed soon.`,
        type: 'both',
      });
    }

    return updated;
  }

  async hrReject(id: string, dto: RejectReimbursementDto) {
    const claim = await this.getClaimById(id);

    if (claim.status !== 'PENDING_HR') {
      throw new BadRequestException('Claim is not pending HR approval');
    }

    const updated = await this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: claim.employeeId },
      include: { user: true },
    });

    if (employee) {
      await this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Reimbursement Rejected',
        message: `Your reimbursement claim for ₹${claim.amount} has been rejected by HR. Reason: ${dto.rejectionReason}`,
        type: 'both',
      });
    }

    return updated;
  }

  async processPayment(id: string) {
    const claim = await this.getClaimById(id);

    if (claim.status !== 'APPROVED') {
      throw new BadRequestException('Claim is not approved');
    }

    const updated = await this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'PAYMENT_PROCESSED',
        paymentProcessedAt: new Date(),
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: claim.employeeId },
      include: { user: true },
    });

    if (employee) {
      await this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Reimbursement Payment Processed',
        message: `Payment of ₹${claim.amount} for your reimbursement claim has been processed. Please acknowledge receipt.`,
        type: 'both',
      });
    }

    return updated;
  }

  async acknowledgeClaim(id: string, employeeId: string) {
    const claim = await this.getClaimById(id);

    if (claim.employeeId !== employeeId) {
      throw new ForbiddenException('You are not authorized to acknowledge this claim');
    }

    if (claim.status !== 'PAYMENT_PROCESSED') {
      throw new BadRequestException('Payment has not been processed yet');
    }

    return this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });
  }

  async getReimbursementStats() {
    const [total, pending, approved, processed, totalAmount, pendingAmount] =
      await Promise.all([
        this.prisma.reimbursement.count(),
        this.prisma.reimbursement.count({
          where: { status: { in: ['SUBMITTED', 'PENDING_HR'] } },
        }),
        this.prisma.reimbursement.count({ where: { status: 'APPROVED' } }),
        this.prisma.reimbursement.count({ where: { status: 'PAYMENT_PROCESSED' } }),
        this.prisma.reimbursement.aggregate({
          _sum: { amount: true },
          where: { status: { in: ['APPROVED', 'PAYMENT_PROCESSED', 'ACKNOWLEDGED'] } },
        }),
        this.prisma.reimbursement.aggregate({
          _sum: { amount: true },
          where: { status: { in: ['SUBMITTED', 'PENDING_HR', 'APPROVED'] } },
        }),
      ]);

    return {
      total,
      pending,
      approved,
      processed,
      totalAmount: totalAmount._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
    };
  }

  async getCategories() {
    return [
      { value: 'travel', label: 'Travel' },
      { value: 'food', label: 'Food & Meals' },
      { value: 'communication', label: 'Communication' },
      { value: 'accommodation', label: 'Accommodation' },
      { value: 'transport', label: 'Local Transport' },
      { value: 'medical', label: 'Medical' },
      { value: 'training', label: 'Training & Certification' },
      { value: 'equipment', label: 'Equipment & Supplies' },
      { value: 'other', label: 'Other' },
    ];
  }

  async getMyStats(employeeId: string) {
    const [totalClaims, pendingClaims, approvedAmount, rejectedCount] =
      await Promise.all([
        this.prisma.reimbursement.count({ where: { employeeId } }),
        this.prisma.reimbursement.count({
          where: { employeeId, status: { in: ['SUBMITTED', 'PENDING_HR'] } },
        }),
        this.prisma.reimbursement.aggregate({
          _sum: { amount: true },
          where: { employeeId, status: { in: ['APPROVED', 'PAYMENT_PROCESSED', 'ACKNOWLEDGED'] } },
        }),
        this.prisma.reimbursement.count({
          where: { employeeId, status: 'REJECTED' },
        }),
      ]);

    return {
      totalClaims,
      pendingClaims,
      approvedAmount: approvedAmount._sum.amount || 0,
      rejectedCount,
    };
  }
}
