import {
  Controller,
  Get,
  Post,
  Patch,
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
import { DirectorsListService } from './directors-list.service';
import {
  NominateEmployeeDto,
  ApproveNominationDto,
  NominationFilterDto,
} from './dto/directors-list.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Directors List')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('directors-list')
export class DirectorsListController {
  constructor(private readonly directorsListService: DirectorsListService) {}

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Nominate an employee for the director\'s list' })
  async nominate(
    @Body() dto: NominateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.directorsListService.nominateEmployee(dto, user.employeeId!);
  }

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all nominations' })
  async getAll(@Query() filters: NominationFilterDto) {
    return this.directorsListService.getAll(filters);
  }

  @Get('current')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get current month nominations' })
  async getCurrentMonth() {
    return this.directorsListService.getCurrentMonthNominations();
  }

  @Get('stats')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get nomination statistics' })
  async getStats() {
    return this.directorsListService.getStats();
  }

  @Get('period/:period')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get nominations by period' })
  async getByPeriod(@Param('period') period: string) {
    return this.directorsListService.getByPeriod(period);
  }

  @Get('employee/:id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get employee nomination history' })
  async getEmployeeHistory(@Param('id') employeeId: string) {
    return this.directorsListService.getEmployeeNominationHistory(employeeId);
  }

  @Patch(':id/approve')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Approve or reject a nomination' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveNominationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.directorsListService.approveNomination(id, user.employeeId!, dto);
  }
}
