import {
  Controller,
  Get,
  Post,
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
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, HRFeedbackDto, FeedbackFilterDto } from './dto/feedback.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // Employee submits feedback
  @Post()
  @ApiOperation({ summary: 'Submit feedback (employee)' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFeedbackDto,
  ) {
    if (!user.employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.feedbackService.create(user.employeeId, dto);
  }

  // HR sends feedback to employee
  @Post('hr')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Send feedback to employee (HR/Director)' })
  async createHRFeedback(
    @CurrentUser() user: JwtPayload,
    @Body() dto: HRFeedbackDto,
  ) {
    if (!user.employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.feedbackService.createHRFeedback(user.employeeId, dto);
  }

  // Get all feedback (HR view)
  @Get()
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get all feedback (HR/Director)' })
  async findAll(@Query() filters: FeedbackFilterDto) {
    return this.feedbackService.findAll(filters);
  }

  // Get feedback statistics
  @Get('statistics')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get feedback statistics' })
  async getStatistics() {
    return this.feedbackService.getStatistics();
  }

  // Get my submitted feedback
  @Get('my/submitted')
  @ApiOperation({ summary: 'Get my submitted feedback' })
  async getMySubmittedFeedback(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return [];
    }
    return this.feedbackService.getMySubmittedFeedback(user.employeeId);
  }

  // Get feedback received by me
  @Get('my/received')
  @ApiOperation({ summary: 'Get feedback received by me' })
  async getMyReceivedFeedback(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return [];
    }
    return this.feedbackService.getMyReceivedFeedback(user.employeeId);
  }

  // Get feedback by subject
  @Get('subject/:subject')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get feedback by subject' })
  async getFeedbackBySubject(@Param('subject') subject: string) {
    return this.feedbackService.getFeedbackBySubject(subject);
  }

  // Get single feedback (restricted to HR/Director for confidentiality)
  @Get(':id')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get single feedback' })
  async findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  // Delete feedback (HR only)
  @Delete(':id')
  @Roles(UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Delete feedback' })
  async delete(@Param('id') id: string) {
    return this.feedbackService.delete(id);
  }
}