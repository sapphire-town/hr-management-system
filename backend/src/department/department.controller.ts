import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  DepartmentFilterDto,
  SetDepartmentRequirementDto,
  UpdateDepartmentDto,
} from './dto/department.dto';

interface JwtPayload {
  sub: string;
}

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Create a new department' })
  async create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: JwtPayload) {
    return this.departmentService.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all departments' })
  async findAll(@Query() filters: DepartmentFilterDto) {
    return this.departmentService.findAll(filters);
  }

  @Get('statistics')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get department statistics and requirements' })
  async getStatistics() {
    return this.departmentService.getStatistics();
  }

  @Get(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get department by ID' })
  async findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update department (Director/HR Head)' })
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Patch(':id/requirements')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Set employee requirements for department' })
  async setRequirements(
    @Param('id') id: string,
    @Body() dto: SetDepartmentRequirementDto,
  ) {
    return this.departmentService.setRequirements(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Delete department' })
  async delete(@Param('id') id: string) {
    return this.departmentService.delete(id);
  }
}
