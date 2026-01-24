import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateResignationDto,
  ApproveResignationDto,
  RejectResignationDto,
  ResignationFilterDto,
  UpdateExitStatusDto,
} from './dto/resignation.dto';
import { ResignationStatus, UserRole } from '@prisma/client';

@Injectable()
export class ResignationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async submitResignation(employeeId: string, dto: CreateResignationDto) {
    // Check if employee already has an active resignation
    const existing = await this.prisma.resignation.findUnique({
      where: { employeeId },
    });

    if (existing && existing.status !== 'REJECTED') {
      throw new ConflictException('You already have an active resignation request');
    }

    // If there's a rejected one, delete it first
    if (existing) {
      await this.prisma.resignation.delete({ where: { employeeId } });
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { manager: { include: { user: true } }, user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const lastWorkingDay = new Date(dto.lastWorkingDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lastWorkingDay <= today) {
      throw new BadRequestException('Last working day must be in the future');
    }

    const resignation = await this.prisma.resignation.create({
      data: {
        employeeId,
        noticePeriodDays: dto.noticePeriodDays,
        reason: dto.reason,
        lastWorkingDay,
        status: 'SUBMITTED',
      },
    });

    // Notify manager
    if (employee.manager) {
      await this.notificationService.sendNotification({
        recipientId: employee.manager.userId,
        subject: 'Resignation Submitted',
        message: `${employee.firstName} ${employee.lastName} has submitted their resignation with last working day as ${lastWorkingDay.toLocaleDateString()}.`,
        type: 'both',
      });
    }

    // Notify HR
    const hrUsers = await this.prisma.user.findMany({
      where: { role: { in: ['HR_HEAD', 'DIRECTOR'] } },
    });

    for (const hr of hrUsers) {
      await this.notificationService.sendNotification({
        recipientId: hr.id,
        subject: 'New Resignation Submitted',
        message: `${employee.firstName} ${employee.lastName} has submitted their resignation.`,
        type: 'both',
      });
    }

    return resignation;
  }

  async getMyResignation(employeeId: string) {
    return this.prisma.resignation.findUnique({
      where: { employeeId },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async getResignationById(id: string) {
    const resignation = await this.prisma.resignation.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            manager: { select: { id: true, firstName: true, lastName: true } },
            role: { select: { name: true } },
            joinDate: true,
          },
        },
      },
    });

    if (!resignation) {
      throw new NotFoundException('Resignation not found');
    }

    return resignation;
  }

  async getAllResignations(filters: ResignationFilterDto) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    return this.prisma.resignation.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { email: true } },
            role: { select: { name: true } },
            manager: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeamResignations(managerId: string, filters: ResignationFilterDto) {
    const where: any = {
      employee: { managerId },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.resignation.findMany({
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

  async managerApprove(id: string, managerId: string, dto: ApproveResignationDto) {
    const resignation = await this.getResignationById(id);

    if (resignation.status !== 'SUBMITTED') {
      throw new BadRequestException('Resignation is not in submitted status');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: resignation.employeeId },
      include: { user: true },
    });

    if (employee?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to approve this resignation');
    }

    const updateData: any = {
      status: 'PENDING_HR',
      managerApproved: true,
    };

    if (dto.adjustedLastWorkingDay) {
      updateData.lastWorkingDay = new Date(dto.adjustedLastWorkingDay);
    }

    const updated = await this.prisma.resignation.update({
      where: { id },
      data: updateData,
    });

    // Notify HR
    const hrUsers = await this.prisma.user.findMany({
      where: { role: { in: ['HR_HEAD', 'DIRECTOR'] } },
    });

    for (const hr of hrUsers) {
      await this.notificationService.sendNotification({
        recipientId: hr.id,
        subject: 'Resignation Pending HR Approval',
        message: `Resignation of ${resignation.employee.firstName} ${resignation.employee.lastName} is pending HR approval.`,
        type: 'both',
      });
    }

    // Notify employee
    if (employee) {
      await this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Resignation Update',
        message: 'Your resignation has been approved by your manager and is now pending HR approval.',
        type: 'both',
      });
    }

    return updated;
  }

  async managerReject(id: string, managerId: string, dto: RejectResignationDto) {
    const resignation = await this.getResignationById(id);

    if (resignation.status !== 'SUBMITTED') {
      throw new BadRequestException('Resignation is not in submitted status');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: resignation.employeeId },
      include: { user: true },
    });

    if (employee?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to reject this resignation');
    }

    const updated = await this.prisma.resignation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
      },
    });

    // Notify employee
    if (employee) {
      await this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Resignation Rejected',
        message: `Your resignation has been rejected. Reason: ${dto.rejectionReason}`,
        type: 'both',
      });
    }

    return updated;
  }

  async hrApprove(id: string, dto: ApproveResignationDto) {
    const resignation = await this.getResignationById(id);

    if (resignation.status !== 'PENDING_HR') {
      throw new BadRequestException('Resignation is not pending HR approval');
    }

    const updateData: any = {
      status: 'APPROVED',
      hrApproved: true,
    };

    if (dto.adjustedLastWorkingDay) {
      updateData.lastWorkingDay = new Date(dto.adjustedLastWorkingDay);
    }

    const updated = await this.prisma.resignation.update({
      where: { id },
      data: updateData,
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: resignation.employeeId },
      include: { user: true },
    });

    // Notify employee
    if (employee) {
      await this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Resignation Approved',
        message: `Your resignation has been approved. Your last working day is ${updated.lastWorkingDay.toLocaleDateString()}.`,
        type: 'both',
      });
    }

    return updated;
  }

  async hrReject(id: string, dto: RejectResignationDto) {
    const resignation = await this.getResignationById(id);

    if (resignation.status !== 'PENDING_HR') {
      throw new BadRequestException('Resignation is not pending HR approval');
    }

    const updated = await this.prisma.resignation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { id: resignation.employeeId },
      include: { user: true },
    });

    // Notify employee
    if (employee) {
      await this.notificationService.sendNotification({
        recipientId: employee.userId,
        subject: 'Resignation Rejected',
        message: `Your resignation has been rejected by HR. Reason: ${dto.rejectionReason}`,
        type: 'both',
      });
    }

    return updated;
  }

  async updateExitStatus(id: string, dto: UpdateExitStatusDto) {
    const resignation = await this.getResignationById(id);

    if (resignation.status !== 'APPROVED') {
      throw new BadRequestException('Resignation must be approved to update exit status');
    }

    const updateData: any = {};

    if (dto.assetHandover !== undefined) {
      updateData.assetHandover = dto.assetHandover;
    }

    if (dto.accountDeactivated) {
      updateData.accountDeactivatedAt = new Date();
    }

    if (dto.noDueClearanceSent) {
      updateData.noDueClearanceSentAt = new Date();
    }

    const updated = await this.prisma.resignation.update({
      where: { id },
      data: updateData,
    });

    // Check if all exit formalities are complete
    const refreshed = await this.prisma.resignation.findUnique({ where: { id } });
    if (
      refreshed?.assetHandover &&
      refreshed?.accountDeactivatedAt &&
      refreshed?.noDueClearanceSentAt
    ) {
      await this.prisma.resignation.update({
        where: { id },
        data: { status: 'EXIT_COMPLETE' },
      });

      const employee = await this.prisma.employee.findUnique({
        where: { id: resignation.employeeId },
        include: { user: true },
      });

      if (employee) {
        await this.notificationService.sendNotification({
          recipientId: employee.userId,
          subject: 'Exit Process Complete',
          message: 'Your exit process has been completed. Thank you for your contributions.',
          type: 'both',
        });

        // Deactivate user account
        await this.prisma.user.update({
          where: { id: employee.userId },
          data: { isActive: false },
        });
      }
    }

    return updated;
  }

  async withdrawResignation(employeeId: string) {
    const resignation = await this.prisma.resignation.findUnique({
      where: { employeeId },
    });

    if (!resignation) {
      throw new NotFoundException('No resignation found');
    }

    if (!['SUBMITTED', 'PENDING_HR'].includes(resignation.status)) {
      throw new BadRequestException('Cannot withdraw resignation at this stage');
    }

    await this.prisma.resignation.delete({ where: { employeeId } });

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { manager: { include: { user: true } } },
    });

    // Notify manager
    if (employee?.manager) {
      await this.notificationService.sendNotification({
        recipientId: employee.manager.userId,
        subject: 'Resignation Withdrawn',
        message: `${employee.firstName} ${employee.lastName} has withdrawn their resignation.`,
        type: 'both',
      });
    }

    return { message: 'Resignation withdrawn successfully' };
  }

  async getResignationStats() {
    const [total, pending, approved, exitComplete, upcomingExits] = await Promise.all([
      this.prisma.resignation.count(),
      this.prisma.resignation.count({
        where: { status: { in: ['SUBMITTED', 'PENDING_HR'] } },
      }),
      this.prisma.resignation.count({ where: { status: 'APPROVED' } }),
      this.prisma.resignation.count({ where: { status: 'EXIT_COMPLETE' } }),
      this.prisma.resignation.findMany({
        where: {
          status: 'APPROVED',
          lastWorkingDay: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
          },
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
            },
          },
        },
        orderBy: { lastWorkingDay: 'asc' },
      }),
    ]);

    return { total, pending, approved, exitComplete, upcomingExits };
  }
}
