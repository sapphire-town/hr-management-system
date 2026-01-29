import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DocumentService } from './document.service';
import {
  UploadVerificationDocumentDto,
  VerifyDocumentDto,
  ReleaseDocumentDto,
  DocumentFilterDto,
} from './dto/document.dto';

// Ensure uploads directory exists
const uploadsDir = './uploads/documents';
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const storage = diskStorage({
  destination: './uploads/documents',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split('.').pop();
    cb(null, `${uniqueSuffix}.${ext}`);
  },
});

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // Employee endpoints
  @Get('my-documents')
  @ApiOperation({ summary: 'Get my released documents' })
  async getMyDocuments(@Request() req: any) {
    return this.documentService.getMyDocuments(req.user.employeeId);
  }

  @Get('my-documents/:id/download')
  @ApiOperation({ summary: 'Download a document' })
  async downloadDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const document = await this.documentService.downloadDocument(id, req.user.employeeId);
    const file = createReadStream(join(process.cwd(), document.filePath));
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
    });
    return new StreamableFile(file);
  }

  // Document verification endpoints (for employees to upload)
  @Post('verification/upload')
  @ApiOperation({ summary: 'Upload document for verification' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadForVerification(
    @Request() req: any,
    @Body() dto: UploadVerificationDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentService.uploadForVerification(
      req.user.employeeId,
      dto,
      file.path,
      file.originalname,
    );
  }

  @Get('verification/my-documents')
  @ApiOperation({ summary: 'Get my verification documents' })
  async getMyVerificationDocuments(@Request() req: any) {
    return this.documentService.getMyVerificationDocuments(req.user.employeeId);
  }

  // HR endpoints
  @Get('types')
  @ApiOperation({ summary: 'Get document types' })
  async getDocumentTypes() {
    return this.documentService.getDocumentTypes();
  }

  @Get('stats')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get document statistics' })
  async getStats() {
    return this.documentService.getDocumentStats();
  }

  @Get('all')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get all released documents' })
  async getAllDocuments(@Query() filters: DocumentFilterDto) {
    return this.documentService.getAllDocuments(filters);
  }

  @Post('release')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Release document to employee' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async releaseDocument(
    @Request() req: any,
    @Body() dto: ReleaseDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentService.releaseDocument(
      dto,
      req.user.employeeId,
      file.path,
      file.originalname,
    );
  }

  @Get('verification/pending')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get pending verification documents' })
  async getPendingVerifications(@Query() filters: DocumentFilterDto) {
    return this.documentService.getPendingVerifications(filters);
  }

  @Get('verification/:id/view')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'View/download a verification document' })
  async viewVerificationDocument(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const document = await this.documentService.getVerificationDocumentForView(id);
    const filePath = join(process.cwd(), document.filePath);

    if (!existsSync(filePath)) {
      throw new BadRequestException('File not found on server');
    }

    const file = createReadStream(filePath);
    const ext = document.fileName.split('.').pop()?.toLowerCase();

    // Set content type based on file extension
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
    };

    res.set({
      'Content-Type': contentTypes[ext || ''] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${document.fileName}"`,
    });
    return new StreamableFile(file);
  }

  @Patch('verification/:id/verify')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Verify or reject a document' })
  async verifyDocument(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @Request() req: any,
  ) {
    return this.documentService.verifyDocument(id, dto, req.user.employeeId);
  }
}
