import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../common/prisma/prisma.service';

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
      await this.prisma.notification.create({
        data: {
          recipientId: recipientEmail,
          subject,
          message,
          type,
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
}
