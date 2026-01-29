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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TargetService } from './target.service';
import { CreateTargetDto, UpdateTargetDto, BulkCreateTargetDto } from './dto/target.dto';

@ApiTags('Targets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('targets')
export class TargetController {
  constructor(private readonly targetService: TargetService) {}

  @Post()
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Create a target for an employee' })
  async create(@Body() dto: CreateTargetDto, @Request() req) {
    return this.targetService.create(dto, req.user.employeeId);
  }

  @Post('bulk')
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Create targets for multiple employees' })
  async bulkCreate(@Body() dto: BulkCreateTargetDto, @Request() req) {
    return this.targetService.bulkCreate(dto, req.user.employeeId);
  }

  @Get()
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Get all targets with optional filters' })
  async findAll(
    @Query('employeeId') employeeId?: string,
    @Query('targetMonth') targetMonth?: string,
    @Query('managerId') managerId?: string,
  ) {
    return this.targetService.findAll({ employeeId, targetMonth, managerId });
  }

  @Get('team')
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Get targets for manager\'s team' })
  async getTeamTargets(
    @Request() req,
    @Query('targetMonth') targetMonth?: string,
  ) {
    return this.targetService.getTeamTargets(req.user.employeeId, targetMonth);
  }

  @Get('team/stats')
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Get target statistics for manager\'s team' })
  async getTeamStats(
    @Request() req,
    @Query('targetMonth') targetMonth: string,
  ) {
    return this.targetService.getTeamTargetStats(req.user.employeeId, targetMonth);
  }

  @Get('employee/:employeeId')
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Get targets for a specific employee' })
  async getEmployeeTargets(
    @Param('employeeId') employeeId: string,
    @Query('targetMonth') targetMonth?: string,
  ) {
    if (targetMonth) {
      return this.targetService.findByEmployeeAndMonth(employeeId, targetMonth);
    }
    return this.targetService.findAll({ employeeId });
  }

  @Get(':id')
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Get a target by ID' })
  async findOne(@Param('id') id: string) {
    return this.targetService.findOne(id);
  }

  @Patch(':id')
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Update a target' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTargetDto,
    @Request() req,
  ) {
    return this.targetService.update(id, dto, req.user.employeeId);
  }

  @Delete(':id')
  @Roles('DIRECTOR', 'HR_HEAD', 'MANAGER')
  @ApiOperation({ summary: 'Soft delete a target' })
  async remove(@Param('id') id: string) {
    return this.targetService.remove(id);
  }

  @Delete(':id/permanent')
  @Roles('DIRECTOR', 'HR_HEAD')
  @ApiOperation({ summary: 'Permanently delete a target' })
  async hardDelete(@Param('id') id: string) {
    return this.targetService.hardDelete(id);
  }
}
