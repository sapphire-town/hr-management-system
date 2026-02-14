'use client';

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Award,
  Calendar,
  Search,
  Eye,
  Loader2,
  Target,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { performanceAPI } from '@/lib/api-client';
import { LineChart } from '@/components/charts/line-chart';

// ==================== Types ====================

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

// ==================== Styles ====================

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e5e7eb',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const statCardStyle = (gradient: string): React.CSSProperties => ({
  background: gradient,
  borderRadius: '16px',
  padding: '20px 24px',
  color: '#ffffff',
  flex: 1,
  minWidth: '180px',
});

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left' as const,
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '2px solid #e5e7eb',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '14px',
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
};

// ==================== Helpers ====================

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthDateRange = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp style={{ width: '16px', height: '16px', color: '#059669' }} />;
  if (trend === 'down') return <TrendingDown style={{ width: '16px', height: '16px', color: '#dc2626' }} />;
  return <Minus style={{ width: '16px', height: '16px', color: '#6b7280' }} />;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? '#059669' : score >= 75 ? '#3b82f6' : score >= 60 ? '#d97706' : '#dc2626';
  const bg = score >= 90 ? '#ecfdf5' : score >= 75 ? '#eff6ff' : score >= 60 ? '#fffbeb' : '#fef2f2';
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 600,
      color,
      backgroundColor: bg,
    }}>
      {score}%
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: '#f3f4f6', minWidth: '60px' }}>
        <div style={{ width: `${Math.min(100, value)}%`, height: '100%', borderRadius: '3px', backgroundColor: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color, minWidth: '32px' }}>{value}%</span>
    </div>
  );
}

// ==================== Main Page ====================

export default function PerformancePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [employees, setEmployees] = React.useState<EmployeePerformance[]>([]);
  const [trends, setTrends] = React.useState<PerformanceTrend[]>([]);
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeePerformance | null>(null);
  const [employeeHistory, setEmployeeHistory] = React.useState<PerformanceTrend[]>([]);
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonth());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  const isDirectorOrHR = user?.role === 'DIRECTOR' || user?.role === 'HR_HEAD';
  const isManager = user?.role === 'MANAGER';
  const canViewPerformance = isDirectorOrHR || isManager;

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getMonthDateRange(selectedMonth);
      const params = { period: 'monthly', startDate, endDate };

      if (isDirectorOrHR) {
        const [employeesRes, trendsRes] = await Promise.all([
          performanceAPI.getAllEmployeesPerformance(params),
          performanceAPI.getTrends(6),
        ]);
        setEmployees(employeesRes.data || []);
        setTrends(trendsRes.data || []);
      } else if (isManager) {
        const [teamRes, trendsRes] = await Promise.all([
          performanceAPI.getTeamDashboard(params),
          performanceAPI.getTrends(6),
        ]);
        setEmployees(teamRes.data?.members || []);
        setTrends(trendsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, isDirectorOrHR, isManager]);

  React.useEffect(() => {
    if (canViewPerformance) {
      fetchData();
    }
  }, [fetchData, canViewPerformance]);

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

  // Calculate summary stats
  const avgScore = employees.length > 0
    ? Math.round(employees.reduce((sum, e) => sum + e.overallScore, 0) / employees.length)
    : 0;
  const avgAttendance = employees.length > 0
    ? Math.round(employees.reduce((sum, e) => sum + e.attendanceScore, 0) / employees.length)
    : 0;
  const topPerformersCount = employees.filter(e => e.overallScore >= 90).length;

  if (!canViewPerformance) {
    return (
      <DashboardLayout title="Performance" description="Performance metrics and analytics">
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          You don&apos;t have permission to view this page.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Performance Analytics"
      description="Monitor and analyze employee performance metrics"
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <Loader2 style={{ width: '24px', height: '24px', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
            Loading performance data...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Summary Stats */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={statCardStyle('linear-gradient(135deg, #7c3aed, #a78bfa)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target style={{ width: '20px', height: '20px' }} />
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>Avg Performance</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
                  {avgScore}%
                </div>
              </div>

              <div style={statCardStyle('linear-gradient(135deg, #059669, #34d399)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar style={{ width: '20px', height: '20px' }} />
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>Avg Attendance</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
                  {avgAttendance}%
                </div>
              </div>

              <div style={statCardStyle('linear-gradient(135deg, #d97706, #fbbf24)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award style={{ width: '20px', height: '20px' }} />
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>Top Performers</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
                  {topPerformersCount}
                </div>
              </div>

              <div style={statCardStyle('linear-gradient(135deg, #2563eb, #60a5fa)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users style={{ width: '20px', height: '20px' }} />
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>Total Employees</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
                  {employees.length}
                </div>
              </div>
            </div>

            {/* Trend Chart */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
                Performance Trends (6 Months)
              </h3>
              {trends.length > 0 ? (
                <div style={{ height: '280px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#9ca3af' }}>
                  No trend data available
                </div>
              )}
            </div>

            {/* Search & Filter */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search by name or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: '36px',
                      paddingRight: '12px',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#f9fafb',
                    }}
                  />
                </div>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  max={getCurrentMonth()}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    backgroundColor: '#f9fafb',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Employee Performance Table */}
            <div style={cardStyle}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  Employee Performance ({filteredEmployees.length} {filteredEmployees.length === 1 ? 'member' : 'members'})
                </h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>Click View to see detailed metrics</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Employee</th>
                      <th style={thStyle}>Department</th>
                      <th style={thStyle}>Overall</th>
                      <th style={thStyle}>Attendance</th>
                      <th style={thStyle}>Leave</th>
                      <th style={thStyle}>Trend</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, idx) => (
                      <tr
                        key={emp.employeeId}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f3ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#fafafa'; }}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '13px',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}>
                              {emp.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, color: '#111827' }}>{emp.employeeName}</div>
                              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{emp.role}</div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>{emp.department}</td>
                        <td style={tdStyle}><ScoreBadge score={emp.overallScore} /></td>
                        <td style={tdStyle}><ProgressBar value={emp.attendanceScore} color="#059669" /></td>
                        <td style={tdStyle}><ProgressBar value={emp.leaveScore} color="#3b82f6" /></td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <TrendIcon trend={emp.trend} />
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                              {emp.trend === 'up' ? '+' : emp.trend === 'down' ? '-' : ''}
                              {Math.abs(emp.overallScore - emp.previousScore)}%
                            </span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => handleViewEmployee(emp)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#7c3aed',
                              backgroundColor: '#f5f3ff',
                              border: '1px solid #ede9fe',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#ede9fe';
                              e.currentTarget.style.borderColor = '#c4b5fd';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f5f3ff';
                              e.currentTarget.style.borderColor = '#ede9fe';
                            }}
                          >
                            <Eye style={{ width: '14px', height: '14px' }} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEmployees.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                    <Users style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>No employees found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employee Detail Modal */}
        {showDetailModal && selectedEmployee && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: '16px',
            }}
            onClick={() => setShowDetailModal(false)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                maxWidth: '720px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 700,
                    }}>
                      {selectedEmployee.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>
                        {selectedEmployee.employeeName}
                      </h2>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                        {selectedEmployee.department} &middot; {selectedEmployee.role}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#6b7280',
                    }}
                  >
                    <X style={{ width: '18px', height: '18px' }} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Score Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Overall', value: selectedEmployee.overallScore, gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
                    { label: 'Attendance', value: selectedEmployee.attendanceScore, gradient: 'linear-gradient(135deg, #059669, #34d399)' },
                    { label: 'Leave', value: selectedEmployee.leaveScore, gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
                    { label: 'Task', value: selectedEmployee.taskCompletionScore, gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: item.gradient,
                      borderRadius: '14px',
                      padding: '16px',
                      textAlign: 'center',
                      color: '#ffffff',
                    }}>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>{item.label}</div>
                      <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>{item.value}%</div>
                    </div>
                  ))}
                </div>

                {/* Attendance Details */}
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '14px', padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
                    Attendance Details
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    {[
                      { label: 'Working Days', value: selectedEmployee.totalWorkingDays, color: '#111827' },
                      { label: 'Present', value: selectedEmployee.daysPresent, color: '#059669' },
                      { label: 'Absent', value: selectedEmployee.daysAbsent, color: '#dc2626' },
                      { label: 'Half Days', value: selectedEmployee.halfDays, color: '#d97706' },
                      { label: 'Leaves', value: selectedEmployee.leaveDays, color: '#3b82f6' },
                    ].map(item => (
                      <div key={item.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance History Chart */}
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>
                    Performance History (6 Months)
                  </h3>
                  {employeeHistory.length > 0 ? (
                    <div style={{ height: '240px' }}>
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
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '120px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '14px',
                      color: '#9ca3af',
                      fontSize: '14px',
                    }}>
                      No history data available
                    </div>
                  )}
                </div>

                {/* Trend Comparison */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '14px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Previous Period</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#374151' }}>{selectedEmployee.previousScore}%</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendIcon trend={selectedEmployee.trend} />
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: selectedEmployee.trend === 'up' ? '#059669' : selectedEmployee.trend === 'down' ? '#dc2626' : '#6b7280',
                    }}>
                      {selectedEmployee.trend === 'up' ? '+' : selectedEmployee.trend === 'down' ? '-' : ''}
                      {Math.abs(selectedEmployee.overallScore - selectedEmployee.previousScore)}%
                    </span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Current Score</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#374151' }}>{selectedEmployee.overallScore}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
