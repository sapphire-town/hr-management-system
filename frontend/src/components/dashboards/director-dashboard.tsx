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
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';
import { DonutChart } from '@/components/charts/pie-chart';
import { performanceAPI, dashboardAPI, directorsListAPI } from '@/lib/api-client';

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

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [companyRes, dashboardRes, dlStatsRes, dlCurrentRes] = await Promise.all([
          performanceAPI.getCompanyPerformance({ period: 'monthly' }),
          dashboardAPI.getStats(),
          directorsListAPI.getStats(),
          directorsListAPI.getCurrent(),
        ]);
        setCompanyData(companyRes.data);
        setDashboardStats(dashboardRes.data);
        setDirectorsListStats(dlStatsRes.data);
        setRecentNominations(dlCurrentRes.data?.slice(0, 5) || []);
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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

  // Transform department data for chart
  const departmentChartData = (companyData?.departmentPerformance || []).map(d => ({
    name: d.department.length > 10 ? d.department.substring(0, 10) + '...' : d.department,
    performance: d.averageScore,
    attendance: d.attendanceRate,
    employees: d.employeeCount,
  }));

  // Transform trend data for chart
  const trendChartData = (companyData?.trends || []).map(t => ({
    month: t.date,
    performance: t.score,
    attendance: t.attendanceRate,
  }));

  // Performance distribution for donut chart
  const distributionData = companyData?.performanceDistribution
    ? [
        { name: 'Excellent (90+)', value: companyData.performanceDistribution.excellent },
        { name: 'Good (75-89)', value: companyData.performanceDistribution.good },
        { name: 'Average (60-74)', value: companyData.performanceDistribution.average },
        { name: 'Needs Improvement', value: companyData.performanceDistribution.needsImprovement },
      ]
    : [];

  // Top performers for activity feed
  const topPerformerActivities: Activity[] = (companyData?.topPerformers || []).slice(0, 5).map((p, idx) => ({
    id: String(idx),
    type: 'reward' as const,
    title: p.employeeName,
    description: `${p.department} • Score: ${p.overallScore}%`,
    timestamp: new Date(),
    status: p.trend === 'up' ? 'approved' : p.trend === 'down' ? 'pending' : undefined,
  }));

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid>
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
        />
        <StatsCard
          title="Departments"
          value={stats.departments}
          icon={Building2}
        />
        <StatsCard
          title="Avg Performance"
          value={`${stats.performanceScore}%`}
          trend={stats.performanceScore >= 80 ? { value: stats.performanceScore - 80, label: 'above target' } : undefined}
          icon={TrendingUp}
        />
        <StatsCard
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          icon={Award}
        />
      </StatsGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Department Performance"
          subtitle="Performance score and attendance by department"
        >
          {departmentChartData.length > 0 ? (
            <BarChart
              data={departmentChartData}
              dataKey={['performance', 'attendance']}
              xAxisKey="name"
              showLegend
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No department data available
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Performance Trends"
          subtitle="Monthly performance and attendance trends"
        >
          {trendChartData.length > 0 ? (
            <LineChart
              data={trendChartData}
              dataKey={['performance', 'attendance']}
              xAxisKey="month"
              showLegend
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No trend data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Performance Distribution"
          subtitle="Employee performance breakdown"
        >
          {distributionData.some(d => d.value > 0) ? (
            <DonutChart data={distributionData} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No distribution data available
            </div>
          )}
        </ChartCard>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                <p className="text-sm text-gray-500">This month's best performers</p>
              </div>
              <a
                href="/dashboard/performance"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                View All →
              </a>
            </div>
            <div className="space-y-3">
              {(companyData?.topPerformers || []).slice(0, 5).map((performer, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{performer.employeeName}</p>
                      <p className="text-sm text-gray-500">{performer.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{performer.overallScore}%</span>
                    {getTrendIcon(performer.trend)}
                  </div>
                </div>
              ))}
              {(!companyData?.topPerformers || companyData.topPerformers.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No performance data available yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Department Details Table */}
      {companyData?.departmentPerformance && companyData.departmentPerformance.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Department Details</h3>
            <p className="text-sm text-gray-500">Detailed performance metrics by department</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Top Performer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {companyData.departmentPerformance.map((dept, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{dept.department}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {dept.employeeCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full"
                            style={{ width: `${dept.averageScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{dept.averageScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${dept.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{dept.attendanceRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dept.topPerformer.name}</p>
                        <p className="text-xs text-gray-500">{dept.topPerformer.score}%</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Director's List</h3>
                <p className="text-sm text-gray-500">Employee recognition program</p>
              </div>
            </div>
            <a
              href="/dashboard/directors-list"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Manage →
            </a>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">Pending Approvals</span>
              </div>
              <p className="text-2xl font-bold text-yellow-800">{directorsListStats?.pendingApprovals || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">Approved This Month</span>
              </div>
              <p className="text-2xl font-bold text-green-800">{directorsListStats?.approvedThisMonth || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">Total Recognitions</span>
              </div>
              <p className="text-2xl font-bold text-purple-800">{directorsListStats?.totalNominations || 0}</p>
            </div>
          </div>

          {recentNominations.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Nominations</h4>
              <div className="space-y-2">
                {recentNominations.map((nomination) => (
                  <div
                    key={nomination.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {nomination.employee.firstName} {nomination.employee.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{nomination.employee.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {nomination.isApproved ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No nominations yet this period</p>
              <a
                href="/dashboard/directors-list"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium mt-2 inline-block"
              >
                Nominate an employee →
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
