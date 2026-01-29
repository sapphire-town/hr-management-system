import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import {
  UpdateCompanySettingsDto,
  UpdateLeavePoliciesDto,
  UpdateNotificationPreferencesDto,
} from './dto/settings.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get company settings' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch('company')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Update company information' })
  async updateCompanyInfo(
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.updateCompanyInfo(dto, user.sub);
  }

  @Patch('leave-policies')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Update leave policies' })
  async updateLeavePolicies(
    @Body() dto: UpdateLeavePoliciesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.updateLeavePolicies(dto, user.sub);
  }

  @Patch('notifications')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.updateNotificationPreferences(dto, user.sub);
  }

  @Post('reset-leave-system')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Reset leave policies and employee balances to defaults' })
  async resetLeaveSystem(@CurrentUser() user: JwtPayload) {
    return this.settingsService.resetLeaveSystem(user.sub);
  }
}
