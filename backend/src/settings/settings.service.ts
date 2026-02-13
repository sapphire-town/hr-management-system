import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  UpdateCompanySettingsDto,
  UpdateLeavePoliciesDto,
  UpdateNotificationPreferencesDto,
  UpdatePayslipTemplateDto,
} from './dto/settings.dto';

const DEFAULT_SETTINGS_ID = 'default-company-settings';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

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

    const result = await this.prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        ...(dto.companyName && { companyName: dto.companyName }),
        ...(dto.workingHoursStart && { workingHoursStart: dto.workingHoursStart }),
        ...(dto.workingHoursEnd && { workingHoursEnd: dto.workingHoursEnd }),
        ...(dto.workingDays && { workingDays: dto.workingDays }),
        updatedBy,
      },
    });

    // Build change summary for notification
    const changes: string[] = [];
    if (dto.companyName) changes.push(`Company name updated to "${dto.companyName}"`);
    if (dto.workingHoursStart || dto.workingHoursEnd) {
      changes.push(`Working hours changed to ${dto.workingHoursStart || settings.workingHoursStart} - ${dto.workingHoursEnd || settings.workingHoursEnd}`);
    }
    if (dto.workingDays) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = dto.workingDays.map((d) => dayNames[d]).join(', ');
      changes.push(`Working days updated to ${days}`);
    }

    if (changes.length > 0) {
      await this.notificationService.notifyAllEmployees(
        'Company Settings Updated',
        changes.join('. ') + '.',
        undefined,
        { changeType: 'company_info', changes },
      );
    }

    return result;
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

    const result = await this.prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        leavePolicies: updatedPolicies,
        updatedBy,
      },
    });

    // Build change summary for notification
    const changes: string[] = [];
    if (dto.sickLeavePerYear !== undefined && dto.sickLeavePerYear !== currentPolicies.sickLeavePerYear) {
      changes.push(`Sick leave changed from ${currentPolicies.sickLeavePerYear || 0} to ${dto.sickLeavePerYear} days/year`);
    }
    if (dto.casualLeavePerYear !== undefined && dto.casualLeavePerYear !== currentPolicies.casualLeavePerYear) {
      changes.push(`Casual leave changed from ${currentPolicies.casualLeavePerYear || 0} to ${dto.casualLeavePerYear} days/year`);
    }
    if (dto.earnedLeavePerYear !== undefined && dto.earnedLeavePerYear !== currentPolicies.earnedLeavePerYear) {
      changes.push(`Earned leave changed from ${currentPolicies.earnedLeavePerYear || 0} to ${dto.earnedLeavePerYear} days/year`);
    }
    if (dto.maxConsecutiveDays !== undefined && dto.maxConsecutiveDays !== currentPolicies.maxConsecutiveDays) {
      changes.push(`Max consecutive leave days changed to ${dto.maxConsecutiveDays}`);
    }
    if (dto.carryForwardAllowed !== undefined && dto.carryForwardAllowed !== currentPolicies.carryForwardAllowed) {
      changes.push(`Leave carry forward ${dto.carryForwardAllowed ? 'enabled' : 'disabled'}`);
    }
    if (dto.maxCarryForward !== undefined && dto.maxCarryForward !== currentPolicies.maxCarryForward) {
      changes.push(`Max carry forward days changed to ${dto.maxCarryForward}`);
    }

    if (changes.length > 0) {
      await this.notificationService.notifyAllEmployees(
        'Leave Policy Updated',
        changes.join('. ') + '.',
        undefined,
        { changeType: 'leave_policy', changes },
      );
    }

    return result;
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

    const result = await this.prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        notificationPreferences: updatedPrefs,
        updatedBy,
      },
    });

    // Build change summary for notification
    const changes: string[] = [];
    if (dto.emailNotifications !== undefined && dto.emailNotifications !== currentPrefs.emailNotifications) {
      changes.push(`Email notifications ${dto.emailNotifications ? 'enabled' : 'disabled'}`);
    }
    if (dto.inAppNotifications !== undefined && dto.inAppNotifications !== currentPrefs.inAppNotifications) {
      changes.push(`In-app notifications ${dto.inAppNotifications ? 'enabled' : 'disabled'}`);
    }
    if (dto.reminderDaysBefore !== undefined && dto.reminderDaysBefore !== currentPrefs.reminderDaysBefore) {
      changes.push(`Reminder notifications now sent ${dto.reminderDaysBefore} days before deadlines`);
    }

    if (changes.length > 0) {
      await this.notificationService.notifyAllEmployees(
        'Notification Preferences Updated',
        changes.join('. ') + '.',
        undefined,
        { changeType: 'notification_preferences', changes },
      );
    }

    return result;
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

    // Notify all employees about the leave system reset
    await this.notificationService.notifyAllEmployees(
      'Leave System Reset',
      `The company leave system has been reset to default values. Your new leave balances are: Sick Leave: ${defaultLeavePolicies.sickLeavePerYear} days, Casual Leave: ${defaultLeavePolicies.casualLeavePerYear} days, Earned Leave: ${defaultLeavePolicies.earnedLeavePerYear} days.`,
      undefined,
      { changeType: 'leave_reset', leavePolicies: defaultLeavePolicies, employeesUpdated: result.count },
    );

    return {
      message: `Reset leave system successfully. Updated ${result.count} employees with balances: sick=12, casual=12, earned=15.`,
      leavePolicies: defaultLeavePolicies,
      employeesUpdated: result.count,
    };
  }

  async uploadLogo(filePath: string, updatedBy: string) {
    const settings = await this.getSettings();
    return this.prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        companyLogo: filePath,
        updatedBy,
      },
    });
  }

  async updatePayslipTemplate(dto: UpdatePayslipTemplateDto, updatedBy: string) {
    const settings = await this.getSettings();
    const currentTemplate = (settings.payslipTemplate as Record<string, any>) || {};

    const updatedTemplate = {
      ...currentTemplate,
      ...(dto.companyAddress !== undefined && { companyAddress: dto.companyAddress }),
      ...(dto.registrationNumber !== undefined && { registrationNumber: dto.registrationNumber }),
      ...(dto.signatoryName !== undefined && { signatoryName: dto.signatoryName }),
      ...(dto.signatoryTitle !== undefined && { signatoryTitle: dto.signatoryTitle }),
      ...(dto.footerText !== undefined && { footerText: dto.footerText }),
      ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
    };

    return this.prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        payslipTemplate: updatedTemplate,
        updatedBy,
      },
    });
  }
}
