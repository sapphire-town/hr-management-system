import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export enum PerformancePeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class PerformanceFilterDto {
  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Department filter' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Period for performance calculation', enum: PerformancePeriod })
  @IsOptional()
  @IsEnum(PerformancePeriod)
  period?: PerformancePeriod;

  @ApiPropertyOptional({ description: 'Start date for custom range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for custom range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class EmployeePerformanceDto {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;

  // Overall score (0-100)
  overallScore: number;

  // Individual metrics
  attendanceScore: number;
  punctualityScore: number;
  leaveScore: number;
  taskCompletionScore: number;

  // Raw data
  totalWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  halfDays: number;
  leaveDays: number;

  // Trends
  trend: 'up' | 'down' | 'stable';
  previousScore: number;
}

export class TeamPerformanceDto {
  teamId: string;
  managerId: string;
  managerName: string;
  teamSize: number;
  averageScore: number;
  topPerformers: EmployeePerformanceDto[];
  needsImprovement: EmployeePerformanceDto[];
  attendanceRate: number;
  trend: 'up' | 'down' | 'stable';
}

export class DepartmentPerformanceDto {
  department: string;
  employeeCount: number;
  averageScore: number;
  attendanceRate: number;
  topPerformer: {
    name: string;
    score: number;
  };
  trend: 'up' | 'down' | 'stable';
}

export class PerformanceTrendDto {
  date: string;
  score: number;
  attendanceRate: number;
  employeeCount: number;
}

export class CompanyPerformanceDto {
  totalEmployees: number;
  averagePerformanceScore: number;
  overallAttendanceRate: number;
  departmentPerformance: DepartmentPerformanceDto[];
  trends: PerformanceTrendDto[];
  topPerformers: EmployeePerformanceDto[];
  performanceDistribution: {
    excellent: number; // 90-100
    good: number; // 75-89
    average: number; // 60-74
    needsImprovement: number; // <60
  };
}

export class PerformanceChartDataDto {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }[];
}
