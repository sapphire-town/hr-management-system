import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  UploadDocumentDto,
  UploadVerificationDocumentDto,
  VerifyDocumentDto,
  ReleaseDocumentDto,
  DocumentFilterDto,
} from './dto/document.dto';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // Employee Documents (released by HR)
  async getMyDocuments(employeeId: string) {
    return this.prisma.document.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async releaseDocument(dto: ReleaseDocumentDto, releasedBy: string, filePath: string, fileName: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const document = await this.prisma.document.create({
      data: {
        employeeId: dto.employeeId,
        documentType: dto.documentType,
        fileName,
        filePath,
        description: dto.description,
        releasedBy,
        releasedAt: new Date(),
      },
    });

    // Send notification to employee
    await this.notificationService.sendNotification({
      recipientId: employee.userId,
      subject: 'New Document Released',
      message: `A new ${dto.documentType.replace('_', ' ')} has been released to you.`,
      type: 'both',
    });

    return document;
  }

  async downloadDocument(documentId: string, employeeId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.employeeId !== employeeId) {
      throw new ForbiddenException('You do not have access to this document');
    }

    // Increment download count
    await this.prisma.document.update({
      where: { id: documentId },
      data: { downloadCount: { increment: 1 } },
    });

    return document;
  }

  async getAllDocuments(filters: DocumentFilterDto) {
    const where: any = {};

    if (filters.documentType) {
      where.documentType = filters.documentType;
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    return this.prisma.document.findMany({
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

  // Document Verification (uploaded by employees for verification)
  async uploadForVerification(
    employeeId: string,
    dto: UploadVerificationDocumentDto,
    filePath: string,
    fileName: string,
  ) {
    // Check if document of same type already exists
    const existing = await this.prisma.documentVerification.findFirst({
      where: {
        employeeId,
        documentType: dto.documentType,
        status: { in: ['UPLOADED', 'UNDER_REVIEW'] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'A document of this type is already pending verification',
      );
    }

    // Get employee details for notification
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    const document = await this.prisma.documentVerification.create({
      data: {
        employeeId,
        documentType: dto.documentType,
        fileName,
        filePath,
        status: 'UPLOADED',
      },
    });

    // Notify HR about the document upload for verification
    if (employee) {
      await this.notificationService.notifyHRDocumentUploadedForVerification(
        {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.user.email,
        },
        dto.documentType,
        fileName,
      );
    }

    return document;
  }

  async getMyVerificationDocuments(employeeId: string) {
    return this.prisma.documentVerification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingVerifications(filters: DocumentFilterDto) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { in: ['UPLOADED', 'UNDER_REVIEW'] };
    }

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.documentType) {
      where.documentType = filters.documentType;
    }

    return this.prisma.documentVerification.findMany({
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

  async verifyDocument(id: string, dto: VerifyDocumentDto, verifierId: string) {
    const document = await this.prisma.documentVerification.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (dto.status === 'REJECTED' && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.prisma.documentVerification.update({
      where: { id },
      data: {
        status: dto.status,
        verifiedBy: verifierId,
        verifiedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    // Send notification to employee about verification result
    await this.notificationService.notifyEmployeeDocumentVerified(
      {
        userId: document.employee.userId,
        email: document.employee.user.email,
        firstName: document.employee.firstName,
      },
      document.documentType,
      dto.status as 'VERIFIED' | 'REJECTED',
      dto.rejectionReason,
    );

    return updated;
  }

  async getDocumentStats() {
    const [totalDocuments, pendingVerifications, verifiedDocuments, rejectedDocuments] =
      await Promise.all([
        this.prisma.document.count(),
        this.prisma.documentVerification.count({
          where: { status: { in: ['UPLOADED', 'UNDER_REVIEW'] } },
        }),
        this.prisma.documentVerification.count({
          where: { status: 'VERIFIED' },
        }),
        this.prisma.documentVerification.count({
          where: { status: 'REJECTED' },
        }),
      ]);

    return {
      totalDocuments,
      pendingVerifications,
      verifiedDocuments,
      rejectedDocuments,
    };
  }

  async getDocumentTypes() {
    return [
      { value: 'offer_letter', label: 'Offer Letter' },
      { value: 'appointment_letter', label: 'Appointment Letter' },
      { value: 'id_proof', label: 'ID Proof' },
      { value: 'address_proof', label: 'Address Proof' },
      { value: 'education_certificate', label: 'Education Certificate' },
      { value: 'experience_letter', label: 'Experience Letter' },
      { value: 'salary_slip', label: 'Salary Slip' },
      { value: 'pan_card', label: 'PAN Card' },
      { value: 'aadhar_card', label: 'Aadhar Card' },
      { value: 'bank_statement', label: 'Bank Statement' },
      { value: 'nda', label: 'NDA' },
      { value: 'policy_acknowledgement', label: 'Policy Acknowledgement' },
      { value: 'other', label: 'Other' },
    ];
  }

  async getVerificationDocumentForView(id: string) {
    const document = await this.prisma.documentVerification.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }
}
