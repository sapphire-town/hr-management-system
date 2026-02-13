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
import { UserRole, HiringRequestStatus } from '@prisma/client';
import { HiringService } from './hiring.service';
import {
  CreateHiringRequestDto,
  UpdateHiringRequestDto,
  ApproveHiringRequestDto,
  HiringFilterDto,
} from './dto/hiring.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Hiring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hiring')
export class HiringController {
  constructor(private readonly hiringService: HiringService) {}

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a hiring request' })
  async create(
    @Body() dto: CreateHiringRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hiringService.create(dto, user.employeeId!);
  }

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all hiring requests' })
  async findAll(@Query() filters: HiringFilterDto) {
    return this.hiringService.findAll(filters);
  }

  @Get('stats')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get hiring statistics' })
  async getStats() {
    return this.hiringService.getStats();
  }

  @Get(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get hiring request by ID' })
  async findById(@Param('id') id: string) {
    return this.hiringService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update hiring request' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHiringRequestDto,
  ) {
    return this.hiringService.update(id, dto);
  }

  @Patch(':id/approve')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Approve or reject hiring request' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveHiringRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hiringService.approve(id, user.employeeId!, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update hiring request status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: HiringRequestStatus,
  ) {
    return this.hiringService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Delete hiring request' })
  async delete(@Param('id') id: string) {
    return this.hiringService.delete(id);
  }
}
