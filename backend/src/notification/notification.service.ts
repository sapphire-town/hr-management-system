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

  async sendWelcomeEmail(email: string, password: string, firstName: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const mailOptions = {
      from: this.configService.get('EMAIL_FROM'),
      to: email,
      subject: 'Welcome to HR Management System',
      html: `
        <h1>Welcome ${firstName}!</h1>
        <p>Your account has been created successfully.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
        <p>Please login and change your password immediately.</p>
        <p><a href="${frontendUrl}/auth/login">Login Here</a></p>
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
          message,
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
