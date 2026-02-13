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
  BulkReleaseDocumentDto,
  DocumentFilterDto,
} from './dto/document.dto';
import { CreateDocumentTemplateDto, GenerateDocumentsDto } from './dto/document-template.dto';
import { DocumentStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

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

  async bulkReleaseDocument(
    dto: BulkReleaseDocumentDto,
    releasedBy: string,
    filePath: string,
    fileName: string,
  ) {
    const employeeIds = dto.employeeIds.split(',').map((id) => id.trim()).filter(Boolean);

    if (employeeIds.length === 0) {
      throw new BadRequestException('At least one employee ID is required');
    }

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { user: true },
    });

    if (employees.length === 0) {
      throw new NotFoundException('No valid employees found');
    }

    const now = new Date();
    const generated: any[] = [];
    const failed: { employeeId: string; error: string }[] = [];

    for (const employee of employees) {
      try {
        const document = await this.prisma.document.create({
          data: {
            employeeId: employee.id,
            documentType: dto.documentType,
            fileName,
            filePath,
            description: dto.description,
            releasedBy,
            releasedAt: now,
          },
        });

        await this.notificationService.sendNotification({
          recipientId: employee.userId,
          subject: 'New Document Released',
          message: `A new ${dto.documentType.replace(/_/g, ' ')} has been released to you.`,
          type: 'both',
        });

        generated.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          documentId: document.id,
        });
      } catch (err) {
        failed.push({
          employeeId: employee.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      generated: generated.length,
      failed: failed.length,
      documents: generated,
      ...(failed.length > 0 && { errors: failed }),
    };
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

  // ===== Document Template Methods =====

  getAvailablePlaceholders() {
    return [
      { key: 'firstName', description: 'Employee first name', example: 'John' },
      { key: 'lastName', description: 'Employee last name', example: 'Doe' },
      { key: 'fullName', description: 'Employee full name', example: 'John Doe' },
      { key: 'email', description: 'Employee email address', example: 'john@example.com' },
      { key: 'phone', description: 'Employee phone number', example: '+91 9876543210' },
      { key: 'address', description: 'Employee address', example: '123 Main St' },
      { key: 'dateOfBirth', description: 'Date of birth (DD/MM/YYYY)', example: '15/06/1990' },
      { key: 'gender', description: 'Employee gender', example: 'Male' },
      { key: 'joinDate', description: 'Joining date (DD/MM/YYYY)', example: '01/01/2024' },
      { key: 'designation', description: 'Employee designation/role', example: 'Software Engineer' },
      { key: 'employeeType', description: 'Employment type', example: 'FULL_TIME' },
      { key: 'salary', description: 'Employee salary', example: '50000' },
      { key: 'bankName', description: 'Bank name', example: 'State Bank of India' },
      { key: 'bankAccountNumber', description: 'Bank account number', example: '1234567890' },
      { key: 'ifscCode', description: 'Bank IFSC code', example: 'SBIN0001234' },
      { key: 'emergencyContactName', description: 'Emergency contact name', example: 'Jane Doe' },
      { key: 'emergencyContactPhone', description: 'Emergency contact phone', example: '+91 9876543211' },
      { key: 'companyName', description: 'Company name from settings', example: 'Acme Corp' },
      { key: 'currentDate', description: 'Current date (DD/MM/YYYY)', example: '13/02/2026' },
      { key: 'currentYear', description: 'Current year', example: '2026' },
    ];
  }

  async createTemplate(
    file: Express.Multer.File,
    dto: CreateDocumentTemplateDto,
    createdBy: string,
  ) {
    // Read the .docx file to extract placeholders
    const content = fs.readFileSync(file.path);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    });

    // Extract placeholders from the template text
    const text = doc.getFullText();
    const placeholderRegex = /\{(\w+)\}/g;
    const placeholders: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = placeholderRegex.exec(text)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }

    return this.prisma.documentTemplate.create({
      data: {
        name: dto.name,
        documentType: dto.documentType,
        description: dto.description,
        filePath: file.path,
        fileName: file.originalname,
        placeholders: placeholders,
        createdBy,
      },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async getAllTemplates() {
    return this.prisma.documentTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async deleteTemplate(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Delete the file
    if (fs.existsSync(template.filePath)) {
      fs.unlinkSync(template.filePath);
    }

    await this.prisma.documentTemplate.delete({ where: { id } });
    return { message: 'Template deleted successfully' };
  }

  async getTemplateFile(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async generateDocuments(
    templateId: string,
    dto: GenerateDocumentsDto,
    generatedBy: string,
  ) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Fetch all selected employees with relations
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: dto.employeeIds } },
      include: {
        role: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    if (employees.length === 0) {
      throw new NotFoundException('No valid employees found');
    }

    // Get company settings for companyName
    const settings = await this.prisma.companySettings.findFirst();
    const companyName = settings?.companyName || 'Company';

    // Read template file
    const templateContent = fs.readFileSync(template.filePath);

    const outputDir = './uploads/documents';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const now = new Date();
    const formatDate = (date: Date | null) => {
      if (!date) return '';
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const generated: any[] = [];
    const failed: { employeeId: string; error: string }[] = [];

    for (const employee of employees) {
      try {
        const zip = new PizZip(templateContent);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          delimiters: { start: '{', end: '}' },
        });

        // Build template data
        const data: Record<string, string> = {
          firstName: employee.firstName || '',
          lastName: employee.lastName || '',
          fullName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          email: employee.user?.email || '',
          phone: employee.phone || '',
          address: employee.address || '',
          dateOfBirth: formatDate(employee.dateOfBirth),
          gender: employee.gender || '',
          joinDate: formatDate(employee.joinDate),
          designation: employee.role?.name || '',
          employeeType: employee.employeeType || '',
          salary: employee.salary?.toString() || '',
          bankName: employee.bankName || '',
          bankAccountNumber: employee.bankAccountNumber || '',
          ifscCode: employee.bankIfsc || '',
          emergencyContactName: employee.emergencyContactName || '',
          emergencyContactPhone: employee.emergencyContactPhone || '',
          companyName,
          currentDate: formatDate(now),
          currentYear: now.getFullYear().toString(),
        };

        doc.render(data);

        const buf = doc.getZip().generate({
          type: 'nodebuffer',
          compression: 'DEFLATE',
        });

        // Save generated document
        const timestamp = Date.now();
        const safeFileName = `${template.documentType}-${employee.firstName}-${employee.lastName}-${timestamp}.docx`
          .replace(/\s+/g, '-');
        const outputPath = path.join(outputDir, safeFileName);
        fs.writeFileSync(outputPath, buf);

        // Create Document record
        const document = await this.prisma.document.create({
          data: {
            employeeId: employee.id,
            documentType: template.documentType,
            fileName: `${template.name} - ${employee.firstName} ${employee.lastName}.docx`,
            filePath: outputPath,
            description: `Auto-generated from template: ${template.name}`,
            releasedBy: generatedBy,
            releasedAt: now,
          },
        });

        // Send notification
        await this.notificationService.sendNotification({
          recipientId: employee.userId,
          subject: 'New Document Released',
          message: `A new ${template.documentType.replace(/_/g, ' ')} has been released to you.`,
          type: 'both',
        });

        generated.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          documentId: document.id,
        });
      } catch (err) {
        failed.push({
          employeeId: employee.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      templateName: template.name,
      generated: generated.length,
      failed: failed.length,
      documents: generated,
      ...(failed.length > 0 && { errors: failed }),
    };
  }
}
