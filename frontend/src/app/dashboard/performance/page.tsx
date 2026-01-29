'use client';

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Award,
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { performanceAPI } from '@/lib/api-client';
import { LineChart } from '@/components/charts/line-chart';
import { BarChart } from '@/components/charts/bar-chart';

interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  overallScore: number;
  attendanceScore: number;
  leaveScore: number;
  taskCompletionScore: number;
  totalWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  halfDays: number;
  leaveDays: number;
  trend: 'up' | 'down' | 'stable';
  previousScore: number;
}

interface PerformanceTrend {
  date: string;
  score: number;
  attendanceRate: number;
}

const periodOptions = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'quarterly', label: 'This Quarter' },
  { value: 'yearly', label: 'This Year' },
];

export default function PerformancePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [employees, setEmployees] = React.useState<EmployeePerformance[]>([]);
  const [trends, setTrends] = React.useState<PerformanceTrend[]>([]);
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeePerformance | null>(null);
  const [employeeHistory, setEmployeeHistory] = React.useState<PerformanceTrend[]>([]);
  const [period, setPeriod] = React.useState('monthly');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  const isDirectorOrHR = user?.role === 'DIRECTOR' || user?.role === 'HR_HEAD';

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [employeesRes, trendsRes] = await Promise.all([
        performanceAPI.getAllEmployeesPerformance({ period }),
        performanceAPI.getTrends(6),
      ]);
      setEmployees(employeesRes.data || []);
      setTrends(trendsRes.data || []);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    if (isDirectorOrHR) {
      fetchData();
    }
  }, [fetchData, isDirectorOrHR]);

  const handleViewEmployee = async (employee: EmployeePerformance) => {
    setSelectedEmployee(employee);
    try {
      const historyRes = await performanceAPI.getEmployeeHistory(employee.employeeId, 6);
      setEmployeeHistory(historyRes.data || []);
    } catch (error) {
      console.error('Error fetching employee history:', error);
    }
    setShowDetailModal(true);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-blue-600 bg-blue-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Calculate summary stats
  const avgScore = employees.length > 0
    ? Math.round(employees.reduce((sum, e) => sum + e.overallScore, 0) / employees.length)
    : 0;
  const avgAttendance = employees.length > 0
    ? Math.round(employees.reduce((sum, e) => sum + e.attendanceScore, 0) / employees.length)
    : 0;
  const topPerformersCount = employees.filter(e => e.overallScore >= 90).length;
  const needsImprovementCount = employees.filter(e => e.overallScore < 60).length;

  if (!isDirectorOrHR) {
    return (
      <DashboardLayout title="Performance" description="Performance metrics and analytics">
        <div className="text-center py-20 text-gray-500">
          You don't have permission to view this page.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Performance Analytics"
      description="Monitor and analyze employee performance metrics"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Performance</p>
                  <p className="text-2xl font-bold text-gray-900">{avgScore}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{avgAttendance}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Top Performers</p>
                  <p className="text-2xl font-bold text-gray-900">{topPerformersCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
            {trends.length > 0 ? (
              <div className="h-72">
                <LineChart
                  data={trends.map(t => ({
                    month: t.date,
                    performance: t.score,
                    attendance: t.attendanceRate,
                  }))}
                  dataKey={['performance', 'attendance']}
                  xAxisKey="month"
                  showLegend
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No trend data available
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="relative">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="appearance-none px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Employee Performance Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Employee Performance</h3>
              <p className="text-sm text-gray-500">Click on an employee to view detailed metrics</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leave Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trend
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                            {emp.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">{emp.employeeName}</p>
                            <p className="text-sm text-gray-500">{emp.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {emp.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getScoreColor(emp.overallScore)}`}>
                          {emp.overallScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getScoreBarColor(emp.attendanceScore)} rounded-full`}
                              style={{ width: `${emp.attendanceScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{emp.attendanceScore}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getScoreBarColor(emp.leaveScore)} rounded-full`}
                              style={{ width: `${emp.leaveScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{emp.leaveScore}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {getTrendIcon(emp.trend)}
                          <span className="text-sm text-gray-500">
                            {emp.trend === 'up' ? '+' : emp.trend === 'down' ? '-' : ''}
                            {Math.abs(emp.overallScore - emp.previousScore)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewEmployee(emp)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEmployees.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  No employees found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl">
                    {selectedEmployee.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedEmployee.employeeName}</h2>
                    <p className="text-gray-500">{selectedEmployee.department} • {selectedEmployee.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Score Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-purple-600">Overall Score</p>
                  <p className="text-3xl font-bold text-purple-700">{selectedEmployee.overallScore}%</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-green-600">Attendance</p>
                  <p className="text-3xl font-bold text-green-700">{selectedEmployee.attendanceScore}%</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-600">Leave Score</p>
                  <p className="text-3xl font-bold text-blue-700">{selectedEmployee.leaveScore}%</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-amber-600">Task Score</p>
                  <p className="text-3xl font-bold text-amber-700">{selectedEmployee.taskCompletionScore}%</p>
                </div>
              </div>

              {/* Attendance Details */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Attendance Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Working Days</p>
                    <p className="text-lg font-semibold">{selectedEmployee.totalWorkingDays}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Present</p>
                    <p className="text-lg font-semibold text-green-600">{selectedEmployee.daysPresent}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Absent</p>
                    <p className="text-lg font-semibold text-red-600">{selectedEmployee.daysAbsent}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Half Days</p>
                    <p className="text-lg font-semibold text-yellow-600">{selectedEmployee.halfDays}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Leaves</p>
                    <p className="text-lg font-semibold text-blue-600">{selectedEmployee.leaveDays}</p>
                  </div>
                </div>
              </div>

              {/* Performance History Chart */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Performance History (6 Months)</h3>
                {employeeHistory.length > 0 ? (
                  <div className="h-64">
                    <LineChart
                      data={employeeHistory.map(h => ({
                        month: h.date,
                        performance: h.score,
                        attendance: h.attendanceRate,
                      }))}
                      dataKey={['performance', 'attendance']}
                      xAxisKey="month"
                      showLegend
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-500 bg-gray-50 rounded-xl">
                    No history data available
                  </div>
                )}
              </div>

              {/* Trend Comparison */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-500">Previous Period Score</p>
                  <p className="text-xl font-semibold">{selectedEmployee.previousScore}%</p>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(selectedEmployee.trend)}
                  <span className={`text-lg font-semibold ${
                    selectedEmployee.trend === 'up' ? 'text-green-600' :
                    selectedEmployee.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {selectedEmployee.trend === 'up' ? '+' : selectedEmployee.trend === 'down' ? '-' : ''}
                    {Math.abs(selectedEmployee.overallScore - selectedEmployee.previousScore)}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Score</p>
                  <p className="text-xl font-semibold">{selectedEmployee.overallScore}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
