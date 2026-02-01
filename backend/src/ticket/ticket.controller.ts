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
import { TicketService } from './ticket.service';
import {
  CreateTicketDto,
  UpdateTicketStatusDto,
  AddCommentDto,
  TicketFilterDto,
} from './dto/ticket.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ticket' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTicketDto,
  ) {
    if (!user.employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.ticketService.create(user.employeeId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my tickets' })
  async getMyTickets(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return [];
    return this.ticketService.getMyTickets(user.employeeId);
  }

  @Get('assigned')
  @ApiOperation({ summary: 'Get tickets assigned to me' })
  async getAssignedTickets(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return [];
    return this.ticketService.getAssignedTickets(user.employeeId);
  }

  @Get('all')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get all tickets (HR/Director)' })
  async getAll(@Query() filters: TicketFilterDto) {
    return this.ticketService.getAll(filters);
  }

  @Get('statistics')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get ticket statistics' })
  async getStatistics() {
    return this.ticketService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  async getById(@Param('id') id: string) {
    return this.ticketService.getById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketService.updateStatus(id, user.employeeId || '', dto);
  }

  @Post(':id/comment')
  @ApiOperation({ summary: 'Add comment to ticket' })
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddCommentDto,
  ) {
    if (!user.employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.ticketService.addComment(id, user.employeeId, dto);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve a ticket' })
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ticketService.resolve(id, user.employeeId || '');
  }
}
