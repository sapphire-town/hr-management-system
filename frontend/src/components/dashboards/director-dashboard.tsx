'use client';

import * as React from 'react';
import {
  Users,
  Building2,
  TrendingUp,
  Award,
  UserPlus,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Star,
  Clock,
  CheckCircle,
  GraduationCap,
  MapPin,
  CalendarDays,
  UsersRound,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';
import { DonutChart } from '@/components/charts/pie-chart';
import { performanceAPI, dashboardAPI, directorsListAPI, recruitmentAPI } from '@/lib/api-client';

interface DepartmentPerformance {
  department: string;
  employeeCount: number;
  averageScore: number;
  attendanceRate: number;
  topPerformer: { name: string; score: number };
  trend: 'up' | 'down' | 'stable';
}

interface CompanyPerformance {
  totalEmployees: number;
  averagePerformanceScore: number;
  overallAttendanceRate: number;
  departmentPerformance: DepartmentPerformance[];
  trends: { date: string; score: number; attendanceRate: number }[];
  topPerformers: any[];
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
}

const quickActions = [
  { label: 'View All Employees', href: '/dashboard/employees', icon: Users },
  { label: 'Performance Details', href: '/dashboard/performance', icon: TrendingUp },
  { label: "Director's List", href: '/dashboard/directors-list', icon: Award },
  { label: 'Hiring Requests', href: '/dashboard/hiring', icon: UserPlus },
  { label: 'Placement Drives', href: '/dashboard/recruitment', icon: GraduationCap },
];

interface DirectorsListStats {
  totalNominations: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  currentPeriod: string;
}

interface DirectorsListEntry {
  id: string;
  employee: { firstName: string; lastName: string; department: string };
  period: string;
  reason: string;
  isApproved: boolean;
  createdAt: string;
}

export function DirectorDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [companyData, setCompanyData] = React.useState<CompanyPerformance | null>(null);
  const [dashboardStats, setDashboardStats] = React.useState<any>(null);
  const [directorsListStats, setDirectorsListStats] = React.useState<DirectorsListStats | null>(null);
  const [recentNominations, setRecentNominations] = React.useState<DirectorsListEntry[]>([]);
  const [recruitmentStats, setRecruitmentStats] = React.useState<{
    totalDrives: number;
    upcomingDrives: number;
    completedDrives: number;
    totalStudents: number;
    selectedStudents: number;
    selectionRate: number;
    recentDrives: { id: string; collegeName: string; driveDate: string; status: string; studentsCount: number; selectedCount: number }[];
  } | null>(null);
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);
  const [isMediumScreen, setIsMediumScreen] = React.useState(false);

  React.useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
      setIsMediumScreen(window.innerWidth >= 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [companyRes, dashboardRes, dlStatsRes, dlCurrentRes, recruitRes] = await Promise.all([
          performanceAPI.getCompanyPerformance({ period: 'monthly' }),
          dashboardAPI.getStats(),
          directorsListAPI.getStats(),
          directorsListAPI.getCurrent(),
          recruitmentAPI.getOverallStatistics().catch(() => ({ data: null })),
        ]);
        setCompanyData(companyRes.data);
        setDashboardStats(dashboardRes.data);
        setDirectorsListStats(dlStatsRes.data);
        setRecentNominations(dlCurrentRes.data?.slice(0, 5) || []);
        if (recruitRes.data) setRecruitmentStats(recruitRes.data);
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 style={{ width: '32px', height: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const stats = {
    totalEmployees: companyData?.totalEmployees || 0,
    departments: companyData?.departmentPerformance?.length || 0,
    hiringRequests: dashboardStats?.activeHiring || 0,
    performanceScore: companyData?.averagePerformanceScore || 0,
    attendanceRate: companyData?.overallAttendanceRate || 0,
  };

  const departmentChartData = (companyData?.departmentPerformance || []).map(d => ({
    name: d.department.length > 10 ? d.department.substring(0, 10) + '...' : d.department,
    performance: d.averageScore,
    attendance: d.attendanceRate,
    employees: d.employeeCount,
  }));

  const trendChartData = (companyData?.trends || []).map(t => ({
    month: t.date,
    performance: t.score,
    attendance: t.attendanceRate,
  }));

  const distributionData = companyData?.performanceDistribution
    ? [
        { name: 'Excellent (90+)', value: companyData.performanceDistribution.excellent },
        { name: 'Good (75-89)', value: companyData.performanceDistribution.good },
        { name: 'Average (60-74)', value: companyData.performanceDistribution.average },
        { name: 'Needs Improvement', value: companyData.performanceDistribution.needsImprovement },
      ]
    : [];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight style={{ width: '16px', height: '16px', color: '#22c55e' }} />;
      case 'down':
        return <ArrowDownRight style={{ width: '16px', height: '16px', color: '#ef4444' }} />;
      default:
        return <Minus style={{ width: '16px', height: '16px', color: '#6b7280' }} />;
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats */}
      <StatsGrid>
        <StatsCard title="Total Employees" value={stats.totalEmployees} icon={Users} />
        <StatsCard title="Departments" value={stats.departments} icon={Building2} />
        <StatsCard
          title="Avg Performance"
          value={`${stats.performanceScore}%`}
          trend={stats.performanceScore >= 80 ? { value: stats.performanceScore - 80, label: 'above target' } : undefined}
          icon={TrendingUp}
        />
        <StatsCard title="Attendance Rate" value={`${stats.attendanceRate}%`} icon={Award} />
      </StatsGrid>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: isLargeScreen ? '1fr 1fr' : '1fr', gap: '24px' }}>
        <ChartCard title="Department Performance" subtitle="Performance score and attendance by department">
          {departmentChartData.length > 0 ? (
            <BarChart data={departmentChartData} dataKey={['performance', 'attendance']} xAxisKey="name" showLegend />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px', color: '#6b7280' }}>
              No department data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Performance Trends" subtitle="Monthly performance and attendance trends">
          {trendChartData.length > 0 ? (
            <LineChart data={trendChartData} dataKey={['performance', 'attendance']} xAxisKey="month" showLegend />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px', color: '#6b7280' }}>
              No trend data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Second Row: Distribution + Top Performers */}
      <div style={{ display: 'grid', gridTemplateColumns: isLargeScreen ? '1fr 2fr' : '1fr', gap: '24px' }}>
        <ChartCard title="Performance Distribution" subtitle="Employee performance breakdown">
          {distributionData.some(d => d.value > 0) ? (
            <DonutChart data={distributionData} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px', color: '#6b7280' }}>
              No distribution data available
            </div>
          )}
        </ChartCard>

        <div style={cardStyle}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Top Performers</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>This month&apos;s best performers</p>
              </div>
              <a href="/dashboard/performance" style={{ fontSize: '14px', color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
                View All →
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(companyData?.topPerformers || []).slice(0, 5).map((performer, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#ede9fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#7c3aed',
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, color: '#111827', margin: 0, fontSize: '14px' }}>{performer.employeeName}</p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>{performer.department}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{performer.overallScore}%</span>
                    {getTrendIcon(performer.trend)}
                  </div>
                </div>
              ))}
              {(!companyData?.topPerformers || companyData.topPerformers.length === 0) && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
                  No performance data available yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Department Details Table */}
      {companyData?.departmentPerformance && companyData.departmentPerformance.length > 0 && (
        <div style={cardStyle}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Department Details</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>Detailed performance metrics by department</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Department', 'Employees', 'Performance', 'Attendance', 'Top Performer', 'Trend'].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companyData.departmentPerformance.map((dept, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 500, color: '#111827' }}>{dept.department}</span>
                    </td>
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap', color: '#4b5563' }}>
                      {dept.employeeCount}
                    </td>
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '80px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: '#7c3aed', borderRadius: '4px', width: `${dept.averageScore}%` }} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{dept.averageScore}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '80px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: '#22c55e', borderRadius: '4px', width: `${dept.attendanceRate}%` }} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{dept.attendanceRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>{dept.topPerformer.name}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>{dept.topPerformer.score}%</p>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                      {getTrendIcon(dept.trend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Director's List Widget */}
      <div style={cardStyle}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Star style={{ width: '20px', height: '20px', color: '#d97706' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Director&apos;s List</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '2px 0 0 0' }}>Employee recognition program</p>
              </div>
            </div>
            <a href="/dashboard/directors-list" style={{ fontSize: '14px', color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
              Manage →
            </a>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMediumScreen ? '1fr 1fr 1fr' : '1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#fffbeb', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Clock style={{ width: '16px', height: '16px', color: '#d97706' }} />
                <span style={{ fontSize: '14px', color: '#92400e' }}>Pending Approvals</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#78350f', margin: '4px 0 0 0' }}>
                {directorsListStats?.pendingApprovals || 0}
              </p>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CheckCircle style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                <span style={{ fontSize: '14px', color: '#166534' }}>Approved This Month</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#14532d', margin: '4px 0 0 0' }}>
                {directorsListStats?.approvedThisMonth || 0}
              </p>
            </div>
            <div style={{ backgroundColor: '#f5f3ff', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Award style={{ width: '16px', height: '16px', color: '#7c3aed' }} />
                <span style={{ fontSize: '14px', color: '#5b21b6' }}>Total Recognitions</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#3b0764', margin: '4px 0 0 0' }}>
                {directorsListStats?.totalNominations || 0}
              </p>
            </div>
          </div>

          {/* Recent Nominations */}
          {recentNominations.length > 0 ? (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>Recent Nominations</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentNominations.map((nomination) => (
                  <div
                    key={nomination.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #facc15, #f97316)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Star style={{ width: '16px', height: '16px', color: '#ffffff' }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, color: '#111827', margin: 0, fontSize: '14px' }}>
                          {nomination.employee.firstName} {nomination.employee.lastName}
                        </p>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                          {nomination.employee.department}
                        </p>
                      </div>
                    </div>
                    <div>
                      {nomination.isApproved ? (
                        <span
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 500,
                            borderRadius: '9999px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                          }}
                        >
                          Approved
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 500,
                            borderRadius: '9999px',
                            backgroundColor: '#fef3c7',
                            color: '#a16207',
                          }}
                        >
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280' }}>
              <Star style={{ width: '32px', height: '32px', margin: '0 auto 8px', color: '#d1d5db' }} />
              <p style={{ margin: '0 0 8px 0' }}>No nominations yet this period</p>
              <a
                href="/dashboard/directors-list"
                style={{ fontSize: '14px', color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}
              >
                Nominate an employee →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Placement Drives Widget */}
      <div style={cardStyle}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GraduationCap style={{ width: '20px', height: '20px', color: '#2563eb' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Placement Drives</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '2px 0 0 0' }}>Campus recruitment overview</p>
              </div>
            </div>
            <a href="/dashboard/recruitment" style={{ fontSize: '14px', color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}>
              View All →
            </a>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          {/* Recruitment Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: isMediumScreen ? '1fr 1fr 1fr 1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <GraduationCap style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                <span style={{ fontSize: '14px', color: '#1e40af' }}>Total Drives</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#1e3a5f', margin: '4px 0 0 0' }}>
                {recruitmentStats?.totalDrives || 0}
              </p>
            </div>
            <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CalendarDays style={{ width: '16px', height: '16px', color: '#d97706' }} />
                <span style={{ fontSize: '14px', color: '#92400e' }}>Upcoming</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#78350f', margin: '4px 0 0 0' }}>
                {recruitmentStats?.upcomingDrives || 0}
              </p>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <UsersRound style={{ width: '16px', height: '16px', color: '#16a34a' }} />
                <span style={{ fontSize: '14px', color: '#166534' }}>Students</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#14532d', margin: '4px 0 0 0' }}>
                {recruitmentStats?.totalStudents || 0}
              </p>
            </div>
            <div style={{ backgroundColor: '#f5f3ff', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CheckCircle style={{ width: '16px', height: '16px', color: '#7c3aed' }} />
                <span style={{ fontSize: '14px', color: '#5b21b6' }}>Selection Rate</span>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#3b0764', margin: '4px 0 0 0' }}>
                {recruitmentStats?.selectionRate || 0}%
              </p>
            </div>
          </div>

          {/* Recent Drives */}
          {recruitmentStats?.recentDrives && recruitmentStats.recentDrives.length > 0 ? (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>Recent Drives</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recruitmentStats.recentDrives.slice(0, 5).map((drive) => (
                  <a
                    key={drive.id}
                    href={`/dashboard/recruitment`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        transition: 'background-color 0.15s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: drive.status === 'OPEN' ? '#dbeafe' : '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MapPin style={{ width: '16px', height: '16px', color: drive.status === 'OPEN' ? '#2563eb' : '#6b7280' }} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 500, color: '#111827', margin: 0, fontSize: '14px' }}>
                            {drive.collegeName}
                          </p>
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                            {new Date(drive.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}{drive.studentsCount} student{drive.studentsCount !== 1 ? 's' : ''}
                            {drive.selectedCount > 0 && ` · ${drive.selectedCount} selected`}
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          borderRadius: '9999px',
                          backgroundColor: drive.status === 'OPEN' ? '#dbeafe' : '#dcfce7',
                          color: drive.status === 'OPEN' ? '#1d4ed8' : '#15803d',
                        }}
                      >
                        {drive.status === 'OPEN' ? 'Upcoming' : 'Completed'}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280' }}>
              <GraduationCap style={{ width: '32px', height: '32px', margin: '0 auto 8px', color: '#d1d5db' }} />
              <p style={{ margin: '0 0 8px 0' }}>No placement drives yet</p>
              <a
                href="/dashboard/recruitment"
                style={{ fontSize: '14px', color: '#7c3aed', fontWeight: 500, textDecoration: 'none' }}
              >
                Create a drive →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />
    </div>
  );
}
