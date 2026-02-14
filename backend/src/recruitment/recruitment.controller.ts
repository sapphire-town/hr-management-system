import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { RecruitmentService } from './recruitment.service';
import {
  CreatePlacementDriveDto,
  UpdatePlacementDriveDto,
  AssignInterviewersDto,
  CreateStudentDto,
  BulkCreateStudentsDto,
  EvaluateStudentDto,
  DriveFilterDto,
} from './dto/recruitment.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

@ApiTags('Recruitment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // ==================== PLACEMENT DRIVES ====================

  @Post('drives')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Create a new placement drive' })
  async createDrive(
    @Body() dto: CreatePlacementDriveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recruitmentService.createDrive(dto, user.sub);
  }

  @Get('drives')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER, UserRole.INTERVIEWER)
  @ApiOperation({ summary: 'Get all placement drives' })
  async findAllDrives(@Query() filters: DriveFilterDto) {
    return this.recruitmentService.findAllDrives(filters);
  }

  @Get('drives/my')
  @Roles(UserRole.INTERVIEWER, UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Get my assigned placement drives' })
  async getMyAssignedDrives(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return [];
    }
    return this.recruitmentService.getMyAssignedDrives(user.employeeId, user.role);
  }

  @Get('drives/:id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER, UserRole.INTERVIEWER)
  @ApiOperation({ summary: 'Get placement drive by ID' })
  async findDriveById(@Param('id') id: string) {
    return this.recruitmentService.findDriveById(id);
  }

  @Patch('drives/:id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Update placement drive' })
  async updateDrive(
    @Param('id') id: string,
    @Body() dto: UpdatePlacementDriveDto,
  ) {
    return this.recruitmentService.updateDrive(id, dto);
  }

  @Delete('drives/:id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Delete placement drive' })
  async deleteDrive(@Param('id') id: string) {
    return this.recruitmentService.deleteDrive(id);
  }

  @Patch('drives/:id/close')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Close a placement drive' })
  async closeDrive(@Param('id') id: string) {
    return this.recruitmentService.closeDrive(id);
  }

  @Patch('drives/:id/reopen')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Reopen a closed placement drive' })
  async reopenDrive(@Param('id') id: string) {
    return this.recruitmentService.reopenDrive(id);
  }

  @Get('drives/:id/statistics')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get placement drive statistics' })
  async getDriveStatistics(@Param('id') id: string) {
    return this.recruitmentService.getDriveStatistics(id);
  }

  // ==================== INTERVIEWERS ====================

  @Get('interviewers')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get available interviewers' })
  async getAvailableInterviewers() {
    return this.recruitmentService.getAvailableInterviewers();
  }

  @Post('drives/:id/interviewers')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Assign interviewers to placement drive' })
  async assignInterviewers(
    @Param('id') id: string,
    @Body() dto: AssignInterviewersDto,
  ) {
    return this.recruitmentService.assignInterviewers(id, dto);
  }

  // ==================== STUDENTS ====================

  @Post('drives/:id/students')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Add a student to placement drive' })
  async addStudent(
    @Param('id') id: string,
    @Body() dto: CreateStudentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recruitmentService.addStudent(id, dto, user.role);
  }

  @Post('drives/:id/students/bulk')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Bulk add students to placement drive' })
  async bulkAddStudents(
    @Param('id') id: string,
    @Body() dto: BulkCreateStudentsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recruitmentService.bulkAddStudents(id, dto, user.role);
  }

  @Post('drives/:id/students/import')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Bulk import students from Excel file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importStudentsFromExcel(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recruitmentService.importStudentsFromExcel(id, file.buffer, user.employeeId, user.role);
  }

  @Get('students/import-template')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Download student import Excel template' })
  async downloadStudentImportTemplate(@Res() res: Response) {
    const buffer = await this.recruitmentService.generateStudentImportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=student_import_template.xlsx',
    );
    res.send(buffer);
  }

  @Get('drives/:id/students')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER, UserRole.INTERVIEWER)
  @ApiOperation({ summary: 'Get all students in a placement drive' })
  async getStudentsByDrive(@Param('id') id: string) {
    return this.recruitmentService.getStudentsByDrive(id);
  }

  @Delete('students/:id')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Delete a student from placement drive' })
  async deleteStudent(@Param('id') id: string) {
    return this.recruitmentService.deleteStudent(id);
  }

  // ==================== EVALUATIONS ====================

  @Post('students/:id/evaluate/:round')
  @Roles(UserRole.INTERVIEWER, UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Evaluate a student for a round' })
  async evaluateStudent(
    @Param('id') studentId: string,
    @Param('round') round: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EvaluateStudentDto,
  ) {
    if (!user.employeeId) {
      throw new Error('Employee ID not found');
    }
    return this.recruitmentService.evaluateStudent(
      studentId,
      parseInt(round, 10),
      user.employeeId,
      dto,
      user.role,
    );
  }

  @Get('evaluations/:id/history')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD, UserRole.MANAGER, UserRole.INTERVIEWER)
  @ApiOperation({ summary: 'Get evaluation edit history for audit trail' })
  async getEvaluationHistory(@Param('id') evaluationId: string) {
    return this.recruitmentService.getEvaluationHistory(evaluationId);
  }

  // ==================== STATISTICS ====================

  @Get('statistics')
  @Roles(UserRole.DIRECTOR, UserRole.HR_HEAD)
  @ApiOperation({ summary: 'Get overall recruitment statistics' })
  async getOverallStatistics() {
    return this.recruitmentService.getOverallStatistics();
  }
}
