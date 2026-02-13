import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export enum ReportPerformancePeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export class ReportPerformanceFilterDto {
  @ApiPropertyOptional({ enum: ReportPerformancePeriod })
  @IsOptional()
  @IsEnum(ReportPerformancePeriod)
  period?: ReportPerformancePeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export interface ParameterPerformance {
  paramKey: string;
  paramLabel: string;
  paramType: string;
  target: number;
  totalTarget: number;
  totalActual: number;
  achievementPct: number;
  averageDaily: number;
  daysReported: number;
}

export interface TimeBucketData {
  bucketLabel: string;
  bucketStart: string;
  bucketEnd: string;
  parameters: Record<string, {
    actual: number;
    target: number;
    achievementPct: number;
  }>;
  submissionCount: number;
  expectedSubmissions: number;
}

export interface EmployeeReportPerformance {
  employeeId: string;
  employeeName: string;
  roleName: string;
  parameters: ParameterPerformance[];
  overallAchievementPct: number;
  submissionRate: number;
  totalReports: number;
  totalWorkingDays: number;
  timeSeries: TimeBucketData[];
  bestParameter: { key: string; label: string; pct: number } | null;
  worstParameter: { key: string; label: string; pct: number } | null;
}

export interface TeamReportPerformance {
  employees: EmployeeReportPerformance[];
  teamAverageAchievement: number;
  teamAverageSubmissionRate: number;
  parameterAverages: ParameterPerformance[];
}
