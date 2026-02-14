import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType, NotificationChannel } from '@prisma/client';
import {
  interviewerAssignedTemplate,
  studentAddedTemplate,
  driveUpdatedTemplate,
  driveReminderTemplate,
  DriveRole,
} from './templates/recruitment-templates';

@Injectable()
export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: this.configService.get('EMAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  async sendWelcomeEmail(
    email: string,
    password: string,
    firstName: string,
    roleInfo?: { roleName: string; userRole: string },
  ) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

    const userRoleLabels: Record<string, string> = {
      DIRECTOR: 'Director',
      HR_HEAD: 'HR Head',
      MANAGER: 'Manager',
      EMPLOYEE: 'Employee',
      INTERVIEWER: 'Interviewer',
    };

    const accessLabel = roleInfo ? (userRoleLabels[roleInfo.userRole] || roleInfo.userRole) : '';

    // Role-specific feature lists
    const featuresByRole: Record<string, string[]> = {
      DIRECTOR: [
        'Company-wide Dashboard & Analytics',
        'Employee Management & Roles',
        "Director's List & Performance Tracking",
        'Daily Reporting Configuration',
        'Hiring Requests & Resignations',
        'Ticket Management',
        'Feedback Reports',
      ],
      HR_HEAD: [
        'Employee Onboarding & Management',
        'Leave & Attendance Management',
        'Payroll Processing',
        'Document Management',
        'Daily Reporting Configuration',
        'Asset & Reimbursement Requests',
        'Recruitment',
        'Ticket Management',
      ],
      MANAGER: [
        'Team Dashboard & Performance',
        'Leave Approvals',
        'Daily Report Reviews',
        'Attendance Monitoring',
        'Resignation Management',
        'Team Tickets',
      ],
      EMPLOYEE: [
        'Personal Dashboard',
        'Attendance Tracking',
        'Leave Management',
        'Daily Reports Submission',
        'Document Access & Payslips',
        'Asset & Reimbursement Requests',
        'Tickets & Feedback',
      ],
      INTERVIEWER: [
        'Placement Drive Management',
        'Attendance Tracking',
        'Leave Management',
        'Daily Reports Submission',
        'Document Access & Payslips',
        'Tickets & Feedback',
      ],
    };

    const features = roleInfo ? (featuresByRole[roleInfo.userRole] || featuresByRole['EMPLOYEE']) : [];

    const featuresHtml = features.length > 0
      ? `
        <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #22c55e;">
          <h3 style="color: #166534; margin: 0 0 8px; font-size: 15px;">Your Dashboard Features</h3>
          <p style="color: #374151; font-size: 13px; margin: 0 0 8px;">As a <strong>${roleInfo!.roleName}</strong> (${accessLabel} access), you have access to:</p>
          <ul style="color: #374151; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
            ${features.map(f => `<li>${f}</li>`).join('\n            ')}
          </ul>
        </div>`
      : '';

    const roleInfoHtml = roleInfo
      ? `<p style="color: #374151;"><strong>Designation:</strong> ${roleInfo.roleName}</p>
         <p style="color: #374151;"><strong>Access Level:</strong> ${accessLabel}</p>`
      : '';

    const mailOptions = {
      from: this.configService.get('EMAIL_FROM'),
      to: email,
      subject: 'Welcome to HR Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">Welcome to HR Management System</h2>
            <p style="color: #e9d5ff; margin: 8px 0 0; font-size: 14px;">Your account is ready</p>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px;">Hello <strong>${firstName}</strong>,</p>
            <p style="color: #374151;">Your account has been created successfully. Here are your login credentials:</p>

            <div style="background: #f5f3ff; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #7c3aed;">
              <p style="color: #374151; margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
              <p style="color: #374151; margin: 0;"><strong>Temporary Password:</strong> ${password}</p>
            </div>

            ${roleInfoHtml}
            ${featuresHtml}

            <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 16px 0; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>Important:</strong> Please log in and change your password immediately for security.
              </p>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${frontendUrl}/auth/login" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Login to Your Dashboard
              </a>
            </div>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    await this.createNotification(email, 'Welcome', mailOptions.html, 'email');
  }

  async sendPasswordResetEmail(email: string, newPassword: string, firstName: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const subject = 'Password Reset - HR Management System';
    const html = `
      <h1>Password Reset</h1>
      <p>Hello ${firstName},</p>
      <p>Your password has been reset by an administrator.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>New Temporary Password:</strong> ${newPassword}</p>
      <p>Please login and change your password immediately for security purposes.</p>
      <p><a href="${frontendUrl}/auth/login">Login Here</a></p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: email,
      subject,
      html,
    });

    await this.createNotification(email, subject, html, 'email');
  }

  async sendLeaveStatusEmail(employeeEmail: string, leaveId: string, status: string, reason?: string) {
    const subject = `Leave Application ${status}`;
    const html = `
      <h2>Leave Status Update</h2>
      <p>Your leave application (ID: ${leaveId}) has been <strong>${status}</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: employeeEmail,
      subject,
      html,
    });

    await this.createNotification(employeeEmail, subject, html, 'email');
  }

  async sendResignationStatusEmail(employeeEmail: string, status: string, reason?: string) {
    const subject = `Resignation ${status}`;
    const html = `
      <h2>Resignation Status Update</h2>
      <p>Your resignation has been <strong>${status}</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: employeeEmail,
      subject,
      html,
    });

    await this.createNotification(employeeEmail, subject, html, 'email');
  }

  async sendDocumentReleasedEmail(employeeEmail: string, documentType: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const subject = `New Document Released: ${documentType}`;
    const html = `
      <h2>Document Released</h2>
      <p>A new document has been released to you: <strong>${documentType}</strong></p>
      <p><a href="${frontendUrl}/documents">View Documents</a></p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: employeeEmail,
      subject,
      html,
    });

    await this.createNotification(employeeEmail, subject, html, 'email');
  }

  async sendBirthdayNotificationToHR(employeeName: string, dateOfBirth: string) {
    const hrEmail = await this.getHRHeadEmail();
    if (!hrEmail) return;

    const subject = `Birthday Notification: ${employeeName}`;
    const html = `
      <h2>Employee Birthday</h2>
      <p><strong>${employeeName}</strong> has a birthday today (${dateOfBirth})!</p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: hrEmail,
      subject,
      html,
    });

    await this.createNotification(hrEmail, subject, html, 'email');
  }

  async sendTicketAssignedEmail(assigneeEmail: string, ticketId: string, subject: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const emailSubject = `New Ticket Assigned: ${ticketId}`;
    const html = `
      <h2>New Ticket Assigned</h2>
      <p>You have been assigned a new ticket.</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><a href="${frontendUrl}/tickets/${ticketId}">View Ticket</a></p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: assigneeEmail,
      subject: emailSubject,
      html,
    });

    await this.createNotification(assigneeEmail, emailSubject, html, 'email');
  }

  async sendPromotionEmail(employeeEmail: string, newRole: string) {
    const subject = 'Congratulations on Your Promotion!';
    const html = `
      <h2>Promotion Notification</h2>
      <p>Congratulations! You have been promoted to <strong>${newRole}</strong>.</p>
      <p>New features and responsibilities are now available in your dashboard.</p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: employeeEmail,
      subject,
      html,
    });

    await this.createNotification(employeeEmail, subject, html, 'email');
  }

  async notifyPromotion(employee: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    previousRoleName: string;
    previousUserRole: string;
  }, promotion: {
    newRoleName: string;
    newUserRole: string;
    newSalary?: number;
  }) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      const userRoleLabels: Record<string, string> = {
        DIRECTOR: 'Director',
        HR_HEAD: 'HR Head',
        MANAGER: 'Manager',
        EMPLOYEE: 'Employee',
        INTERVIEWER: 'Interviewer',
      };

      const newAccessLabel = userRoleLabels[promotion.newUserRole] || promotion.newUserRole;
      const prevAccessLabel = userRoleLabels[employee.previousUserRole] || employee.previousUserRole;

      const subject = `Congratulations on Your Promotion, ${employee.firstName}!`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">Promotion Notification</h2>
            <p style="color: #e9d5ff; margin: 8px 0 0; font-size: 14px;">Your role has been updated</p>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; margin: 0 0 16px; font-size: 16px;">
              Congratulations <strong>${employee.firstName} ${employee.lastName}</strong>! Your role has been updated by the Director.
            </p>

            <div style="background: #f5f3ff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #7c3aed;">
              <h3 style="color: #5b21b6; margin: 0 0 12px; font-size: 16px;">Role Change Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 160px;">Previous Designation:</td>
                  <td style="padding: 8px 0; color: #111827;">${employee.previousRoleName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">New Designation:</td>
                  <td style="padding: 8px 0; color: #7c3aed; font-weight: 600;">${promotion.newRoleName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Previous Access Level:</td>
                  <td style="padding: 8px 0; color: #111827;">${prevAccessLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">New Access Level:</td>
                  <td style="padding: 8px 0; color: #7c3aed; font-weight: 600;">${newAccessLabel}</td>
                </tr>
                ${promotion.newSalary ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Updated Salary:</td>
                  <td style="padding: 8px 0; color: #059669; font-weight: 600;">₹${promotion.newSalary.toLocaleString()}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">
              Your dashboard has been updated with new features and responsibilities corresponding to your new role. Please log in to explore your updated access.
            </p>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${frontendUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      `;

      // Send email
      try {
        await this.transporter.sendMail({
          from: this.configService.get('EMAIL_FROM'),
          to: employee.email,
          subject,
          html,
        });
      } catch (emailError) {
        console.error('Failed to send promotion email:', emailError);
      }

      // Create in-app notification
      await this.prisma.notification.create({
        data: {
          recipientId: employee.userId,
          subject,
          message: `You have been promoted from ${employee.previousRoleName} to ${promotion.newRoleName}. Your access level is now ${newAccessLabel}.`,
          type: NotificationType.PROMOTION,
          channel: NotificationChannel.BOTH,
          metadata: {
            employeeId: employee.id,
            previousRoleName: employee.previousRoleName,
            previousUserRole: employee.previousUserRole,
            newRoleName: promotion.newRoleName,
            newUserRole: promotion.newUserRole,
            newSalary: promotion.newSalary,
          },
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to send promotion notification:', error);
    }
  }

  async sendRewardNotificationEmail(employeeEmail: string, amount: number, badgeName: string, reason: string) {
    const subject = 'Reward Received!';
    const html = `
      <h2>Congratulations!</h2>
      <p>You have received a reward:</p>
      ${amount ? `<p><strong>Amount:</strong> $${amount}</p>` : ''}
      ${badgeName ? `<p><strong>Badge:</strong> ${badgeName}</p>` : ''}
      <p><strong>Reason:</strong> ${reason}</p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to: employeeEmail,
      subject,
      html,
    });

    await this.createNotification(employeeEmail, subject, html, 'email');
  }

  /**
   * Notify HR to release onboarding documents for a new employee
   */
  async notifyHRNewEmployeeOnboarding(employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    joinDate: Date;
  }) {
    try {
      // Get all HR_HEAD users to notify
      const hrUsers = await this.prisma.user.findMany({
        where: {
          role: 'HR_HEAD',
          isActive: true,
        },
      });

      if (hrUsers.length === 0) {
        console.warn('[Notification] No active HR_HEAD users found to notify about new employee');
        return;
      }

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const formattedJoinDate = employee.joinDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const subject = `New Employee Onboarding: ${employee.firstName} ${employee.lastName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">New Employee Onboarding Required</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; margin: 0 0 16px;">A new employee has been added and requires onboarding documents.</p>

            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <h3 style="color: #111827; margin: 0 0 12px; font-size: 16px;">Employee Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${employee.firstName} ${employee.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0; color: #111827;">${employee.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Role:</td>
                  <td style="padding: 8px 0; color: #111827;">${employee.roleName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Join Date:</td>
                  <td style="padding: 8px 0; color: #111827;">${formattedJoinDate}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
              <h4 style="color: #92400e; margin: 0 0 8px; font-size: 14px;">Documents Required</h4>
              <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 13px;">
                <li>Offer Letter</li>
                <li>Employment Contract</li>
                <li>Company Policy Document</li>
                <li>ID Card Request Form</li>
                <li>IT Equipment Allocation Form</li>
              </ul>
            </div>

            <a href="${frontendUrl}/dashboard/hr/onboarding" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Onboarding Tasks
            </a>
          </div>
        </div>
      `;

      // Send notifications to all HR users
      for (const hrUser of hrUsers) {
        // Send email
        try {
          await this.transporter.sendMail({
            from: this.configService.get('EMAIL_FROM'),
            to: hrUser.email,
            subject,
            html,
          });
        } catch (emailError) {
          console.error(`Failed to send onboarding email to HR ${hrUser.email}:`, emailError);
        }

        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            recipientId: hrUser.id,
            subject,
            message: `New employee ${employee.firstName} ${employee.lastName} (${employee.roleName}) joined on ${formattedJoinDate}. Please release onboarding documents including offer letter and employment contract.`,
            type: NotificationType.NEW_EMPLOYEE_ONBOARDING,
            channel: NotificationChannel.BOTH,
            metadata: {
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              employeeEmail: employee.email,
              roleName: employee.roleName,
              joinDate: employee.joinDate,
              documentsRequired: [
                'Offer Letter',
                'Employment Contract',
                'Company Policy Document',
                'ID Card Request Form',
                'IT Equipment Allocation Form',
              ],
            },
            sentAt: new Date(),
          },
        });
      }

      console.log(`[Notification] Notified ${hrUsers.length} HR user(s) about new employee: ${employee.firstName} ${employee.lastName}`);
    } catch (error) {
      console.error('Failed to notify HR about new employee onboarding:', error);
    }
  }

  async sendNotification(params: {
    recipientId: string;
    subject: string;
    message: string;
    type: 'email' | 'in-app' | 'both';
  }) {
    const { recipientId, subject, message, type } = params;

    // Create in-app notification
    if (type === 'in-app' || type === 'both') {
      await this.createNotification(recipientId, subject, message, 'in-app');
    }

    // Send email notification
    if (type === 'email' || type === 'both') {
      try {
        // Try to get email from user
        const user = await this.prisma.user.findUnique({
          where: { id: recipientId },
        });

        if (user?.email) {
          await this.transporter.sendMail({
            from: this.configService.get('EMAIL_FROM'),
            to: user.email,
            subject,
            html: `
              <h2>${subject}</h2>
              <p>${message}</p>
            `,
          });
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async createNotification(recipientEmail: string, subject: string, message: string, type: string) {
    try {
      // Look up user by email to get user ID
      const user = await this.prisma.user.findUnique({
        where: { email: recipientEmail },
      });

      if (!user) {
        console.error('User not found for email:', recipientEmail);
        return;
      }

      // Map old string types to new NotificationType enums
      const typeMap: Record<string, NotificationType> = {
        'email': NotificationType.WELCOME,
        'in-app': NotificationType.WELCOME,
        'both': NotificationType.WELCOME,
      };

      await this.prisma.notification.create({
        data: {
          recipientId: user.id,
          subject,
          message: this.stripHtml(message),
          type: typeMap[type] || NotificationType.WELCOME,
          channel: NotificationChannel.EMAIL,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  private async getHRHeadEmail(): Promise<string | null> {
    const hrHead = await this.prisma.user.findFirst({
      where: { role: 'HR_HEAD', isActive: true },
    });
    return hrHead?.email || null;
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Company-wide Notification Methods

  async notifyAllEmployees(
    subject: string,
    message: string,
    type: NotificationType = NotificationType.POLICY_UPDATE,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // Get all active users
      const activeUsers = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, email: true },
      });

      if (activeUsers.length === 0) return;

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">Company Policy Update</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h3 style="color: #111827; margin: 0 0 12px;">${subject}</h3>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">${message}</p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <p style="color: #6b7280; font-size: 13px; margin: 0;">
                This change has been made by the Director and is effective immediately. Please review the updated settings in your dashboard.
              </p>
            </div>
            <a href="${frontendUrl}/dashboard" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Dashboard
            </a>
          </div>
        </div>
      `;

      // Create in-app notifications in bulk
      await this.prisma.notification.createMany({
        data: activeUsers.map((user) => ({
          recipientId: user.id,
          subject,
          message,
          type,
          channel: NotificationChannel.BOTH,
          metadata: metadata || {},
          sentAt: new Date(),
        })),
      });

      // Send emails (non-blocking, don't fail the whole operation)
      for (const user of activeUsers) {
        try {
          await this.transporter.sendMail({
            from: this.configService.get('EMAIL_FROM'),
            to: user.email,
            subject: `[Company Update] ${subject}`,
            html,
          });
        } catch (emailError) {
          console.error(`Failed to send policy update email to ${user.email}:`, emailError);
        }
      }

      console.log(`[PolicyUpdate] Notified ${activeUsers.length} employees: ${subject}`);
    } catch (error) {
      console.error('Failed to notify all employees:', error);
    }
  }

  // Recruitment Notification Methods

  async notifyInterviewerAssigned(
    interviewerId: string,
    driveId: string,
  ): Promise<void> {
    try {
      // Get interviewer and drive details
      const interviewer = await this.prisma.employee.findUnique({
        where: { id: interviewerId },
        include: { user: true },
      });

      if (!interviewer?.user) {
        console.error('Interviewer user not found:', interviewerId);
        return;
      }

      const drive = await this.prisma.placementDrive.findUnique({
        where: { id: driveId },
        include: { students: true },
      });

      if (!drive) {
        console.error('Drive not found:', driveId);
        return;
      }

      const roles = drive.roles as unknown as DriveRole[];
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const template = interviewerAssignedTemplate(
        `${interviewer.firstName} ${interviewer.lastName}`,
        drive.collegeName,
        drive.driveDate.toLocaleDateString(),
        roles,
        drive.students.length,
        frontendUrl,
        driveId,
      );

      // Send email
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM'),
        to: interviewer.user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      // Create in-app notification
      await this.prisma.notification.create({
        data: {
          recipientId: interviewer.user.id,
          subject: template.subject,
          message: `You've been assigned to ${drive.collegeName} placement drive on ${drive.driveDate.toLocaleDateString()}`,
          type: NotificationType.INTERVIEWER_ASSIGNED,
          channel: NotificationChannel.BOTH,
          metadata: {
            driveId,
            collegeName: drive.collegeName,
            driveDate: drive.driveDate,
            studentCount: drive.students.length,
          },
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to notify interviewer assignment:', error);
    }
  }

  async notifyInterviewersAssigned(
    interviewerIds: string[],
    driveId: string,
  ): Promise<void> {
    for (const interviewerId of interviewerIds) {
      await this.notifyInterviewerAssigned(interviewerId, driveId);
    }
  }

  async notifyStudentAdded(
    driveId: string,
    addedCount: number,
  ): Promise<void> {
    try {
      // Get drive details
      const drive = await this.prisma.placementDrive.findUnique({
        where: { id: driveId },
        include: {
          students: true,
          interviewers: {
            include: {
              interviewer: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (!drive) {
        console.error('Drive not found:', driveId);
        return;
      }

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      // Notify all assigned interviewers
      for (const assignment of drive.interviewers) {
        const interviewer = assignment.interviewer;
        if (!interviewer.user) continue;

        const template = studentAddedTemplate(
          `${interviewer.firstName} ${interviewer.lastName}`,
          drive.collegeName,
          drive.driveDate.toLocaleDateString(),
          drive.students.length,
          addedCount,
          frontendUrl,
          driveId,
        );

        // Send email
        await this.transporter.sendMail({
          from: this.configService.get('EMAIL_FROM'),
          to: interviewer.user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            recipientId: interviewer.user.id,
            subject: template.subject,
            message: `${addedCount} new student(s) added to ${drive.collegeName} placement drive`,
            type: NotificationType.STUDENT_ADDED,
            channel: NotificationChannel.BOTH,
            metadata: {
              driveId,
              collegeName: drive.collegeName,
              addedCount,
              totalStudents: drive.students.length,
            },
            sentAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to notify student addition:', error);
    }
  }

  async notifyDriveUpdated(
    driveId: string,
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
  ): Promise<void> {
    try {
      // Get drive details
      const drive = await this.prisma.placementDrive.findUnique({
        where: { id: driveId },
        include: {
          interviewers: {
            include: {
              interviewer: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (!drive) {
        console.error('Drive not found:', driveId);
        return;
      }

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      // Notify all assigned interviewers
      for (const assignment of drive.interviewers) {
        const interviewer = assignment.interviewer;
        if (!interviewer.user) continue;

        const template = driveUpdatedTemplate(
          `${interviewer.firstName} ${interviewer.lastName}`,
          drive.collegeName,
          changes,
          frontendUrl,
          driveId,
        );

        // Send email
        await this.transporter.sendMail({
          from: this.configService.get('EMAIL_FROM'),
          to: interviewer.user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            recipientId: interviewer.user.id,
            subject: template.subject,
            message: `Placement drive for ${drive.collegeName} has been updated`,
            type: NotificationType.DRIVE_UPDATE,
            channel: NotificationChannel.BOTH,
            metadata: {
              driveId,
              collegeName: drive.collegeName,
              changes,
            },
            sentAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Failed to notify drive update:', error);
    }
  }

  // Document Verification Notification Methods

  /**
   * Notify HR when an employee uploads a document for background verification
   */
  async notifyHRDocumentUploadedForVerification(employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }, documentType: string, fileName: string) {
    try {
      // Get all HR_HEAD users to notify
      const hrUsers = await this.prisma.user.findMany({
        where: {
          role: 'HR_HEAD',
          isActive: true,
        },
      });

      if (hrUsers.length === 0) {
        console.warn('[Notification] No active HR_HEAD users found to notify about document upload');
        return;
      }

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const formattedDocType = documentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const subject = `Document Verification Required: ${formattedDocType}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">Document Verification Required</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; margin: 0 0 16px;">An employee has uploaded a document for background verification.</p>

            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <h3 style="color: #111827; margin: 0 0 12px; font-size: 16px;">Document Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 120px;">Employee:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${employee.firstName} ${employee.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0; color: #111827;">${employee.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Document Type:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${formattedDocType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">File Name:</td>
                  <td style="padding: 8px 0; color: #111827;">${fileName}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>Action Required:</strong> Please review and verify this document as part of the employee's background verification process.
              </p>
            </div>

            <a href="${frontendUrl}/dashboard/documents" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Review Document
            </a>
          </div>
        </div>
      `;

      // Send notifications to all HR users
      for (const hrUser of hrUsers) {
        // Send email
        try {
          await this.transporter.sendMail({
            from: this.configService.get('EMAIL_FROM'),
            to: hrUser.email,
            subject,
            html,
          });
        } catch (emailError) {
          console.error(`Failed to send document verification email to HR ${hrUser.email}:`, emailError);
        }

        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            recipientId: hrUser.id,
            subject,
            message: `${employee.firstName} ${employee.lastName} has uploaded a ${formattedDocType} for background verification. Please review and verify the document.`,
            type: NotificationType.DOCUMENT_VERIFICATION_PENDING,
            channel: NotificationChannel.BOTH,
            metadata: {
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              employeeEmail: employee.email,
              documentType,
              fileName,
            },
            sentAt: new Date(),
          },
        });
      }

      console.log(`[Notification] Notified ${hrUsers.length} HR user(s) about document verification: ${formattedDocType} from ${employee.firstName} ${employee.lastName}`);
    } catch (error) {
      console.error('Failed to notify HR about document verification:', error);
    }
  }

  /**
   * Notify employee when their document is verified or rejected
   */
  async notifyEmployeeDocumentVerified(employee: {
    userId: string;
    email: string;
    firstName: string;
  }, documentType: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const formattedDocType = documentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const isVerified = status === 'VERIFIED';

      const subject = isVerified
        ? `Document Verified: ${formattedDocType}`
        : `Document Rejected: ${formattedDocType}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${isVerified ? '#22c55e, #16a34a' : '#ef4444, #dc2626'}); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">Document ${isVerified ? 'Verified' : 'Rejected'}</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; margin: 0 0 16px;">Hello ${employee.firstName},</p>

            <p style="color: #374151; margin: 0 0 16px;">
              Your <strong>${formattedDocType}</strong> document has been <strong style="color: ${isVerified ? '#16a34a' : '#dc2626'};">${status.toLowerCase()}</strong> by HR.
            </p>

            ${!isVerified && rejectionReason ? `
            <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #ef4444;">
              <p style="color: #991b1b; font-size: 13px; margin: 0;">
                <strong>Reason for Rejection:</strong> ${rejectionReason}
              </p>
              <p style="color: #991b1b; font-size: 13px; margin: 12px 0 0 0;">
                Please upload a new document addressing the above issue.
              </p>
            </div>
            ` : ''}

            ${isVerified ? `
            <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #22c55e;">
              <p style="color: #166534; font-size: 13px; margin: 0;">
                Your document has been successfully verified as part of your background verification process.
              </p>
            </div>
            ` : ''}

            <a href="${frontendUrl}/dashboard/documents" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Documents
            </a>
          </div>
        </div>
      `;

      // Send email
      try {
        await this.transporter.sendMail({
          from: this.configService.get('EMAIL_FROM'),
          to: employee.email,
          subject,
          html,
        });
      } catch (emailError) {
        console.error(`Failed to send document verification email to ${employee.email}:`, emailError);
      }

      // Create in-app notification
      const message = isVerified
        ? `Your ${formattedDocType} has been verified by HR.`
        : `Your ${formattedDocType} has been rejected. Reason: ${rejectionReason || 'Not specified'}. Please upload a new document.`;

      await this.prisma.notification.create({
        data: {
          recipientId: employee.userId,
          subject,
          message,
          type: NotificationType.DOCUMENT_VERIFIED,
          channel: NotificationChannel.BOTH,
          metadata: {
            documentType,
            status,
            rejectionReason: rejectionReason || null,
          },
          sentAt: new Date(),
        },
      });

      console.log(`[Notification] Notified ${employee.email} about document ${status.toLowerCase()}: ${formattedDocType}`);
    } catch (error) {
      console.error('Failed to notify employee about document verification:', error);
    }
  }

  // Resignation Notification Methods

  /**
   * Notify Manager and HR when an employee submits a resignation
   */
  async notifyResignationSubmitted(employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
    managerId?: string;
  }, resignation: {
    reason: string;
    lastWorkingDay: Date;
    noticePeriodDays: number;
  }) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      const lastWorkingDayFormatted = resignation.lastWorkingDay.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const subject = `Resignation Submitted: ${employee.firstName} ${employee.lastName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">Resignation Notice</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; margin: 0 0 16px;">An employee has submitted their resignation and requires your attention.</p>

            <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #ef4444;">
              <h3 style="color: #991b1b; margin: 0 0 12px; font-size: 16px;">Employee Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 140px;">Name:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${employee.firstName} ${employee.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0; color: #111827;">${employee.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Role:</td>
                  <td style="padding: 8px 0; color: #111827;">${employee.roleName}</td>
                </tr>
              </table>
            </div>

            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <h3 style="color: #111827; margin: 0 0 12px; font-size: 16px;">Resignation Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 140px;">Last Working Day:</td>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${lastWorkingDayFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Notice Period:</td>
                  <td style="padding: 8px 0; color: #111827;">${resignation.noticePeriodDays} days</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Reason:</td>
                  <td style="padding: 8px 0; color: #111827;">${resignation.reason}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>Action Required:</strong> Please review and process this resignation request at your earliest convenience.
              </p>
            </div>

            <a href="${frontendUrl}/dashboard/resignation/manage" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Review Resignation
            </a>
          </div>
        </div>
      `;

      // Notify Manager if exists
      if (employee.managerId) {
        const manager = await this.prisma.employee.findUnique({
          where: { id: employee.managerId },
          include: { user: true },
        });

        if (manager?.user) {
          // Send email to manager
          try {
            await this.transporter.sendMail({
              from: this.configService.get('EMAIL_FROM'),
              to: manager.user.email,
              subject,
              html,
            });
          } catch (emailError) {
            console.error(`Failed to send resignation email to manager ${manager.user.email}:`, emailError);
          }

          // Create in-app notification for manager
          await this.prisma.notification.create({
            data: {
              recipientId: manager.userId,
              subject,
              message: `${employee.firstName} ${employee.lastName} has submitted their resignation. Last working day: ${lastWorkingDayFormatted}. Reason: ${resignation.reason}`,
              type: NotificationType.RESIGNATION_SUBMITTED,
              channel: NotificationChannel.BOTH,
              metadata: {
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                employeeEmail: employee.email,
                roleName: employee.roleName,
                lastWorkingDay: resignation.lastWorkingDay,
                reason: resignation.reason,
                noticePeriodDays: resignation.noticePeriodDays,
              },
              sentAt: new Date(),
            },
          });

          console.log(`[Notification] Notified manager ${manager.firstName} ${manager.lastName} about resignation`);
        }
      }

      // Notify all HR_HEAD and DIRECTOR users
      const hrUsers = await this.prisma.user.findMany({
        where: {
          role: { in: ['HR_HEAD', 'DIRECTOR'] },
          isActive: true,
        },
      });

      for (const hrUser of hrUsers) {
        // Send email
        try {
          await this.transporter.sendMail({
            from: this.configService.get('EMAIL_FROM'),
            to: hrUser.email,
            subject,
            html,
          });
        } catch (emailError) {
          console.error(`Failed to send resignation email to HR ${hrUser.email}:`, emailError);
        }

        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            recipientId: hrUser.id,
            subject,
            message: `${employee.firstName} ${employee.lastName} (${employee.roleName}) has submitted their resignation. Last working day: ${lastWorkingDayFormatted}.`,
            type: NotificationType.RESIGNATION_SUBMITTED,
            channel: NotificationChannel.BOTH,
            metadata: {
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              employeeEmail: employee.email,
              roleName: employee.roleName,
              lastWorkingDay: resignation.lastWorkingDay,
              reason: resignation.reason,
              noticePeriodDays: resignation.noticePeriodDays,
            },
            sentAt: new Date(),
          },
        });
      }

      console.log(`[Notification] Notified ${hrUsers.length} HR user(s) about resignation from ${employee.firstName} ${employee.lastName}`);
    } catch (error) {
      console.error('Failed to notify about resignation submission:', error);
    }
  }

  /**
   * Notify employee when their resignation status changes
   */
  async notifyResignationStatusChange(employee: {
    userId: string;
    email: string;
    firstName: string;
  }, status: 'APPROVED' | 'REJECTED' | 'PENDING_HR', details: {
    lastWorkingDay?: Date;
    rejectionReason?: string;
    approvedBy?: string;
  }) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      let subject: string;
      let statusColor: string;
      let statusBgColor: string;
      let message: string;
      let actionText: string;

      switch (status) {
        case 'APPROVED':
          subject = 'Resignation Approved';
          statusColor = '#16a34a';
          statusBgColor = '#dcfce7';
          const lastWorkingDayFormatted = details.lastWorkingDay?.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          message = `Your resignation has been approved. Your last working day is <strong>${lastWorkingDayFormatted}</strong>.`;
          actionText = 'We wish you all the best in your future endeavors.';
          break;
        case 'REJECTED':
          subject = 'Resignation Request Rejected';
          statusColor = '#dc2626';
          statusBgColor = '#fee2e2';
          message = `Your resignation request has been rejected.`;
          actionText = details.rejectionReason ? `Reason: ${details.rejectionReason}` : 'Please contact HR for more information.';
          break;
        case 'PENDING_HR':
          subject = 'Resignation Pending HR Approval';
          statusColor = '#d97706';
          statusBgColor = '#fef3c7';
          message = 'Your resignation has been approved by your manager and is now pending HR approval.';
          actionText = 'You will be notified once HR processes your request.';
          break;
        default:
          return;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${statusColor}, ${statusColor}cc); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">${subject}</h2>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; margin: 0 0 16px;">Hello ${employee.firstName},</p>

            <div style="background: ${statusBgColor}; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid ${statusColor};">
              <p style="color: #111827; font-size: 14px; margin: 0;">${message}</p>
              <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0 0;">${actionText}</p>
            </div>

            <a href="${frontendUrl}/dashboard/resignation" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Resignation Status
            </a>
          </div>
        </div>
      `;

      // Send email
      try {
        await this.transporter.sendMail({
          from: this.configService.get('EMAIL_FROM'),
          to: employee.email,
          subject,
          html,
        });
      } catch (emailError) {
        console.error(`Failed to send resignation status email to ${employee.email}:`, emailError);
      }

      // Create in-app notification
      const notificationMessage = status === 'APPROVED'
        ? `Your resignation has been approved. Last working day: ${details.lastWorkingDay?.toLocaleDateString()}.`
        : status === 'REJECTED'
          ? `Your resignation has been rejected. ${details.rejectionReason || ''}`
          : 'Your resignation is pending HR approval.';

      await this.prisma.notification.create({
        data: {
          recipientId: employee.userId,
          subject,
          message: notificationMessage,
          type: NotificationType.RESIGNATION_STATUS,
          channel: NotificationChannel.BOTH,
          metadata: {
            status,
            lastWorkingDay: details.lastWorkingDay || null,
            rejectionReason: details.rejectionReason || null,
          },
          sentAt: new Date(),
        },
      });

      console.log(`[Notification] Notified ${employee.email} about resignation status: ${status}`);
    } catch (error) {
      console.error('Failed to notify employee about resignation status:', error);
    }
  }

  // Scheduled task: Run daily at 9 AM to send drive reminders
  @Cron('0 9 * * *')
  async sendDriveReminders(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Get all drives happening tomorrow
      const upcomingDrives = await this.prisma.placementDrive.findMany({
        where: {
          driveDate: {
            gte: tomorrow,
            lte: tomorrowEnd,
          },
        },
        include: {
          interviewers: {
            include: {
              interviewer: {
                include: { user: true },
              },
            },
          },
          students: true,
        },
      });

      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      // Send reminder to each interviewer for each drive
      for (const drive of upcomingDrives) {
        const roles = drive.roles as unknown as DriveRole[];

        for (const assignment of drive.interviewers) {
          const interviewer = assignment.interviewer;
          if (!interviewer.user) continue;

          const template = driveReminderTemplate(
            `${interviewer.firstName} ${interviewer.lastName}`,
            drive.collegeName,
            drive.driveDate.toLocaleDateString(),
            roles,
            drive.students.length,
            frontendUrl,
            drive.id,
          );

          // Send email
          await this.transporter.sendMail({
            from: this.configService.get('EMAIL_FROM'),
            to: interviewer.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });

          // Create in-app notification
          await this.prisma.notification.create({
            data: {
              recipientId: interviewer.user.id,
              subject: template.subject,
              message: `Reminder: Placement drive at ${drive.collegeName} is tomorrow`,
              type: NotificationType.DRIVE_REMINDER,
              channel: NotificationChannel.BOTH,
              metadata: {
                driveId: drive.id,
                collegeName: drive.collegeName,
                driveDate: drive.driveDate,
                studentCount: drive.students.length,
              },
              sentAt: new Date(),
            },
          });
        }
      }

      console.log(`Sent drive reminders for ${upcomingDrives.length} drive(s)`);
    } catch (error) {
      console.error('Failed to send drive reminders:', error);
    }
  }
}
