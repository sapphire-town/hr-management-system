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
  Request,
  UseInterceptors,
  UploadedFiles,
  Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DailyReportService } from './daily-report.service';
import {
  CreateDailyReportDto,
  UpdateDailyReportDto,
  VerifyDailyReportDto,
  DailyReportFilterDto,
} from './dto/daily-report.dto';
import { ReportPerformanceFilterDto } from './dto/daily-report-performance.dto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import * as fs from 'fs';

// Configure multer storage
const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads', 'daily-reports');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  },
});

@ApiTags('Daily Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('daily-reports')
export class DailyReportController {
  constructor(private readonly dailyReportService: DailyReportService) {}

  // Employee endpoints

  @Get('my-params')
  @ApiOperation({ summary: 'Get my daily reporting parameters based on role' })
  async getMyReportingParams(@Request() req: any) {
    return this.dailyReportService.getMyReportingParams(req.user.employeeId);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a daily report' })
  async create(@Request() req: any, @Body() dto: CreateDailyReportDto) {
    return this.dailyReportService.create(req.user.employeeId, dto);
  }

  @Post('upload-attachments')
  @ApiOperation({ summary: 'Upload attachments for daily report' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        // Allow images, PDFs, and common document types
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      },
    }),
  )
  async uploadAttachments(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('paramKey') paramKey?: string,
  ) {
    const attachments = files.map((file) => ({
      fileName: file.originalname,
      filePath: `/uploads/daily-reports/${file.filename}`,
      paramKey: paramKey || null,
    }));

    return { attachments };
  }

  @Get('attachment/:filename')
  @ApiOperation({ summary: 'Download an attachment' })
  async downloadAttachment(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = join(process.cwd(), 'uploads', 'daily-reports', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    return res.sendFile(filePath);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my daily reports' })
  async getMyReports(@Request() req: any, @Query() filters: DailyReportFilterDto) {
    return this.dailyReportService.getMyReports(req.user.employeeId, filters);
  }

  @Get('today')
  @ApiOperation({ summary: "Get today's report" })
  async getTodayReport(@Request() req: any) {
    return this.dailyReportService.getTodayReport(req.user.employeeId);
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get my report statistics' })
  async getMyStats(@Request() req: any, @Query('month') month?: string) {
    return this.dailyReportService.getMyStats(req.user.employeeId, month);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a daily report' })
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateDailyReportDto,
  ) {
    return this.dailyReportService.update(id, req.user.employeeId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a daily report' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.dailyReportService.delete(id, req.user.employeeId);
  }

  // Manager endpoints

  @Get('team')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get team daily reports' })
  async getTeamReports(@Request() req: any, @Query() filters: DailyReportFilterDto) {
    return this.dailyReportService.getTeamReports(req.user.employeeId, filters);
  }

  @Get('team/pending')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get pending team reports for verification' })
  async getPendingTeamReports(@Request() req: any) {
    return this.dailyReportService.getPendingTeamReports(req.user.employeeId);
  }

  @Patch(':id/verify')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Verify a daily report' })
  async verify(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: VerifyDailyReportDto,
  ) {
    return this.dailyReportService.verify(id, req.user.employeeId, dto);
  }

  // Performance analytics endpoints (must be before :id catch-all)

  @Get('performance/my')
  @ApiOperation({ summary: 'Get my daily report performance analytics' })
  async getMyPerformance(
    @Request() req: any,
    @Query() filters: ReportPerformanceFilterDto,
  ) {
    return this.dailyReportService.getEmployeeReportPerformance(
      req.user.employeeId,
      filters,
    );
  }

  @Get('performance/employee/:employeeId')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get a specific employee\'s daily report performance' })
  async getEmployeePerformance(
    @Param('employeeId') employeeId: string,
    @Query() filters: ReportPerformanceFilterDto,
  ) {
    return this.dailyReportService.getEmployeeReportPerformance(
      employeeId,
      filters,
    );
  }

  @Get('performance/team')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get team daily report performance analytics' })
  async getTeamPerformance(
    @Request() req: any,
    @Query() filters: ReportPerformanceFilterDto,
  ) {
    return this.dailyReportService.getTeamReportPerformance(
      req.user.employeeId,
      filters,
    );
  }

  @Get('performance/all')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get all employees daily report performance' })
  async getAllPerformance(@Query() filters: ReportPerformanceFilterDto) {
    return this.dailyReportService.getAllEmployeesReportPerformance(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a daily report by ID' })
  async getById(@Param('id') id: string) {
    return this.dailyReportService.getById(id);
  }
}
