'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Building2,
  ClipboardList,
  CheckCircle,
  Users,
  TrendingUp,
  GraduationCap,
  Clock,
  Calendar,
  Loader2,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { recruitmentAPI } from '@/lib/api-client';

interface PlacementDrive {
  id: string;
  collegeName: string;
  driveDate: string;
  roles: Array<{ name: string; description: string; positions?: number }>;
  interviewers: Array<{
    id: string;
    interviewer: { id: string; firstName: string; lastName: string };
  }>;
  _count: { students: number };
}

const quickActions = [
  { label: 'My Drives', href: '/dashboard/my-drives', icon: Building2 },
  { label: 'Leave Management', href: '/dashboard/leaves', icon: Calendar },
  { label: 'My Attendance', href: '/dashboard/attendance', icon: ClipboardList },
  { label: 'Profile', href: '/dashboard/profile', icon: Users },
];

export function InterviewerDashboard() {
  const [drives, setDrives] = React.useState<PlacementDrive[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await recruitmentAPI.getMyDrives();
        setDrives(response.data || []);
      } catch (error) {
        console.error('Error fetching drives:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate stats
  const totalDrives = drives.length;
  const upcomingDrives = drives.filter(d => new Date(d.driveDate) >= new Date()).length;
  const completedDrives = totalDrives - upcomingDrives;
  const totalStudents = drives.reduce((acc, d) => acc + d._count.students, 0);

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats */}
      <StatsGrid>
        <StatsCard
          title="Assigned Drives"
          value={totalDrives}
          icon={Building2}
        />
        <StatsCard
          title="Upcoming Drives"
          value={upcomingDrives}
          icon={Clock}
        />
        <StatsCard
          title="Completed Drives"
          value={completedDrives}
          icon={CheckCircle}
        />
        <StatsCard
          title="Total Students"
          value={totalStudents}
          icon={GraduationCap}
        />
      </StatsGrid>

      {/* Assigned Drives */}
      <div style={cardStyle}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              My Assigned Drives
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              Placement drives you are assigned to interview
            </p>
          </div>
          <Link
            href="/dashboard/my-drives"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#7c3aed',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            View All
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 style={{ height: '32px', width: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : drives.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Building2 style={{ height: '48px', width: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              No placement drives assigned yet
            </p>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
              HR will assign you to placement drives for interviewing
            </p>
          </div>
        ) : (
          <div>
            {drives.slice(0, 5).map((drive, index) => {
              const isUpcoming = new Date(drive.driveDate) >= new Date();

              return (
                <Link
                  key={drive.id}
                  href="/dashboard/my-drives"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: index < Math.min(drives.length - 1, 4) ? '1px solid #f1f5f9' : 'none',
                    textDecoration: 'none',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Building2 style={{ width: '24px', height: '24px', color: '#7c3aed' }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#111827' }}>
                        {drive.collegeName}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6b7280' }}>
                          <Calendar style={{ width: '14px', height: '14px' }} />
                          {new Date(drive.driveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6b7280' }}>
                          <GraduationCap style={{ width: '14px', height: '14px' }} />
                          {drive._count.students} students
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: isUpcoming ? '#dcfce7' : '#f3f4f6',
                        color: isUpcoming ? '#166534' : '#6b7280',
                        fontWeight: 500,
                      }}
                    >
                      {isUpcoming ? 'Upcoming' : 'Completed'}
                    </span>
                    <ChevronRight style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Interviewer Tips */}
      <div style={cardStyle}>
        <div style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            Interviewer Guidelines
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckCircle style={{ width: '20px', height: '20px', color: '#16a34a' }} />
                <span style={{ fontWeight: 600, color: '#166534', fontSize: '14px' }}>Round 1 - Technical</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#15803d' }}>
                Assess coding skills, problem-solving, and technical knowledge
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock style={{ width: '20px', height: '20px', color: '#d97706' }} />
                <span style={{ fontWeight: 600, color: '#92400e', fontSize: '14px' }}>On Hold</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#a16207' }}>
                Use when candidate needs further review or additional assessment
              </p>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#ede9fe', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingUp style={{ width: '20px', height: '20px', color: '#7c3aed' }} />
                <span style={{ fontWeight: 600, color: '#6d28d9', fontSize: '14px' }}>Round 2 - Advanced</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#7c3aed' }}>
                Final technical round for candidates who passed Round 1
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
