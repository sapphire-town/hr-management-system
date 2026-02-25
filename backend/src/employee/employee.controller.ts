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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { EmployeeService } from './employee.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeFilterDto,
  PromoteEmployeeDto,
  AssignManagerDto,
  AssignTeamMembersDto,
  UpdateMyProfileDto,
  ChangePasswordDto,
} from './dto/employee.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Create a new employee' })
  async create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all employees with filters' })
  async findAll(@Query() filters: EmployeeFilterDto) {
    return this.employeeService.findAll(filters);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current employee profile' })
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.employeeService.findByUserId(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current employee profile' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.employeeService.updateMyProfile(user.sub, dto);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.employeeService.changePassword(user.sub, dto);
  }

  @Get('team')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: "Get manager's team members" })
  async getTeam(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      throw new BadRequestException('Your account is not linked to an employee profile. Please contact HR.');
    }
    return this.employeeService.getTeam(user.employeeId);
  }

  @Get('team/attendance')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: "Get team's attendance for today" })
  async getTeamAttendance(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      throw new BadRequestException('Your account is not linked to an employee profile. Please contact HR.');
    }
    return this.employeeService.getTeamAttendanceToday(user.employeeId);
  }

  @Get('list/managers')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get all managers for dropdown' })
  async getManagers() {
    return this.employeeService.getManagers();
  }

  @Get('bulk-import/template')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Download bulk import Excel template' })
  async downloadBulkImportTemplate(@Res() res: Response) {
    const buffer = await this.employeeService.generateBulkImportTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.xlsx');
    res.send(buffer);
  }

  @Post('bulk-import')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk import employees from Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx) containing employee data',
        },
      },
    },
  })
  async bulkImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!validMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an Excel file (.xlsx)');
    }

    return this.employeeService.bulkImport(file.buffer);
  }

  @Get(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get employee by ID' })
  async findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Get(':id/comprehensive')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get comprehensive employee details including attendance, reports, documents (Director/HR only)' })
  async findOneComprehensive(@Param('id') id: string) {
    return this.employeeService.findOneComprehensive(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update employee' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Deactivate employee' })
  async delete(@Param('id') id: string) {
    return this.employeeService.delete(id);
  }

  @Patch(':id/promote')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Promote employee to new role' })
  async promote(@Param('id') id: string, @Body() dto: PromoteEmployeeDto) {
    return this.employeeService.promote(id, dto);
  }

  @Patch(':id/assign-manager')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Assign manager to employee' })
  async assignManager(@Param('id') id: string, @Body() dto: AssignManagerDto) {
    return this.employeeService.assignManager(id, dto);
  }

  @Post(':id/team-members')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Assign team members to a manager' })
  async assignTeamMembers(
    @Param('id') managerId: string,
    @Body() dto: AssignTeamMembersDto,
  ) {
    return this.employeeService.assignTeamMembers(managerId, dto);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Reset employee password' })
  async resetPassword(@Param('id') id: string) {
    return this.employeeService.resetPassword(id);
  }

  @Post(':id/reactivate')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Reactivate a deactivated employee' })
  async reactivate(@Param('id') id: string) {
    return this.employeeService.reactivate(id);
  }

  @Patch(':id/toggle-interviewer')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Toggle interviewer capability for an employee' })
  async toggleInterviewer(
    @Param('id') id: string,
    @Body() body: { isInterviewer: boolean },
  ) {
    return this.employeeService.toggleInterviewer(id, body.isInterviewer);
  }

  @Post('admin/initialize-leave-balances')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Initialize leave balances for all employees' })
  async initializeLeaveBalances() {
    return this.employeeService.initializeAllLeaveBalances();
  }
}
