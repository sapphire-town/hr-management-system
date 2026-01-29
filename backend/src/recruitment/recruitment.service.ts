import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
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
  constructor(private prisma: PrismaService) {}

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
    const limit = parseInt(filters.limit || '10', 10);
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

    return this.prisma.placementDrive.update({
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

    // Remove existing interviewers not in the new list
    await this.prisma.placementDriveInterviewer.deleteMany({
      where: {
        driveId,
        interviewerId: { notIn: dto.interviewerIds },
      },
    });

    // Add new interviewers
    const existingInterviewers = await this.prisma.placementDriveInterviewer.findMany({
      where: { driveId },
      select: { interviewerId: true },
    });

    const existingIds = existingInterviewers.map((i) => i.interviewerId);
    const newIds = dto.interviewerIds.filter((id) => !existingIds.includes(id));

    if (newIds.length > 0) {
      await this.prisma.placementDriveInterviewer.createMany({
        data: newIds.map((interviewerId) => ({
          driveId,
          interviewerId,
        })),
      });
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

    return this.prisma.roundEvaluation.upsert({
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
}
