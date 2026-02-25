'use client';

import * as React from 'react';
import {
  Calendar,
  FileText,
  DollarSign,
  Receipt,
  Package,
  UserPlus,
  Loader2,
  GraduationCap,
  MapPin,
  CalendarDays,
  UsersRound,
  CheckCircle,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import { PendingApprovals, type ApprovalItem } from '@/components/dashboard/pending-approvals';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';
import { dashboardAPI, recruitmentAPI } from '@/lib/api-client';

const approvalConfig: Record<string, { icon: typeof Calendar; href: string; subtitle: string }> = {
  leave: { icon: Calendar, href: '/dashboard/leaves/approvals', subtitle: 'Pending HR approval' },
  document: { icon: FileText, href: '/dashboard/documents', subtitle: 'Pending review' },
  reimbursement: { icon: Receipt, href: '/dashboard/reimbursements', subtitle: 'Pending approval' },
  asset: { icon: Package, href: '/dashboard/assets', subtitle: 'Pending allocation' },
};

const quickActions = [
  { label: 'Process Leave', href: '/dashboard/leaves/approvals', icon: Calendar },
  { label: 'Verify Documents', href: '/dashboard/documents', icon: FileText },
  { label: 'Run Payroll', href: '/dashboard/payroll', icon: DollarSign },
  { label: 'Add Employee', href: '/dashboard/employees/new', icon: UserPlus },
  { label: 'Placement Drives', href: '/dashboard/recruitment', icon: GraduationCap },
];

export function HRDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({ pendingLeaves: 0, pendingDocuments: 0, pendingReimbursements: 0, newEmployeesThisMonth: 0 });
  const [pendingApprovals, setPendingApprovals] = React.useState<ApprovalItem[]>([]);
  const [leaveData, setLeaveData] = React.useState<{ type: string; pending: number; approved: number; rejected: number }[]>([]);
  const [attendanceData, setAttendanceData] = React.useState<{ week: string; attendance: number; target: number }[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
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
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
      setIsMediumScreen(window.innerWidth >= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, pendingRes, leaveChartRes, attendanceChartRes, activitiesRes, recruitRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getPendingApprovals(),
          dashboardAPI.getChartData('leave'),
          dashboardAPI.getChartData('attendance'),
          dashboardAPI.getActivities(10),
          recruitmentAPI.getOverallStatistics().catch(() => ({ data: null })),
        ]);

        if (statsRes.data) {
          setStats(statsRes.data);
        }

        if (Array.isArray(pendingRes.data)) {
          setPendingApprovals(
            pendingRes.data.map((item: { type: string; title: string; count: number }, index: number) => {
              const config = approvalConfig[item.type] || approvalConfig.leave;
              return {
                id: String(index + 1),
                type: item.type,
                title: item.title,
                subtitle: config.subtitle,
                count: item.count,
                href: config.href,
                icon: config.icon,
                urgent: item.count > 10,
              };
            })
          );
        }

        if (Array.isArray(leaveChartRes.data)) {
          setLeaveData(leaveChartRes.data);
        }

        if (Array.isArray(attendanceChartRes.data)) {
          setAttendanceData(attendanceChartRes.data);
        }

        if (Array.isArray(activitiesRes.data)) {
          const validTypes = ['leave', 'attendance', 'document', 'performance', 'reward', 'general'] as const;
          type ActivityType = typeof validTypes[number];
          setActivities(
            activitiesRes.data.map((item: { id: string; type: string; title: string; description: string; timestamp: string; read: boolean }) => ({
              id: item.id,
              type: (validTypes.includes(item.type as ActivityType) ? item.type : 'general') as ActivityType,
              title: item.title,
              description: item.description,
              user: { name: '' },
              timestamp: new Date(item.timestamp),
              status: (item.read ? 'completed' : 'pending') as 'completed' | 'pending',
            }))
          );
        }

        if (recruitRes.data) setRecruitmentStats(recruitRes.data);
      } catch (error) {
        console.error('Error fetching HR dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#2563eb' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats */}
      <StatsGrid>
        <StatsCard
          title="Pending Leaves"
          value={stats.pendingLeaves}
          icon={Calendar}
        />
        <StatsCard
          title="Pending Documents"
          value={stats.pendingDocuments}
          icon={FileText}
        />
        <StatsCard
          title="Reimbursements"
          value={stats.pendingReimbursements}
          icon={Receipt}
        />
        <StatsCard
          title="New Employees"
          value={stats.newEmployeesThisMonth}
          icon={UserPlus}
        />
      </StatsGrid>

      {/* Main Content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isLargeScreen ? '1fr 2fr' : '1fr',
          gap: '24px',
        }}
      >
        {/* Pending Approvals */}
        <div>
          <PendingApprovals items={pendingApprovals} />
        </div>

        {/* Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ChartCard
            title="Leave Requests by Type"
            subtitle="Current month breakdown"
          >
            <BarChart
              data={leaveData}
              dataKey={['pending', 'approved', 'rejected']}
              xAxisKey="type"
              showLegend
              stacked
            />
          </ChartCard>

          <ChartCard
            title="Attendance Trend"
            subtitle="Weekly attendance rate vs target"
          >
            <LineChart
              data={attendanceData}
              dataKey={['attendance', 'target']}
              xAxisKey="week"
              showLegend
            />
          </ChartCard>
        </div>
      </div>

      {/* Placement Drives Widget */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
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
              Manage →
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

      {/* Activity Feed & Quick Actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isLargeScreen ? '1fr 1fr' : '1fr',
          gap: '24px',
        }}
      >
        <ActivityFeed
          activities={activities}
          title="Recent HR Activities"
          subtitle="Latest actions and requests"
          showViewAll
        />
        <QuickActions actions={quickActions} columns={2} />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
