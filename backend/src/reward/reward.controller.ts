import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { RewardService } from './reward.service';
import {
  CreateBadgeDto,
  UpdateBadgeDto,
  CreateRewardDto,
  RewardFilterDto,
} from './dto/reward.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Rewards & Badges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reward')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  // ==================== Badge Endpoints ====================

  @Get('badges')
  @ApiOperation({ summary: 'Get all badges' })
  async getAllBadges(@Query('includeInactive') includeInactive?: string) {
    return this.rewardService.getAllBadges(includeInactive === 'true');
  }

  @Get('badges/:id')
  @ApiOperation({ summary: 'Get badge by ID' })
  async getBadgeById(@Param('id') id: string) {
    return this.rewardService.getBadgeById(id);
  }

  @Post('badges')
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Create a badge (HR only)' })
  async createBadge(@Body() dto: CreateBadgeDto) {
    return this.rewardService.createBadge(dto);
  }

  @Patch('badges/:id')
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update a badge (HR only)' })
  async updateBadge(@Param('id') id: string, @Body() dto: UpdateBadgeDto) {
    return this.rewardService.updateBadge(id, dto);
  }

  @Delete('badges/:id')
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Delete a badge (HR only)' })
  async deleteBadge(@Param('id') id: string) {
    return this.rewardService.deleteBadge(id);
  }

  // ==================== Reward Endpoints ====================

  @Post()
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Create a reward (HR only)' })
  async createReward(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRewardDto,
  ) {
    return this.rewardService.createReward(dto, user.employeeId || user.sub);
  }

  @Get('stats')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get reward statistics' })
  async getRewardStats() {
    return this.rewardService.getRewardStats();
  }

  @Get('all')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get all rewards with filters' })
  async getAllRewards(@Query() filters: RewardFilterDto) {
    return this.rewardService.getAllRewards(filters);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my rewards' })
  async getMyRewards(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return { employee: null, rewards: [], badges: [], totalMonetary: 0, totalRewards: 0 };
    }
    return this.rewardService.getEmployeeRewards(user.employeeId);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Get rewards for a specific employee' })
  async getEmployeeRewards(@Param('employeeId') employeeId: string) {
    return this.rewardService.getEmployeeRewards(employeeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reward by ID' })
  async getRewardById(@Param('id') id: string) {
    return this.rewardService.getRewardById(id);
  }

  @Delete(':id')
  @Roles(UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Delete a reward (HR only)' })
  async deleteReward(@Param('id') id: string) {
    return this.rewardService.deleteReward(id);
  }
}
