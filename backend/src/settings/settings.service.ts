import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  UpdateCompanySettingsDto,
  UpdateLeavePoliciesDto,
  UpdateNotificationPreferencesDto,
} from './dto/settings.dto';

const DEFAULT_SETTINGS_ID = 'default-company-settings';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get current settings (create default if none exists)
   */
  async getSettings() {
    let settings = await this.prisma.companySettings.findFirst();

    if (!settings) {
      // Create default settings
      settings = await this.prisma.companySettings.create({
        data: {
          id: DEFAULT_SETTINGS_ID,
          companyName: 'Acme Corporation',
          workingHoursStart: '09:00',
          workingHoursEnd: '18:00',
          workingDays: [1, 2, 3, 4, 5],
          leavePolicies: {
            sickLeavePerYear: 12,
            casualLeavePerYear: 12,
            earnedLeavePerYear: 15,
            maxConsecutiveDays: 5,
            carryForwardAllowed: true,
            maxCarryForward: 5,
          },
          notificationPreferences: {
            emailNotifications: true,
            inAppNotifications: true,
            reminderDaysBefore: 7,
          },
        },
      });
    }

    return settings;
  }

  /**
   * Update company information
   */
  async updateCompanyInfo(dto: UpdateCompanySettingsDto, updatedBy: string) {
    const settings = await this.getSettings();

    return this.prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        ...(dto.companyName && { companyName: dto.companyName }),
        ...(dto.workingHoursStart && { workingHoursStart: dto.workingHoursStart }),
        ...(dto.workingHoursEnd && { workingHoursEnd: dto.workingHoursEnd }),
        ...(dto.workingDays && { workingDays: dto.workingDays }),
        updatedBy,
      },
    });
  }

  /**
   * Update leave policies
   */
  async updateLeavePolicies(dto: UpdateLeavePoliciesDto, updatedBy: string) {
    const settings = await this.getSettings();
    const currentPolicies = (settings.leavePolicies as Record<string, any>) || {};

    const updatedPolicies = {
      ...currentPolicies,
      ...(dto.sickLeavePerYear !== undefined && { sickLeavePerYear: dto.sickLeavePerYear }),
      ...(dto.casualLeavePerYear !== undefined && { casualLeavePerYear: dto.casualLeavePerYear }),
      ...(dto.earnedLeavePerYear !== undefined && { earnedLeavePerYear: dto.earnedLeavePerYear }),
      ...(dto.maxConsecutiveDays !== undefined && { maxConsecutiveDays: dto.maxConsecutiveDays }),
      ...(dto.carryForwardAllowed !== undefined && { carryForwardAllowed: dto.carryForwardAllowed }),
      ...(dto.maxCarryForward !== undefined && { maxCarryForward: dto.maxCarryForward }),
    };

    return this.prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        leavePolicies: updatedPolicies,
        updatedBy,
      },
    });
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(dto: UpdateNotificationPreferencesDto, updatedBy: string) {
    const settings = await this.getSettings();
    const currentPrefs = (settings.notificationPreferences as Record<string, any>) || {};

    const updatedPrefs = {
      ...currentPrefs,
      ...(dto.emailNotifications !== undefined && { emailNotifications: dto.emailNotifications }),
      ...(dto.inAppNotifications !== undefined && { inAppNotifications: dto.inAppNotifications }),
      ...(dto.reminderDaysBefore !== undefined && { reminderDaysBefore: dto.reminderDaysBefore }),
    };

    return this.prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        notificationPreferences: updatedPrefs,
        updatedBy,
      },
    });
  }

  /**
   * Reset leave policies to defaults and update all employees
   */
  async resetLeaveSystem(updatedBy: string) {
    const defaultLeavePolicies = {
      sickLeavePerYear: 12,
      casualLeavePerYear: 12,
      earnedLeavePerYear: 15,
      maxConsecutiveDays: 5,
      carryForwardAllowed: true,
      maxCarryForward: 5,
    };

    // Use a transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Update or create settings with default leave policies
      let settings = await tx.companySettings.findFirst();

      if (settings) {
        await tx.companySettings.update({
          where: { id: settings.id },
          data: {
            leavePolicies: defaultLeavePolicies,
            updatedBy,
          },
        });
      } else {
        // Create default settings
        settings = await tx.companySettings.create({
          data: {
            id: 'default-company-settings',
            companyName: 'Acme Corporation',
            workingHoursStart: '09:00',
            workingHoursEnd: '18:00',
            workingDays: [1, 2, 3, 4, 5],
            leavePolicies: defaultLeavePolicies,
            notificationPreferences: {
              emailNotifications: true,
              inAppNotifications: true,
              reminderDaysBefore: 7,
            },
          },
        });
      }

      // Update all employees with default leave balances
      const updateResult = await tx.employee.updateMany({
        data: {
          sickLeaveBalance: defaultLeavePolicies.sickLeavePerYear,
          casualLeaveBalance: defaultLeavePolicies.casualLeavePerYear,
          earnedLeaveBalance: defaultLeavePolicies.earnedLeavePerYear,
        },
      });

      // Log for debugging
      console.log(`[ResetLeaveSystem] Updated ${updateResult.count} employees with balances: sick=${defaultLeavePolicies.sickLeavePerYear}, casual=${defaultLeavePolicies.casualLeavePerYear}, earned=${defaultLeavePolicies.earnedLeavePerYear}`);

      return updateResult;
    });

    return {
      message: `Reset leave system successfully. Updated ${result.count} employees with balances: sick=12, casual=12, earned=15.`,
      leavePolicies: defaultLeavePolicies,
      employeesUpdated: result.count,
    };
  }
}
