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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ReimbursementService } from './reimbursement.service';
import {
  CreateReimbursementDto,
  ApproveReimbursementDto,
  RejectReimbursementDto,
  ReimbursementFilterDto,
} from './dto/reimbursement.dto';

const storage = diskStorage({
  destination: './uploads/receipts',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split('.').pop();
    cb(null, `receipt-${uniqueSuffix}.${ext}`);
  },
});

@ApiTags('Reimbursements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reimbursements')
export class ReimbursementController {
  constructor(private readonly reimbursementService: ReimbursementService) {}

  // Employee endpoints
  @Post('claim')
  @ApiOperation({ summary: 'Submit a new reimbursement claim' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('receipt', { storage }))
  async createClaim(
    @Request() req: any,
    @Body() dto: CreateReimbursementDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('Receipt is required');
    }
    return this.reimbursementService.createClaim(
      req.user.employeeId,
      dto,
      file.path,
    );
  }

  @Get('my-claims')
  @ApiOperation({ summary: 'Get my reimbursement claims' })
  async getMyClaims(@Request() req: any) {
    return this.reimbursementService.getMyClaims(req.user.employeeId);
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get my reimbursement statistics' })
  async getMyStats(@Request() req: any) {
    return this.reimbursementService.getMyStats(req.user.employeeId);
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge receipt of reimbursement' })
  async acknowledgeClaim(@Param('id') id: string, @Request() req: any) {
    return this.reimbursementService.acknowledgeClaim(id, req.user.employeeId);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Download receipt' })
  async downloadReceipt(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const claim = await this.reimbursementService.getClaimById(id);
    const file = createReadStream(join(process.cwd(), claim.receiptPath));
    const ext = claim.receiptPath.split('.').pop();
    res.set({
      'Content-Type': `image/${ext}`,
      'Content-Disposition': `inline; filename="receipt-${id}.${ext}"`,
    });
    return new StreamableFile(file);
  }

  // Manager endpoints
  @Get('team')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get team reimbursement claims' })
  async getTeamClaims(@Request() req: any, @Query() filters: ReimbursementFilterDto) {
    return this.reimbursementService.getTeamClaims(req.user.employeeId, filters);
  }

  @Patch(':id/manager-approve')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Manager approve reimbursement claim' })
  async managerApprove(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ApproveReimbursementDto,
  ) {
    return this.reimbursementService.managerApprove(id, req.user.employeeId, dto);
  }

  @Patch(':id/manager-reject')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Manager reject reimbursement claim' })
  async managerReject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: RejectReimbursementDto,
  ) {
    return this.reimbursementService.managerReject(id, req.user.employeeId, dto);
  }

  // HR endpoints
  @Get('categories')
  @ApiOperation({ summary: 'Get expense categories' })
  async getCategories() {
    return this.reimbursementService.getCategories();
  }

  @Get('stats')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get reimbursement statistics' })
  async getStats() {
    return this.reimbursementService.getReimbursementStats();
  }

  @Get('pending')
  @Roles(UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get pending reimbursement claims' })
  async getPendingClaims(@Request() req: any, @Query() filters: ReimbursementFilterDto) {
    return this.reimbursementService.getPendingClaims(filters, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reimbursement claim by ID' })
  async getClaimById(@Param('id') id: string) {
    return this.reimbursementService.getClaimById(id);
  }

  @Patch(':id/hr-approve')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'HR approve reimbursement claim' })
  async hrApprove(@Param('id') id: string, @Body() dto: ApproveReimbursementDto) {
    return this.reimbursementService.hrApprove(id, dto);
  }

  @Patch(':id/hr-reject')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'HR reject reimbursement claim' })
  async hrReject(@Param('id') id: string, @Body() dto: RejectReimbursementDto) {
    return this.reimbursementService.hrReject(id, dto);
  }

  @Patch(':id/process-payment')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Process reimbursement payment' })
  async processPayment(@Param('id') id: string) {
    return this.reimbursementService.processPayment(id);
  }
}
