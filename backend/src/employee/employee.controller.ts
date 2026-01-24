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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
      return [];
    }
    return this.employeeService.getTeam(user.employeeId);
  }

  @Get('team/attendance')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: "Get team's attendance for today" })
  async getTeamAttendance(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return [];
    }
    return this.employeeService.getTeamAttendanceToday(user.employeeId);
  }

  @Get('list/managers')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get all managers for dropdown' })
  async getManagers() {
    return this.employeeService.getManagers();
  }

  @Get(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get employee by ID' })
  async findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
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
  @Roles(UserRole.DIRECTOR)
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
}
