'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { employeeAPI, leaveAPI, dailyReportAPI } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'NOT_MARKED';
  checkInTime?: string;
}

interface LeaveRequest {
  id: string;
  employee: { firstName: string; lastName: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: string;
}

interface PendingReport {
  id: string;
  employee: { firstName: string; lastName: string };
  submittedAt: string;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  PRESENT: { color: '#16a34a', bg: '#dcfce7', label: 'Present' },
  ABSENT: { color: '#dc2626', bg: '#fee2e2', label: 'Absent' },
  HALF_DAY: { color: '#d97706', bg: '#fef3c7', label: 'Half Day' },
  LEAVE: { color: '#2563eb', bg: '#dbeafe', label: 'On Leave' },
  NOT_MARKED: { color: '#6b7280', bg: '#f3f4f6', label: 'Not Marked' },
};

export function ManagerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [pendingLeaves, setPendingLeaves] = React.useState<LeaveRequest[]>([]);
  const [pendingReports, setPendingReports] = React.useState<PendingReport[]>([]);
  const [stats, setStats] = React.useState({
    teamSize: 0,
    presentToday: 0,
    absentToday: 0,
    onLeave: 0,
    pendingLeaveCount: 0,
    pendingReportCount: 0,
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch team members with attendance from the combined endpoint
        let membersWithStatus: TeamMember[] = [];
        try {
          const teamAttendanceRes = await employeeAPI.getMyTeamAttendance();
          const teamAttendanceData = teamAttendanceRes.data || [];

          // Backend returns { id, name, status } where name is "FirstName LastName"
          membersWithStatus = teamAttendanceData.map((member: any) => {
            const nameParts = (member.name || '').split(' ');
            return {
              id: member.id,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              status: member.status || 'NOT_MARKED',
            };
          });
        } catch (e) {
          // Fallback to just getting team members without attendance
          console.log('Trying fallback team endpoint');
          try {
            const teamRes = await employeeAPI.getMyTeam();
            const teamData = teamRes.data || [];
            membersWithStatus = teamData.map((member: any) => ({
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              status: 'NOT_MARKED' as const,
            }));
          } catch (e2) {
            console.log('Error fetching team');
          }
        }

        setTeamMembers(membersWithStatus);

        // Calculate stats
        const presentCount = membersWithStatus.filter((m: TeamMember) => m.status === 'PRESENT').length;
        const absentCount = membersWithStatus.filter((m: TeamMember) => m.status === 'ABSENT').length;
        const leaveCount = membersWithStatus.filter((m: TeamMember) => m.status === 'LEAVE').length;

        // Fetch pending leave requests
        try {
          const leavesRes = await leaveAPI.getPendingForManager();
          const pending = leavesRes.data || [];
          setPendingLeaves(pending.slice(0, 5));
          setStats(prev => ({ ...prev, pendingLeaveCount: pending.length }));
        } catch (e) {
          console.log('Error fetching leaves');
        }

        // Fetch pending reports
        try {
          const reportsRes = await dailyReportAPI.getPendingTeamReports();
          const reports = reportsRes.data || [];
          setPendingReports(reports.slice(0, 5));
          setStats(prev => ({ ...prev, pendingReportCount: reports.length }));
        } catch (e) {
          console.log('Error fetching reports');
        }

        setStats(prev => ({
          ...prev,
          teamSize: membersWithStatus.length,
          presentToday: presentCount,
          absentToday: absentCount,
          onLeave: leaveCount,
        }));

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 style={{ width: 32, height: 32, color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Warning if employee record is missing */}
      {!user?.employee && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 12,
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <AlertCircle style={{ width: 20, height: 20, color: '#d97706', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', margin: 0 }}>
              Account Setup Incomplete
            </p>
            <p style={{ fontSize: 13, color: '#a16207', margin: '4px 0 0 0' }}>
              Your user account is not linked to an employee profile. Team management features (leave approvals, team attendance, reports) may not work correctly. Please contact your HR administrator to link your employee profile.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Team Size', value: stats.teamSize, icon: Users, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Present Today', value: stats.presentToday, icon: CheckCircle, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Absent Today', value: stats.absentToday, icon: XCircle, color: '#dc2626', bg: '#fee2e2' },
          { label: 'On Leave', value: stats.onLeave, icon: Calendar, color: '#2563eb', bg: '#dbeafe' },
        ].map((stat) => (
          <div key={stat.label} style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <stat.icon style={{ width: 24, height: 24, color: stat.color }} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
        {/* Team Attendance Today */}
        <div style={cardStyle}>
          <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#111827' }}>Team Attendance Today</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>{stats.presentToday} of {stats.teamSize} present</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/attendance')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              View All <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ padding: 16 }}>
            {teamMembers.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>
                <Users style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No team members found</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {teamMembers.map((member) => {
                  const config = statusConfig[member.status] || statusConfig.NOT_MARKED;
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                      }}>
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {member.firstName}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: config.color,
                          }} />
                          <span style={{ fontSize: 12, color: config.color, fontWeight: 500 }}>{config.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div style={cardStyle}>
          <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#111827' }}>Pending Leave Requests</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>{stats.pendingLeaveCount} requests awaiting approval</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/leaves/approvals')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              View All <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ padding: 16 }}>
            {pendingLeaves.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>
                <CheckCircle style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No pending leave requests</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Calendar style={{ width: 18, height: 18, color: '#fff' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>
                          {leave.employee.firstName} {leave.employee.lastName}
                        </p>
                        <p style={{ fontSize: 12, color: '#92400e', margin: '2px 0 0 0' }}>
                          {leave.leaveType} • {leave.numberOfDays} day(s)
                        </p>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: '#fff',
                      color: '#92400e',
                    }}>
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={cardStyle}>
        <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#111827' }}>Quick Actions</h3>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { label: 'My Team', href: '/dashboard/managers', icon: Users, color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Approve Leaves', href: '/dashboard/leaves/approvals', icon: Calendar, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Verify Reports', href: '/dashboard/reports/verify', icon: FileText, color: '#2563eb', bg: '#dbeafe' },
            { label: 'Team Performance', href: '/dashboard/performance', icon: TrendingUp, color: '#d97706', bg: '#fef3c7' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = action.bg;
                e.currentTarget.style.borderColor = action.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: action.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <action.icon style={{ width: 20, height: 20, color: action.color }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
