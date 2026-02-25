import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateAssetRequestDto,
  ApproveAssetRequestDto,
  RejectAssetRequestDto,
  AllocateAssetDto,
  AssetFilterDto,
  ReturnAssetDto,
} from './dto/asset.dto';
import { AssetStatus, UserRole } from '@prisma/client';

@Injectable()
export class AssetService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createRequest(employeeId: string, dto: CreateAssetRequestDto) {
    // Check if employee has a pending request for same asset type
    const existing = await this.prisma.assetRequest.findFirst({
      where: {
        employeeId,
        assetType: dto.assetType,
        status: { in: ['SUBMITTED', 'MANAGER_APPROVED', 'PENDING_HR', 'APPROVED'] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have a pending request for this asset type',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { manager: { include: { user: true } } },
    });

    const request = await this.prisma.assetRequest.create({
      data: {
        employeeId,
        assetType: dto.assetType,
        reason: dto.reason,
        urgency: dto.urgency,
        status: 'SUBMITTED',
      },
    });

    // Notify manager (fire-and-forget to avoid blocking on email)
    if (employee?.manager) {
      this.notificationService.sendNotification({
        recipientId: employee.manager.userId,
        subject: 'New Asset Request',
        message: `${employee.firstName} ${employee.lastName} has submitted a request for ${dto.assetType}.`,
        type: 'both',
      }).catch(err => console.error('Asset request notification failed:', err));
    }

    return request;
  }

  async getMyRequests(employeeId: string) {
    return this.prisma.assetRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRequestById(id: string) {
    const request = await this.prisma.assetRequest.findUnique({
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

    if (!request) {
      throw new NotFoundException('Asset request not found');
    }

    return request;
  }

  async getPendingRequests(filters: AssetFilterDto, userRole: UserRole) {
    const where: any = {};

    if (userRole === UserRole.MANAGER) {
      where.status = 'SUBMITTED';
    } else if (userRole === UserRole.HR_HEAD || userRole === UserRole.DIRECTOR) {
      if (filters.status) {
        where.status = filters.status;
      }
    }

    if (filters.assetType) {
      where.assetType = filters.assetType;
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.urgency) {
      where.urgency = filters.urgency;
    }

    return this.prisma.assetRequest.findMany({
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
      orderBy: [{ urgency: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getTeamRequests(managerId: string, filters: AssetFilterDto) {
    const where: any = {
      employee: { managerId },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assetType) {
      where.assetType = filters.assetType;
    }

    return this.prisma.assetRequest.findMany({
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

  async managerApprove(id: string, managerId: string, dto: ApproveAssetRequestDto) {
    const request = await this.getRequestById(id);

    if (request.status !== 'SUBMITTED') {
      throw new BadRequestException('Request is not in submitted status');
    }

    // Verify this is the employee's manager
    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
    });

    if (employee?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to approve this request');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'PENDING_HR',
        managerApproved: true,
      },
    });

    // Notify HR (fire-and-forget)
    this.prisma.user.findMany({
      where: { role: { in: ['HR_HEAD', 'DIRECTOR'] } },
    }).then(hrUsers => {
      for (const hr of hrUsers) {
        this.notificationService.sendNotification({
          recipientId: hr.id,
          subject: 'Asset Request Pending HR Approval',
          message: `Asset request for ${request.assetType} by ${request.employee.firstName} ${request.employee.lastName} is pending HR approval.`,
          type: 'both',
        }).catch(err => console.error('Asset HR notification failed:', err));
      }
    }).catch(err => console.error('Failed to fetch HR users for notification:', err));

    return updated;
  }

  async managerReject(id: string, managerId: string, dto: RejectAssetRequestDto) {
    const request = await this.getRequestById(id);

    if (request.status !== 'SUBMITTED') {
      throw new BadRequestException('Request is not in submitted status');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
      include: { user: true },
    });

    if (employee?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to reject this request');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
      },
    });

    // Notify employee (fire-and-forget)
    this.notificationService.sendNotification({
      recipientId: employee.userId,
      subject: 'Asset Request Rejected',
      message: `Your request for ${request.assetType} has been rejected. Reason: ${dto.rejectionReason}`,
      type: 'both',
    }).catch(err => console.error('Asset rejection notification failed:', err));

    return updated;
  }

  async hrApprove(id: string, dto: ApproveAssetRequestDto) {
    const request = await this.getRequestById(id);

    // HR can approve PENDING_HR requests (after manager approval)
    // OR SUBMITTED requests (for employees without managers or to bypass manager)
    if (request.status !== 'PENDING_HR' && request.status !== 'SUBMITTED') {
      throw new BadRequestException('Request is not pending approval');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        hrApproved: true,
        // If HR is approving a SUBMITTED request, also mark manager as approved (HR bypass)
        managerApproved: true,
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
      include: { user: true },
    });

    // Notify employee (fire-and-forget)
    if (employee) {
      this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Asset Request Approved',
        message: `Your request for ${request.assetType} has been approved. Asset will be allocated soon.`,
        type: 'both',
      }).catch(err => console.error('Asset approval notification failed:', err));
    }

    return updated;
  }

  async hrReject(id: string, dto: RejectAssetRequestDto) {
    const request = await this.getRequestById(id);

    // HR can reject PENDING_HR or SUBMITTED requests
    if (request.status !== 'PENDING_HR' && request.status !== 'SUBMITTED') {
      throw new BadRequestException('Request is not pending approval');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
      include: { user: true },
    });

    // Notify employee (fire-and-forget)
    if (employee) {
      this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Asset Request Rejected',
        message: `Your request for ${request.assetType} has been rejected by HR. Reason: ${dto.rejectionReason}`,
        type: 'both',
      }).catch(err => console.error('Asset HR rejection notification failed:', err));
    }

    return updated;
  }

  async allocateAsset(id: string, dto: AllocateAssetDto) {
    const request = await this.getRequestById(id);

    if (request.status !== 'APPROVED') {
      throw new BadRequestException('Request is not approved');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'ALLOCATED',
        assetSerialNo: dto.assetSerialNo,
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
      include: { user: true },
    });

    // Notify employee (fire-and-forget)
    if (employee) {
      this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Asset Allocated',
        message: `${request.assetType} (Serial: ${dto.assetSerialNo}) has been allocated to you. Please acknowledge receipt.`,
        type: 'both',
      }).catch(err => console.error('Asset allocation notification failed:', err));
    }

    return updated;
  }

  async acknowledgeAsset(id: string, employeeId: string) {
    const request = await this.getRequestById(id);

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('You are not authorized to acknowledge this asset');
    }

    if (request.status !== 'ALLOCATED') {
      throw new BadRequestException('Asset is not allocated');
    }

    return this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });
  }

  async requestReturn(id: string, employeeId: string, dto: ReturnAssetDto) {
    const request = await this.getRequestById(id);

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('You are not authorized to return this asset');
    }

    if (request.status !== 'ACKNOWLEDGED') {
      throw new BadRequestException('Only acknowledged assets can be returned');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'RETURN_REQUESTED',
        returnReason: dto.returnReason,
        returnCondition: dto.returnCondition,
      },
    });

    // Notify manager about return request for quality check (fire-and-forget)
    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
      include: { manager: { include: { user: true } } },
    });

    if (employee?.manager) {
      this.notificationService.sendNotification({
        recipientId: employee.manager.userId,
        subject: 'Asset Return - Quality Check Required',
        message: `${employee.firstName} ${employee.lastName} has requested to return ${request.assetType} (Serial: ${request.assetSerialNo}). Condition: ${dto.returnCondition}. Please verify the asset quality.`,
        type: 'both',
      }).catch(err => console.error('Asset return notification failed:', err));
    }

    return updated;
  }

  async managerApproveReturn(id: string, managerId: string) {
    const request = await this.getRequestById(id);

    if (request.status !== 'RETURN_REQUESTED') {
      throw new BadRequestException('Asset return is not pending manager approval');
    }

    // Verify this is the employee's manager
    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
      include: { user: true },
    });

    if (employee?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to approve this return');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'MANAGER_RETURN_APPROVED',
        managerReturnApproved: true,
      },
    });

    // Notify HR about manager-approved return (fire-and-forget)
    this.prisma.user.findMany({
      where: { role: { in: ['HR_HEAD', 'DIRECTOR'] } },
    }).then(hrUsers => {
      for (const hr of hrUsers) {
        this.notificationService.sendNotification({
          recipientId: hr.id,
          subject: 'Asset Return - Manager Quality Verified',
          message: `Manager has verified the quality of ${request.assetType} (Serial: ${request.assetSerialNo}) returned by ${employee!.firstName} ${employee!.lastName}. Condition: ${request.returnCondition}. Pending your final confirmation.`,
          type: 'both',
        }).catch(err => console.error('Asset return HR notification failed:', err));
      }
    }).catch(err => console.error('Failed to fetch HR users for return notification:', err));

    // Notify employee (fire-and-forget)
    if (employee) {
      this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Asset Return - Manager Approved',
        message: `Your manager has verified the quality of ${request.assetType} (Serial: ${request.assetSerialNo}). Pending final HR confirmation.`,
        type: 'both',
      }).catch(err => console.error('Asset return manager approval notification failed:', err));
    }

    return updated;
  }

  async approveReturn(id: string) {
    const request = await this.getRequestById(id);

    if (request.status !== 'MANAGER_RETURN_APPROVED') {
      throw new BadRequestException('Asset return must be approved by manager first');
    }

    const updated = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'RETURNED',
        returnedAt: new Date(),
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: request.employeeId },
      include: { user: true },
    });

    // Notify employee (fire-and-forget)
    if (employee) {
      this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Asset Return Confirmed',
        message: `Your return of ${request.assetType} (Serial: ${request.assetSerialNo}) has been confirmed by HR. The asset has been received.`,
        type: 'both',
      }).catch(err => console.error('Asset return approval notification failed:', err));
    }

    return updated;
  }

  async getReturnRequests() {
    return this.prisma.assetRequest.findMany({
      where: { status: 'MANAGER_RETURN_APPROVED' },
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
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getManagerPendingReturns(managerId: string) {
    return this.prisma.assetRequest.findMany({
      where: {
        status: 'RETURN_REQUESTED',
        employee: { managerId },
      },
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
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getAssetStats() {
    const [total, pending, approved, allocated, acknowledged, returnRequested, managerReturnApproved, returned] = await Promise.all([
      this.prisma.assetRequest.count(),
      this.prisma.assetRequest.count({
        where: { status: { in: ['SUBMITTED', 'PENDING_HR'] } },
      }),
      this.prisma.assetRequest.count({ where: { status: 'APPROVED' } }),
      this.prisma.assetRequest.count({ where: { status: 'ALLOCATED' } }),
      this.prisma.assetRequest.count({ where: { status: 'ACKNOWLEDGED' } }),
      this.prisma.assetRequest.count({ where: { status: 'RETURN_REQUESTED' } }),
      this.prisma.assetRequest.count({ where: { status: 'MANAGER_RETURN_APPROVED' } }),
      this.prisma.assetRequest.count({ where: { status: 'RETURNED' } }),
    ]);

    return { total, pending, approved, allocated, acknowledged, returnRequested, managerReturnApproved, returned };
  }

  async getAssetTypes() {
    return [
      { value: 'laptop', label: 'Laptop' },
      { value: 'desktop', label: 'Desktop' },
      { value: 'monitor', label: 'Monitor' },
      { value: 'keyboard', label: 'Keyboard' },
      { value: 'mouse', label: 'Mouse' },
      { value: 'headset', label: 'Headset' },
      { value: 'mobile', label: 'Mobile Phone' },
      { value: 'sim_card', label: 'SIM Card' },
      { value: 'id_card', label: 'ID Card' },
      { value: 'access_card', label: 'Access Card' },
      { value: 'chair', label: 'Chair' },
      { value: 'other', label: 'Other' },
    ];
  }
}
