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
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto, SetRequirementDto, RoleFilterDto } from './dto/role.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Create a new role (Director only)' })
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: JwtPayload) {
    return this.roleService.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all roles' })
  async findAll(@Query() filters: RoleFilterDto) {
    return this.roleService.findAll(filters);
  }

  @Get('statistics')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get role statistics and requirements' })
  async getStatistics() {
    return this.roleService.getStatistics();
  }

  @Get(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Update role (Director only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Patch(':id/requirements')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Set employee requirements for role' })
  async setRequirements(@Param('id') id: string, @Body() dto: SetRequirementDto) {
    return this.roleService.setRequirements(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Delete role (Director only)' })
  async delete(@Param('id') id: string) {
    return this.roleService.delete(id);
  }
}