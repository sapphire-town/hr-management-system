import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreatePlacementDriveDto,
  UpdatePlacementDriveDto,
  AssignInterviewersDto,
  CreateStudentDto,
  BulkCreateStudentsDto,
  EvaluateStudentDto,
  DriveFilterDto,
} from './dto/recruitment.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class RecruitmentService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // ==================== PLACEMENT DRIVES ====================

  async createDrive(dto: CreatePlacementDriveDto, createdBy: string) {
    return this.prisma.placementDrive.create({
      data: {
        collegeName: dto.collegeName,
        driveDate: new Date(dto.driveDate),
        roles: dto.roles as any,
        createdBy,
      },
      include: {
        interviewers: {
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: { select: { students: true } },
      },
    });
  }

  async findAllDrives(filters: DriveFilterDto) {
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.search) {
      where.collegeName = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.startDate) {
      where.driveDate = { ...where.driveDate, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.driveDate = { ...where.driveDate, lte: new Date(filters.endDate) };
    }

    const [drives, total] = await Promise.all([
      this.prisma.placementDrive.findMany({
        where,
        skip,
        take: limit,
        orderBy: { driveDate: 'desc' },
        include: {
          interviewers: {
            include: {
              interviewer: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          _count: { select: { students: true } },
        },
      }),
      this.prisma.placementDrive.count({ where }),
    ]);

    return {
      data: drives,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findDriveById(id: string) {
    const drive = await this.prisma.placementDrive.findUnique({
      where: { id },
      include: {
        interviewers: {
          include: {
            interviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: { select: { email: true } },
              },
            },
          },
        },
        students: {
          include: {
            evaluations: {
              include: {
                evaluator: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }

    return drive;
  }

  async updateDrive(id: string, dto: UpdatePlacementDriveDto) {
    const drive = await this.prisma.placementDrive.findUnique({ where: { id } });
    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }

    // Track changes for notification
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    if (dto.collegeName && dto.collegeName !== drive.collegeName) {
      changes.push({ field: 'College Name', oldValue: drive.collegeName, newValue: dto.collegeName });
    }

    if (dto.driveDate) {
      const newDate = new Date(dto.driveDate);
      if (newDate.getTime() !== drive.driveDate.getTime()) {
        changes.push({
          field: 'Drive Date',
          oldValue: drive.driveDate.toISOString(),
          newValue: newDate.toISOString()
        });
      }
    }

    if (dto.roles && JSON.stringify(dto.roles) !== JSON.stringify(drive.roles)) {
      changes.push({ field: 'Roles', oldValue: drive.roles, newValue: dto.roles });
    }

    const updatedDrive = await this.prisma.placementDrive.update({
      where: { id },
      data: {
        collegeName: dto.collegeName,
        driveDate: dto.driveDate ? new Date(dto.driveDate) : undefined,
        roles: dto.roles as any,
      },
      include: {
        interviewers: {
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: { select: { students: true } },
      },
    });

    // Send notifications if there are changes
    if (changes.length > 0) {
      await this.notificationService.notifyDriveUpdated(id, changes);
    }

    return updatedDrive;
  }

  async deleteDrive(id: string) {
    const drive = await this.prisma.placementDrive.findUnique({ where: { id } });
    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }

    return this.prisma.placementDrive.delete({ where: { id } });
  }

  // ==================== INTERVIEWERS ====================

  async assignInterviewers(driveId: string, dto: AssignInterviewersDto) {
    const drive = await this.prisma.placementDrive.findUnique({ where: { id: driveId } });
    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }

    // Verify all interviewers exist and can be interviewers
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: dto.interviewerIds },
        user: {
          role: { in: [UserRole.INTERVIEWER, UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR] },
        },
      },
    });

    if (employees.length !== dto.interviewerIds.length) {
      throw new BadRequestException('Some interviewers are not valid or do not have interviewer permissions');
    }

    // Get existing interviewers before any changes
    const existingInterviewers = await this.prisma.placementDriveInterviewer.findMany({
      where: { driveId },
      select: { interviewerId: true },
    });

    const existingIds = existingInterviewers.map((i) => i.interviewerId);
    const newIds = dto.interviewerIds.filter((id) => !existingIds.includes(id));

    // Remove existing interviewers not in the new list
    await this.prisma.placementDriveInterviewer.deleteMany({
      where: {
        driveId,
        interviewerId: { notIn: dto.interviewerIds },
      },
    });

    // Add new interviewers
    if (newIds.length > 0) {
      await this.prisma.placementDriveInterviewer.createMany({
        data: newIds.map((interviewerId) => ({
          driveId,
          interviewerId,
        })),
      });

      // Send notifications to newly assigned interviewers
      await this.notificationService.notifyInterviewersAssigned(newIds, driveId);
    }

    return this.findDriveById(driveId);
  }

  async getAvailableInterviewers() {
    return this.prisma.employee.findMany({
      where: {
        user: {
          role: { in: [UserRole.INTERVIEWER, UserRole.MANAGER, UserRole.HR_HEAD, UserRole.DIRECTOR] },
          isActive: true,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: { select: { email: true, role: true } },
        role: { select: { name: true } },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async getMyAssignedDrives(interviewerId: string) {
    return this.prisma.placementDrive.findMany({
      where: {
        interviewers: {
          some: { interviewerId },
        },
      },
      include: {
        interviewers: {
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: { select: { students: true } },
      },
      orderBy: { driveDate: 'desc' },
    });
  }

  // ==================== STUDENTS ====================

  async addStudent(driveId: string, dto: CreateStudentDto) {
    const drive = await this.prisma.placementDrive.findUnique({ where: { id: driveId } });
    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }

    return this.prisma.student.create({
      data: {
        driveId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        studentData: dto.studentData || {},
      },
    });
  }

  async bulkAddStudents(driveId: string, dto: BulkCreateStudentsDto) {
    const drive = await this.prisma.placementDrive.findUnique({ where: { id: driveId } });
    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }

    const result = await this.prisma.student.createMany({
      data: dto.students.map((student) => ({
        driveId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        studentData: student.studentData || {},
      })),
    });

    // Send notifications to all assigned interviewers
    if (result.count > 0) {
      await this.notificationService.notifyStudentAdded(driveId, result.count);
    }

    return { count: result.count, message: `${result.count} students added successfully` };
  }

  async getStudentsByDrive(driveId: string) {
    return this.prisma.student.findMany({
      where: { driveId },
      include: {
        evaluations: {
          include: {
            evaluator: { select: { firstName: true, lastName: true } },
          },
          orderBy: { roundNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async deleteStudent(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.student.delete({ where: { id: studentId } });
  }

  // ==================== EVALUATIONS ====================

  async evaluateStudent(
    studentId: string,
    roundNumber: number,
    evaluatorId: string,
    dto: EvaluateStudentDto,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { drive: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if evaluator is assigned to this drive
    const isAssigned = await this.prisma.placementDriveInterviewer.findFirst({
      where: {
        driveId: student.driveId,
        interviewerId: evaluatorId,
      },
    });

    if (!isAssigned) {
      throw new BadRequestException('You are not assigned to this placement drive');
    }

    // For round 2, check if round 1 passed
    if (roundNumber === 2) {
      const round1 = await this.prisma.roundEvaluation.findFirst({
        where: {
          studentId,
          roundNumber: 1,
          status: 'PASS',
        },
      });

      if (!round1) {
        throw new BadRequestException('Student must pass round 1 before round 2 evaluation');
      }
    }

    // Get existing evaluation to track changes for audit trail
    const existingEvaluation = await this.prisma.roundEvaluation.findUnique({
      where: {
        studentId_roundNumber: { studentId, roundNumber },
      },
    });

    const evaluation = await this.prisma.roundEvaluation.upsert({
      where: {
        studentId_roundNumber: { studentId, roundNumber },
      },
      update: {
        status: dto.status,
        comments: dto.comments,
        evaluatorId,
      },
      create: {
        studentId,
        driveId: student.driveId,
        roundNumber,
        evaluatorId,
        status: dto.status,
        comments: dto.comments,
      },
      include: {
        student: { select: { name: true, email: true } },
        evaluator: { select: { firstName: true, lastName: true } },
      },
    });

    // Create audit trail entry if this is an edit (not a new evaluation)
    if (existingEvaluation) {
      await this.prisma.roundEvaluationHistory.create({
        data: {
          evaluationId: evaluation.id,
          previousStatus: existingEvaluation.status,
          newStatus: dto.status,
          previousComments: existingEvaluation.comments,
          newComments: dto.comments,
          editedBy: evaluatorId,
        },
      });
    }

    return evaluation;
  }

  async getEvaluationHistory(evaluationId: string) {
    return this.prisma.roundEvaluationHistory.findMany({
      where: { evaluationId },
      include: {
        editor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { role: true } },
          },
        },
      },
      orderBy: { editedAt: 'desc' },
    });
  }

  // ==================== STATISTICS ====================

  async getDriveStatistics(driveId: string) {
    const drive = await this.prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: {
        students: {
          include: {
            evaluations: true,
          },
        },
        interviewers: true,
      },
    });

    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }

    const totalStudents = drive.students.length;
    const round1Evaluated = drive.students.filter((s) =>
      s.evaluations.some((e) => e.roundNumber === 1)
    ).length;
    const round1Passed = drive.students.filter((s) =>
      s.evaluations.some((e) => e.roundNumber === 1 && e.status === 'PASS')
    ).length;
    const round2Evaluated = drive.students.filter((s) =>
      s.evaluations.some((e) => e.roundNumber === 2)
    ).length;
    const round2Passed = drive.students.filter((s) =>
      s.evaluations.some((e) => e.roundNumber === 2 && e.status === 'PASS')
    ).length;

    return {
      driveId,
      collegeName: drive.collegeName,
      driveDate: drive.driveDate,
      totalStudents,
      interviewerCount: drive.interviewers.length,
      round1: {
        evaluated: round1Evaluated,
        passed: round1Passed,
        failed: round1Evaluated - round1Passed,
        pending: totalStudents - round1Evaluated,
      },
      round2: {
        evaluated: round2Evaluated,
        passed: round2Passed,
        failed: round2Evaluated - round2Passed,
        pending: round1Passed - round2Evaluated,
      },
      finalSelected: round2Passed,
    };
  }

  async getOverallStatistics() {
    const [totalDrives, upcomingDrives, totalStudents, selectedStudents] = await Promise.all([
      this.prisma.placementDrive.count(),
      this.prisma.placementDrive.count({
        where: { driveDate: { gte: new Date() } },
      }),
      this.prisma.student.count(),
      this.prisma.roundEvaluation.count({
        where: { roundNumber: 2, status: 'PASS' },
      }),
    ]);

    const recentDrives = await this.prisma.placementDrive.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true, interviewers: true } },
      },
    });

    return {
      totalDrives,
      upcomingDrives,
      completedDrives: totalDrives - upcomingDrives,
      totalStudents,
      selectedStudents,
      selectionRate: totalStudents > 0 ? Math.round((selectedStudents / totalStudents) * 100) : 0,
      recentDrives,
    };
  }

  // ==================== STUDENT EXCEL IMPORT ====================

  private extractCellValue(cellValue: any): string | number | null {
    if (cellValue === null || cellValue === undefined) return null;
    if (cellValue instanceof Date) return cellValue.toISOString().split('T')[0];
    if (typeof cellValue === 'object' && cellValue.text !== undefined) return String(cellValue.text);
    if (typeof cellValue === 'object' && Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((rt: any) => rt.text || '').join('');
    }
    if (typeof cellValue === 'object' && cellValue.result !== undefined) {
      return this.extractCellValue(cellValue.result);
    }
    if (typeof cellValue === 'object' && cellValue.error) return null;
    if (typeof cellValue === 'object') return String(cellValue);
    return cellValue;
  }

  async importStudentsFromExcel(driveId: string, fileBuffer: Buffer, evaluatorId?: string) {
    const drive = await this.prisma.placementDrive.findUnique({ where: { id: driveId } });
    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Invalid Excel file - no worksheet found');
    }

    // Get headers from first row
    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const value = this.extractCellValue(cell.value);
      headers[colNumber] = String(value || '').toLowerCase().trim();
    });

    const getString = (value: any): string => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };

    const VALID_ROUND_STATUSES = ['PASS', 'FAIL', 'ON_HOLD'];

    // Parse data rows
    const students: Array<{
      name: string; email: string; phone: string; studentData: Record<string, any>;
      round1Result?: string; round1Comments?: string; round2Result?: string; round2Comments?: string;
    }> = [];
    const results: Array<{ row: number; name: string; status: 'success' | 'failed'; message?: string }> = [];

    // Known core fields (will not go into studentData)
    const coreFields = new Set(['name', 'student name', 'student_name', 'fullname', 'full name', 'full_name',
      'email', 'email address', 'email_address', 'phone', 'mobile', 'phone number', 'phone_number', 'contact',
      'round 1 result', 'round1result', 'round_1_result', 'round 1 comments', 'round1comments', 'round_1_comments',
      'round 2 result', 'round2result', 'round_2_result', 'round 2 comments', 'round2comments', 'round_2_comments']);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const record: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          record[header] = this.extractCellValue(cell.value);
        }
      });

      const name = getString(
        record.name || record['student name'] || record.student_name ||
        record.fullname || record['full name'] || record.full_name,
      );
      const email = getString(
        record.email || record['email address'] || record.email_address,
      );
      const phone = getString(
        record.phone || record.mobile || record['phone number'] || record.phone_number || record.contact,
      );

      if (!name) {
        results.push({ row: rowNumber, name: name || '(empty)', status: 'failed', message: 'Name is required' });
        return;
      }
      if (!email) {
        results.push({ row: rowNumber, name, status: 'failed', message: 'Email is required' });
        return;
      }

      // Extract round evaluation data
      const round1Result = getString(
        record['round 1 result'] || record.round1result || record.round_1_result,
      ).toUpperCase();
      const round1Comments = getString(
        record['round 1 comments'] || record.round1comments || record.round_1_comments,
      );
      const round2Result = getString(
        record['round 2 result'] || record.round2result || record.round_2_result,
      ).toUpperCase();
      const round2Comments = getString(
        record['round 2 comments'] || record.round2comments || record.round_2_comments,
      );

      // Validate round results if provided
      if (round1Result && !VALID_ROUND_STATUSES.includes(round1Result)) {
        results.push({ row: rowNumber, name, status: 'failed', message: `Invalid Round 1 Result: "${round1Result}". Must be PASS, FAIL, or ON_HOLD` });
        return;
      }
      if (round2Result && !VALID_ROUND_STATUSES.includes(round2Result)) {
        results.push({ row: rowNumber, name, status: 'failed', message: `Invalid Round 2 Result: "${round2Result}". Must be PASS, FAIL, or ON_HOLD` });
        return;
      }
      if (round2Result && !round1Result) {
        results.push({ row: rowNumber, name, status: 'failed', message: 'Round 2 Result requires Round 1 Result' });
        return;
      }
      if (round2Result && round1Result !== 'PASS') {
        results.push({ row: rowNumber, name, status: 'failed', message: 'Round 2 Result requires Round 1 to be PASS' });
        return;
      }

      // Collect any extra columns as studentData
      const studentData: Record<string, any> = {};
      for (const [key, value] of Object.entries(record)) {
        if (!coreFields.has(key) && value !== null && value !== undefined && String(value).trim() !== '') {
          // Use original header casing from the Excel file
          const originalHeader = headers.find((_, idx) => headers[idx] === key);
          studentData[key] = value;
        }
      }

      students.push({
        name, email, phone, studentData,
        round1Result: round1Result || undefined,
        round1Comments: round1Comments || undefined,
        round2Result: round2Result || undefined,
        round2Comments: round2Comments || undefined,
      });
      results.push({ row: rowNumber, name, status: 'success' });
    });

    if (students.length === 0) {
      throw new BadRequestException(
        results.length > 0
          ? `No valid student records found. ${results.filter(r => r.status === 'failed').length} rows had errors.`
          : 'No data rows found in the Excel file',
      );
    }

    // Check for duplicate emails within the file
    const emailSet = new Set<string>();
    const deduped: typeof students = [];
    for (let i = 0; i < students.length; i++) {
      const emailLower = students[i].email.toLowerCase();
      if (emailSet.has(emailLower)) {
        const resultIdx = results.findIndex(r => r.row === i + 2 && r.status === 'success');
        if (resultIdx >= 0) {
          results[resultIdx] = { ...results[resultIdx], status: 'failed', message: 'Duplicate email in file' };
        }
      } else {
        emailSet.add(emailLower);
        deduped.push(students[i]);
      }
    }

    // Check for existing emails in this drive
    const existingStudents = await this.prisma.student.findMany({
      where: { driveId },
      select: { email: true },
    });
    const existingEmails = new Set(existingStudents.map(s => s.email.toLowerCase()));

    const toInsert: typeof deduped = [];
    for (const student of deduped) {
      if (existingEmails.has(student.email.toLowerCase())) {
        const resultIdx = results.findIndex(r => r.name === student.name && r.status === 'success');
        if (resultIdx >= 0) {
          results[resultIdx] = { ...results[resultIdx], status: 'failed', message: 'Student email already exists in this drive' };
        }
      } else {
        toInsert.push(student);
      }
    }

    // Bulk insert valid students
    let insertedCount = 0;
    if (toInsert.length > 0) {
      const result = await this.prisma.student.createMany({
        data: toInsert.map(s => ({
          driveId,
          name: s.name,
          email: s.email,
          phone: s.phone,
          studentData: s.studentData,
        })),
      });
      insertedCount = result.count;

      // Create RoundEvaluation records for students with evaluation data
      const studentsWithEvals = toInsert.filter(s => s.round1Result || s.round2Result);
      if (studentsWithEvals.length > 0 && evaluatorId) {
        // Fetch inserted students by email to get their IDs
        const insertedStudents = await this.prisma.student.findMany({
          where: {
            driveId,
            email: { in: studentsWithEvals.map(s => s.email) },
          },
          select: { id: true, email: true },
        });
        const emailToId = new Map(insertedStudents.map(s => [s.email.toLowerCase(), s.id]));

        for (const student of studentsWithEvals) {
          const studentId = emailToId.get(student.email.toLowerCase());
          if (!studentId) continue;

          // Create Round 1 evaluation
          if (student.round1Result) {
            await this.prisma.roundEvaluation.create({
              data: {
                studentId,
                driveId,
                roundNumber: 1,
                evaluatorId,
                status: student.round1Result as any,
                comments: student.round1Comments || null,
              },
            });
          }

          // Create Round 2 evaluation
          if (student.round2Result) {
            await this.prisma.roundEvaluation.create({
              data: {
                studentId,
                driveId,
                roundNumber: 2,
                evaluatorId,
                status: student.round2Result as any,
                comments: student.round2Comments || null,
              },
            });
          }
        }
      }

      // Notify interviewers
      if (insertedCount > 0) {
        await this.notificationService.notifyStudentAdded(driveId, insertedCount);
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return {
      total: results.length,
      successful,
      failed,
      inserted: insertedCount,
      results,
    };
  }

  async generateStudentImportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Import');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'College', key: 'college', width: 25 },
      { header: 'Branch', key: 'branch', width: 25 },
      { header: 'CGPA', key: 'cgpa', width: 10 },
      { header: 'Graduation Year', key: 'graduationYear', width: 18 },
      { header: 'Round 1 Result', key: 'round1Result', width: 16 },
      { header: 'Round 1 Comments', key: 'round1Comments', width: 30 },
      { header: 'Round 2 Result', key: 'round2Result', width: 16 },
      { header: 'Round 2 Comments', key: 'round2Comments', width: 30 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C3AED' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Sample data rows
    worksheet.addRow({
      name: 'Rahul Kumar',
      email: 'rahul.kumar@college.edu',
      phone: '9876543210',
      college: 'Tech University',
      branch: 'Computer Science',
      cgpa: 8.5,
      graduationYear: 2026,
      round1Result: 'PASS',
      round1Comments: 'Good technical skills',
      round2Result: 'PASS',
      round2Comments: 'Strong communication',
    });
    worksheet.addRow({
      name: 'Priya Sharma',
      email: 'priya.sharma@college.edu',
      phone: '9876543211',
      college: 'Tech University',
      branch: 'Information Technology',
      cgpa: 9.0,
      graduationYear: 2026,
      round1Result: 'ON_HOLD',
      round1Comments: 'Needs follow-up',
      round2Result: '',
      round2Comments: '',
    });

    // Instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { header: 'Column', key: 'column', width: 20 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Required', key: 'required', width: 12 },
    ];

    const instrHeaderRow = instructionsSheet.getRow(1);
    instrHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    instrHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C3AED' },
    };

    const instructions = [
      { column: 'Name', description: 'Full name of the student', required: 'Yes' },
      { column: 'Email', description: 'Student email address', required: 'Yes' },
      { column: 'Phone', description: 'Contact phone number', required: 'No' },
      { column: 'College', description: 'College/University name (stored in student data)', required: 'No' },
      { column: 'Branch', description: 'Department/Branch of study (stored in student data)', required: 'No' },
      { column: 'CGPA', description: 'Cumulative GPA (stored in student data)', required: 'No' },
      { column: 'Graduation Year', description: 'Expected graduation year (stored in student data)', required: 'No' },
      { column: 'Round 1 Result', description: 'Round 1 evaluation result: PASS, FAIL, or ON_HOLD', required: 'No' },
      { column: 'Round 1 Comments', description: 'Comments/feedback for round 1 evaluation', required: 'No' },
      { column: 'Round 2 Result', description: 'Round 2 evaluation result: PASS, FAIL, or ON_HOLD (requires Round 1 PASS)', required: 'No' },
      { column: 'Round 2 Comments', description: 'Comments/feedback for round 2 evaluation', required: 'No' },
      { column: '', description: '', required: '' },
      { column: 'Note', description: 'You can add any additional columns. Extra columns will be stored as student data.', required: '' },
    ];

    instructions.forEach(i => instructionsSheet.addRow(i));

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
