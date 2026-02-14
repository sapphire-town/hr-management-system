import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import {
  UpdateCompanySettingsDto,
  UpdateLeavePoliciesDto,
  UpdateNotificationPreferencesDto,
  UpdatePayslipTemplateDto,
} from './dto/settings.dto';

const logoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads', 'company');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get company settings' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Get('working-days')
  @ApiOperation({ summary: 'Get configured working days (all authenticated users)' })
  async getWorkingDays() {
    const settings = await this.settingsService.getSettings();
    return {
      workingDays: settings.workingDays ?? [1, 2, 3, 4, 5],
    };
  }

  @Get('payslip-template')
  @ApiOperation({ summary: 'Get payslip template config (all authenticated users)' })
  async getPayslipTemplate() {
    const settings = await this.settingsService.getSettings();
    return {
      companyName: settings.companyName,
      companyLogo: settings.companyLogo,
      payslipTemplate: settings.payslipTemplate,
    };
  }

  @Patch('company')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update company information' })
  async updateCompanyInfo(
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.updateCompanyInfo(dto, user.sub);
  }

  @Patch('leave-policies')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update leave policies' })
  async updateLeavePolicies(
    @Body() dto: UpdateLeavePoliciesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.updateLeavePolicies(dto, user.sub);
  }

  @Patch('notifications')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.updateNotificationPreferences(dto, user.sub);
  }

  @Post('reset-leave-system')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Reset leave policies and employee balances to defaults' })
  async resetLeaveSystem(@CurrentUser() user: JwtPayload) {
    return this.settingsService.resetLeaveSystem(user.sub);
  }

  @Post('logo')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Upload company logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: logoStorage,
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const filePath = `/uploads/company/${file.filename}`;
    await this.settingsService.uploadLogo(filePath, user.sub);
    return { logoUrl: filePath };
  }

  @Get('logo/:filename')
  @ApiOperation({ summary: 'Serve company logo file' })
  async serveLogo(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', 'company', filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ message: 'Logo not found' });
    }
    return res.sendFile(filePath);
  }

  @Patch('payslip-template')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update payslip template configuration' })
  async updatePayslipTemplate(
    @Body() dto: UpdatePayslipTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.updatePayslipTemplate(dto, user.sub);
  }
}
