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
import { UserRole } from '@prisma/client';
import { HolidayService } from './holiday.service';
import { CreateHolidayDto, UpdateHolidayDto, HolidayFilterDto } from './dto/holiday.dto';

@ApiTags('Holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('holidays')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Create a new holiday' })
  async create(@Body() dto: CreateHolidayDto) {
    return this.holidayService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all holidays' })
  async findAll(@Query() filters: HolidayFilterDto) {
    return this.holidayService.findAll(filters);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming holidays' })
  async getUpcoming(@Query('days') days?: string) {
    const daysCount = days ? parseInt(days, 10) : 30;
    return this.holidayService.getUpcoming(daysCount);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get holiday by ID' })
  async findOne(@Param('id') id: string) {
    return this.holidayService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update a holiday' })
  async update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.holidayService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Delete a holiday' })
  async delete(@Param('id') id: string) {
    return this.holidayService.delete(id);
  }
}
