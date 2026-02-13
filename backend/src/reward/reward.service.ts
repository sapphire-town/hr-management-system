import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import {
  CreateBadgeDto,
  UpdateBadgeDto,
  CreateRewardDto,
  RewardFilterDto,
} from './dto/reward.dto';

// Badge model accessor - prisma generate not yet run for new Badge model
// Once prisma generate runs, these casts can be removed
const badgeModel = (prisma: PrismaService) => (prisma as any).badge;

@Injectable()
export class RewardService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // ==================== Badge Management ====================

  async createBadge(dto: CreateBadgeDto) {
    const existing = await badgeModel(this.prisma).findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Badge with name "${dto.name}" already exists`);
    }

    return badgeModel(this.prisma).create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
      },
    });
  }

  async updateBadge(id: string, dto: UpdateBadgeDto) {
    const badge = await badgeModel(this.prisma).findUnique({ where: { id } });
    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    if (dto.name && dto.name !== badge.name) {
      const existing = await badgeModel(this.prisma).findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException(`Badge with name "${dto.name}" already exists`);
      }
    }

    return badgeModel(this.prisma).update({
      where: { id },
      data: dto,
    });
  }

  async deleteBadge(id: string) {
    const badge = await badgeModel(this.prisma).findUnique({ where: { id } });
    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    // Check if badge is in use
    const usageCount = await this.prisma.reward.count({
      where: { badgeId: id } as any,
    });
    if (usageCount > 0) {
      // Soft delete - deactivate instead
      return badgeModel(this.prisma).update({
        where: { id },
        data: { isActive: false },
      });
    }

    return badgeModel(this.prisma).delete({ where: { id } });
  }

  async getAllBadges(includeInactive = false) {
    return badgeModel(this.prisma).findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getBadgeById(id: string) {
    const badge = await badgeModel(this.prisma).findUnique({
      where: { id },
      include: {
        rewards: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { awardDate: 'desc' },
          take: 10,
        },
      },
    });
    if (!badge) {
      throw new NotFoundException('Badge not found');
    }
    return badge;
  }

  // ==================== Reward Management ====================

  async createReward(dto: CreateRewardDto, awardedByEmployeeId: string) {
    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: {
        user: { select: { id: true, email: true } },
        role: { select: { name: true } },
      },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // If badgeId provided, verify badge exists
    let badgeDisplayName = dto.badgeName || null;
    if (dto.badgeId) {
      const badge = await badgeModel(this.prisma).findUnique({
        where: { id: dto.badgeId },
      });
      if (!badge) {
        throw new NotFoundException('Badge not found');
      }
      badgeDisplayName = badge.name;
    }

    // Create reward
    const reward = await (this.prisma.reward.create as any)({
      data: {
        employeeId: dto.employeeId,
        amount: dto.amount || null,
        badgeId: dto.badgeId || null,
        badgeName: badgeDisplayName,
        reason: dto.reason,
        awardedBy: awardedByEmployeeId,
        awardDate: dto.awardDate ? new Date(dto.awardDate) : new Date(),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        badge: true,
      },
    });

    // Update employee's totalRewardsAmount if monetary
    if (dto.amount && dto.amount > 0) {
      await this.prisma.employee.update({
        where: { id: dto.employeeId },
        data: {
          totalRewardsAmount: { increment: dto.amount },
        },
      });
    }

    // Send notification to the employee
    try {
      await this.prisma.notification.create({
        data: {
          recipientId: employee.user.id,
          subject: 'You received a reward!',
          message: `${badgeDisplayName ? `Badge: ${badgeDisplayName}. ` : ''}${dto.amount ? `Amount: ₹${dto.amount}. ` : ''}Reason: ${dto.reason}`,
          type: 'REWARD' as NotificationType,
          channel: NotificationChannel.IN_APP,
          metadata: {
            rewardId: reward.id,
            amount: dto.amount,
            badgeName: badgeDisplayName,
          },
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to send reward notification:', error);
    }

    return reward;
  }

  async getEmployeeRewards(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        totalRewardsAmount: true,
      },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const rewards: any[] = await (this.prisma.reward.findMany as any)({
      where: { employeeId },
      include: {
        badge: true,
      },
      orderBy: { awardDate: 'desc' },
    });

    // Get unique badges
    const badgeMap = new Map<string, any>();
    for (const r of rewards) {
      const key = r.badgeId || r.badgeName;
      if (key && !badgeMap.has(key)) {
        badgeMap.set(key, {
          id: r.badgeId,
          name: r.badgeName || r.badge?.name,
          icon: r.badge?.icon,
          color: r.badge?.color,
          count: 0,
        });
      }
      if (key) {
        badgeMap.get(key).count++;
      }
    }

    return {
      employee,
      rewards,
      badges: Array.from(badgeMap.values()),
      totalMonetary: employee.totalRewardsAmount,
      totalRewards: rewards.length,
    };
  }

  async getAllRewards(filters: RewardFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters.startDate || filters.endDate) {
      where.awardDate = {};
      if (filters.startDate) {
        where.awardDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.awardDate.lte = new Date(filters.endDate);
      }
    }

    const [rewards, total] = await Promise.all([
      (this.prisma.reward.findMany as any)({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
            },
          },
          badge: true,
        },
        orderBy: { awardDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reward.count({ where }),
    ]);

    // Stats
    const stats = await this.prisma.reward.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    return {
      data: rewards,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalRewards: stats._count,
        totalMonetary: stats._sum.amount || 0,
      },
    };
  }

  async getRewardById(id: string) {
    const reward = await (this.prisma.reward.findUnique as any)({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
        badge: true,
      },
    });
    if (!reward) {
      throw new NotFoundException('Reward not found');
    }
    return reward;
  }

  async deleteReward(id: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    // Reverse the totalRewardsAmount if monetary
    if (reward.amount && reward.amount > 0) {
      await this.prisma.employee.update({
        where: { id: reward.employeeId },
        data: {
          totalRewardsAmount: { decrement: reward.amount },
        },
      });
    }

    return this.prisma.reward.delete({ where: { id } });
  }

  async getRewardStats() {
    const totalRewards = await this.prisma.reward.count();
    const totalMonetary = await this.prisma.reward.aggregate({
      _sum: { amount: true },
    });

    // Top rewarded employees
    const topEmployees = await this.prisma.reward.groupBy({
      by: ['employeeId'],
      _count: true,
      _sum: { amount: true },
      orderBy: { _count: { employeeId: 'desc' } },
      take: 5,
    });

    const topEmployeeDetails = await Promise.all(
      topEmployees.map(async (te) => {
        const emp = await this.prisma.employee.findUnique({
          where: { id: te.employeeId },
          select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } },
        });
        return {
          employee: emp,
          rewardCount: te._count,
          totalAmount: te._sum.amount || 0,
        };
      }),
    );

    // Most used badges
    const topBadges = await this.prisma.reward.groupBy({
      by: ['badgeName'],
      where: { badgeName: { not: null } },
      _count: true,
      orderBy: { _count: { badgeName: 'desc' } },
      take: 5,
    });

    return {
      totalRewards,
      totalMonetary: totalMonetary._sum.amount || 0,
      topEmployees: topEmployeeDetails,
      topBadges,
    };
  }
}
