'use client';

import * as React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Shield,
  Building,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { Card } from '@/components/ui/card';

interface EmployeeMetrics {
  total: number;
  active: number;
  onLeave: number;
  newHires30Days: number;
  onboarding: number;
}

interface AttendanceStats {
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  attendanceRate: number;
  totalEmployees: number;
  workingDays: number;
}

interface LeaveStats {
  pending: number;
  approved: number;
  rejected: number;
  onLeaveToday: number;
}

interface AssetStats {
  total: number;
  assigned: number;
  available: number;
  pending: number;
  maintenance: number;
}

interface ResignationStats {
  pending: number;
  approved: number;
  last30Days: number;
  last90Days: number;
  served: number;
}

interface DepartmentPerformance {
  id: string;
  name: string;
  employeeCount: number;
  description: string | null;
}

interface ComprehensiveReports {
  employeeMetrics: EmployeeMetrics;
  attendanceStats: AttendanceStats;
  leaveStats: LeaveStats;
  recruitmentStats?: any;
  assetStats: AssetStats;
  resignationStats: ResignationStats;
  departmentPerformance: DepartmentPerformance[];
}

interface ChartDataPoint {
  month?: string;
  week?: string;
  name?: string;
  type?: string;
  [key: string]: any;
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [reports, setReports] = React.useState<ComprehensiveReports | null>(null);
  const [resignationChart, setResignationChart] = React.useState<ChartDataPoint[]>([]);
  const [assetChart, setAssetChart] = React.useState<ChartDataPoint[]>([]);
  const [departmentChart, setDepartmentChart] = React.useState<ChartDataPoint[]>([]);

  const isAuthorized = user?.role === 'DIRECTOR' || user?.role === 'HR_HEAD';

  React.useEffect(() => {
    if (isAuthorized) {
      fetchReports();
    }
  }, [isAuthorized]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [reportsRes, resignationRes, assetRes, deptRes] = await Promise.all([
        apiClient.get('/dashboard/reports/comprehensive'),
        apiClient.get('/dashboard/charts/resignation'),
        apiClient.get('/dashboard/charts/assets'),
        apiClient.get('/dashboard/charts/department'),
      ]);

      setReports(reportsRes.data);
      setResignationChart(resignationRes.data || []);
      setAssetChart(assetRes.data || []);
      setDepartmentChart(deptRes.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const statCardStyle = (color: string): React.CSSProperties => ({
    ...cardStyle,
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  });

  const iconContainerStyle = (color: string): React.CSSProperties => ({
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: `${color}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color,
  });

  if (!isAuthorized) {
    return (
      <DashboardLayout title="Reports & Analytics" description="Access restricted">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <Shield style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Access Restricted</p>
            <p style={{ margin: 0 }}>This page is available to Director and HR Head only.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Reports & Analytics" description="Comprehensive company insights">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                borderTopColor: '#7c3aed',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p>Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!reports) {
    return (
      <DashboardLayout title="Reports & Analytics" description="Comprehensive company insights">
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          <AlertCircle style={{ height: '48px', width: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Failed to load reports. Please try again.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Reports & Analytics"
      description="Comprehensive insights and performance metrics across the organization"
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Employee Metrics Section */}
        <section>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users style={{ height: '24px', width: '24px', color: '#7c3aed' }} />
              Employee Metrics
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Overall employee statistics and workforce distribution
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={statCardStyle('#7c3aed')}>
              <div style={iconContainerStyle('#7c3aed')}>
                <Users style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.employeeMetrics.total}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Total Employees</p>
              </div>
            </div>

            <div style={statCardStyle('#22c55e')}>
              <div style={iconContainerStyle('#22c55e')}>
                <UserCheck style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.employeeMetrics.active}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Active Employees</p>
              </div>
            </div>

            <div style={statCardStyle('#f59e0b')}>
              <div style={iconContainerStyle('#f59e0b')}>
                <Calendar style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.employeeMetrics.onLeave}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>On Leave Today</p>
              </div>
            </div>

            <div style={statCardStyle('#3b82f6')}>
              <div style={iconContainerStyle('#3b82f6')}>
                <TrendingUp style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.employeeMetrics.newHires30Days}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>New Hires (30 days)</p>
              </div>
            </div>

            <div style={statCardStyle('#8b5cf6')}>
              <div style={iconContainerStyle('#8b5cf6')}>
                <Activity style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.employeeMetrics.onboarding}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Onboarding (90 days)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Attendance Statistics Section */}
        <section>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle style={{ height: '24px', width: '24px', color: '#22c55e' }} />
              Attendance Statistics
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Current month attendance overview and performance
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={statCardStyle('#22c55e')}>
              <div style={iconContainerStyle('#22c55e')}>
                <CheckCircle style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.attendanceStats.attendanceRate}%
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Attendance Rate</p>
              </div>
            </div>

            <div style={statCardStyle('#3b82f6')}>
              <div style={iconContainerStyle('#3b82f6')}>
                <UserCheck style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.attendanceStats.present}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Present (This Month)</p>
              </div>
            </div>

            <div style={statCardStyle('#ef4444')}>
              <div style={iconContainerStyle('#ef4444')}>
                <UserX style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.attendanceStats.absent}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Absent (This Month)</p>
              </div>
            </div>

            <div style={statCardStyle('#f59e0b')}>
              <div style={iconContainerStyle('#f59e0b')}>
                <Clock style={{ height: '28px', width: '28px' }} />
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {reports.attendanceStats.halfDay}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Half Day (This Month)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Leave Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar style={{ height: '20px', width: '20px', color: '#f59e0b' }} />
                Leave Management
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                Current leave requests and approvals
              </p>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#f59e0b')}>
                      <Clock style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Pending Approvals</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.leaveStats.pending}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#22c55e')}>
                      <CheckCircle style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Approved (30 days)</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.leaveStats.approved}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#ef4444')}>
                      <XCircle style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Rejected (30 days)</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.leaveStats.rejected}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#7c3aed')}>
                      <Calendar style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>On Leave Today</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.leaveStats.onLeaveToday}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asset & Resignation Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
          {/* Asset Management */}
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package style={{ height: '20px', width: '20px', color: '#8b5cf6' }} />
                Asset Management
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                Asset allocation and availability
              </p>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#8b5cf6')}>
                      <Package style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Total Assets</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.assetStats.total}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#22c55e')}>
                      <CheckCircle style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Assigned</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.assetStats.assigned}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#3b82f6')}>
                      <Activity style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Available</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.assetStats.available}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#f59e0b')}>
                      <Clock style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Pending Requests</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.assetStats.pending}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resignation Trends */}
          <div style={cardStyle}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LogOut style={{ height: '20px', width: '20px', color: '#ef4444' }} />
                Resignation Trends
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                Employee attrition statistics
              </p>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#f59e0b')}>
                      <Clock style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Pending Approvals</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.resignationStats.pending}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#22c55e')}>
                      <CheckCircle style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Approved</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.resignationStats.approved}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#ef4444')}>
                      <TrendingDown style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Last 30 Days</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.resignationStats.last30Days}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={iconContainerStyle('#7c3aed')}>
                      <Activity style={{ height: '20px', width: '20px' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Last 90 Days</span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                    {reports.resignationStats.last90Days}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Department Performance Section */}
        <section>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building style={{ height: '24px', width: '24px', color: '#7c3aed' }} />
              Department-wise Performance
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Employee distribution across departments and roles
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Department
                    </th>
                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Employees
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      Distribution
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.departmentPerformance.map((dept, idx) => {
                    const percentage = reports.employeeMetrics.total > 0
                      ? Math.round((dept.employeeCount / reports.employeeMetrics.total) * 100)
                      : 0;

                    return (
                      <tr
                        key={dept.id}
                        style={{
                          borderBottom: idx < reports.departmentPerformance.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '16px' }}>
                          <div>
                            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                              {dept.name}
                            </p>
                            {dept.description && (
                              <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                                {dept.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                            {dept.employeeCount}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${percentage}%`,
                                  backgroundColor: '#7c3aed',
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#7c3aed', minWidth: '45px', textAlign: 'right' }}>
                              {percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recruitment Trends chart removed — interviewer role blocked */}
      </div>
    </DashboardLayout>
  );
}
