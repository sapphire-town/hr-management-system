'use client';

import * as React from 'react';
import {
  Calendar,
  FileText,
  Package,
  Receipt,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { performanceAPI, dashboardAPI } from '@/lib/api-client';

interface PerformanceData {
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

interface PerformanceHistory {
  date: string;
  score: number;
  attendanceRate: number;
}

const quickActions = [
  { label: 'Apply Leave', href: '/dashboard/leaves/apply', icon: Calendar },
  { label: 'View Documents', href: '/dashboard/documents', icon: FileText },
  { label: 'Request Asset', href: '/dashboard/assets', icon: Package },
  { label: 'Reimbursement', href: '/dashboard/reimbursements', icon: Receipt },
];

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '24px',
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: '18px',
    color: '#111827',
    margin: '0 0 16px 0',
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  progressItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4b5563',
  },
  progressBar: {
    width: '100%',
    height: '12px',
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  trendSection: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveProgressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  attendanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  attendanceCard: {
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  attendanceValue: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0',
  },
  attendanceLabel: {
    fontSize: '14px',
    margin: '4px 0 0 0',
  },
  emptyChart: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '256px',
    color: '#6b7280',
  },
};

export function EmployeeDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [performance, setPerformance] = React.useState<PerformanceData | null>(null);
  const [performanceHistory, setPerformanceHistory] = React.useState<PerformanceHistory[]>([]);
  const [leaveBalances, setLeaveBalances] = React.useState<any[]>([]);
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);

  React.useEffect(() => {
    const checkScreen = () => setIsLargeScreen(window.innerWidth >= 1024);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [perfRes, historyRes, dashRes] = await Promise.all([
          performanceAPI.getMyPerformance({ period: 'monthly' }),
          performanceAPI.getMyHistory(6),
          dashboardAPI.getStats(),
        ]);
        setPerformance(perfRes.data);
        setPerformanceHistory(historyRes.data || []);

        // Construct leave balances from dashboard stats
        if (dashRes.data?.leaveBalance) {
          const lb = dashRes.data.leaveBalance;
          setLeaveBalances([
            { type: 'Sick Leave', used: 12 - (lb.sick || 0), total: 12, remaining: lb.sick || 0, color: '#ef4444' },
            { type: 'Casual Leave', used: 12 - (lb.casual || 0), total: 12, remaining: lb.casual || 0, color: '#3b82f6' },
            { type: 'Earned Leave', used: 15 - (lb.earned || 0), total: 15, remaining: lb.earned || 0, color: '#22c55e' },
          ]);
        } else {
          setLeaveBalances([
            { type: 'Sick Leave', used: 0, total: 12, remaining: 12, color: '#ef4444' },
            { type: 'Casual Leave', used: 0, total: 12, remaining: 12, color: '#3b82f6' },
            { type: 'Earned Leave', used: 0, total: 15, remaining: 15, color: '#22c55e' },
          ]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLeaveBalances([
          { type: 'Sick Leave', used: 0, total: 12, remaining: 12, color: '#ef4444' },
          { type: 'Casual Leave', used: 0, total: 12, remaining: 12, color: '#3b82f6' },
          { type: 'Earned Leave', used: 0, total: 15, remaining: 15, color: '#22c55e' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp style={{ width: '16px', height: '16px', color: '#22c55e' }} />;
      case 'down':
        return <TrendingDown style={{ width: '16px', height: '16px', color: '#ef4444' }} />;
      default:
        return <Minus style={{ width: '16px', height: '16px', color: '#9ca3af' }} />;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <Loader2 style={{ width: '32px', height: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const attendancePercentage = performance?.attendanceScore || 0;
  const totalLeaveBalance = leaveBalances.reduce((sum, l) => sum + l.remaining, 0);

  const recentActivities: Activity[] = [
    {
      id: '1',
      type: 'performance',
      title: `Performance Score: ${performance?.overallScore || 0}%`,
      description: performance?.trend === 'up' ? 'Improved from last month' :
                   performance?.trend === 'down' ? 'Decreased from last month' : 'Stable',
      timestamp: new Date(),
      status: performance?.overallScore && performance.overallScore >= 75 ? 'completed' : 'pending',
    },
    {
      id: '2',
      type: 'attendance',
      title: `Attendance: ${performance?.daysPresent || 0}/${performance?.totalWorkingDays || 0} days`,
      description: `${performance?.attendanceScore || 0}% attendance rate`,
      timestamp: new Date(),
      status: attendancePercentage >= 90 ? 'completed' : 'pending',
    },
  ];

  return (
    <div style={styles.container}>
      {/* Stats Cards */}
      <StatsGrid>
        <StatsCard
          title="Attendance This Month"
          value={`${performance?.daysPresent || 0}/${performance?.totalWorkingDays || 0}`}
          trend={{ value: attendancePercentage, label: '% attendance' }}
          icon={CheckCircle}
        />
        <StatsCard
          title="Performance Score"
          value={`${performance?.overallScore || 0}%`}
          trend={performance?.trend === 'up' ? { value: performance.overallScore - performance.previousScore, label: 'from last month' } : undefined}
          icon={TrendingUp}
        />
        <StatsCard
          title="Leave Balance"
          value={`${totalLeaveBalance} days`}
          icon={Calendar}
        />
        <StatsCard
          title="Attendance Score"
          value={`${performance?.attendanceScore || 0}%`}
          icon={Clock}
        />
      </StatsGrid>

      {/* Performance Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: isLargeScreen ? 'repeat(2, 1fr)' : '1fr', gap: '24px' }}>
        {/* Performance Chart */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>My Performance Trend</h3>
          {performanceHistory.length > 0 ? (
            <div style={{ height: '256px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 16px' }}>
              {performanceHistory.map((h, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '40px',
                      backgroundColor: '#7c3aed',
                      borderRadius: '4px 4px 0 0',
                      height: `${Math.max(h.score * 2, 10)}px`,
                      transition: 'height 0.3s',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{h.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyChart}>No performance history available</div>
          )}
        </div>

        {/* Score Breakdown */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Score Breakdown</h3>
          <div style={styles.progressContainer}>
            <div style={styles.progressItem}>
              <div style={styles.progressHeader}>
                <span style={styles.progressLabel}>Overall Score</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#7c3aed' }}>{performance?.overallScore || 0}%</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ height: '100%', backgroundColor: '#7c3aed', borderRadius: '9999px', width: `${performance?.overallScore || 0}%`, transition: 'width 0.3s' }} />
              </div>
            </div>

            <div style={styles.progressItem}>
              <div style={styles.progressHeader}>
                <span style={styles.progressLabel}>Attendance</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>{performance?.attendanceScore || 0}%</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ height: '100%', backgroundColor: '#22c55e', borderRadius: '9999px', width: `${performance?.attendanceScore || 0}%`, transition: 'width 0.3s' }} />
              </div>
            </div>

            <div style={styles.progressItem}>
              <div style={styles.progressHeader}>
                <span style={styles.progressLabel}>Leave Management</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>{performance?.leaveScore || 0}%</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ height: '100%', backgroundColor: '#3b82f6', borderRadius: '9999px', width: `${performance?.leaveScore || 0}%`, transition: 'width 0.3s' }} />
              </div>
            </div>

            <div style={styles.progressItem}>
              <div style={styles.progressHeader}>
                <span style={styles.progressLabel}>Task Completion</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>{performance?.taskCompletionScore || 0}%</span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ height: '100%', backgroundColor: '#f59e0b', borderRadius: '9999px', width: `${performance?.taskCompletionScore || 0}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>

          <div style={styles.trendSection}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>vs Last Month</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getTrendIcon(performance?.trend || 'stable')}
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: performance?.trend === 'up' ? '#22c55e' : performance?.trend === 'down' ? '#ef4444' : '#6b7280'
              }}>
                {performance?.trend === 'up' ? '+' : performance?.trend === 'down' ? '-' : ''}
                {Math.abs((performance?.overallScore || 0) - (performance?.previousScore || 0))}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Balances & Attendance Details */}
      <div style={{ display: 'grid', gridTemplateColumns: isLargeScreen ? 'repeat(2, 1fr)' : '1fr', gap: '24px' }}>
        {/* Leave Balances */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Leave Balances</h3>
          <div style={styles.progressContainer}>
            {leaveBalances.map((leave) => (
              <div key={leave.type} style={styles.progressItem}>
                <div style={styles.progressHeader}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{leave.type}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {leave.remaining} / {leave.total} days
                  </span>
                </div>
                <div style={styles.leaveProgressBar}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: leave.color,
                      borderRadius: '9999px',
                      width: `${(leave.remaining / leave.total) * 100}%`,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Summary */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Attendance Summary</h3>
          <div style={styles.attendanceGrid}>
            <div style={{ ...styles.attendanceCard, backgroundColor: '#dcfce7' }}>
              <p style={{ ...styles.attendanceValue, color: '#16a34a' }}>{performance?.daysPresent || 0}</p>
              <p style={{ ...styles.attendanceLabel, color: '#15803d' }}>Days Present</p>
            </div>
            <div style={{ ...styles.attendanceCard, backgroundColor: '#fee2e2' }}>
              <p style={{ ...styles.attendanceValue, color: '#dc2626' }}>{performance?.daysAbsent || 0}</p>
              <p style={{ ...styles.attendanceLabel, color: '#b91c1c' }}>Days Absent</p>
            </div>
            <div style={{ ...styles.attendanceCard, backgroundColor: '#fef3c7' }}>
              <p style={{ ...styles.attendanceValue, color: '#ca8a04' }}>{performance?.halfDays || 0}</p>
              <p style={{ ...styles.attendanceLabel, color: '#a16207' }}>Half Days</p>
            </div>
            <div style={{ ...styles.attendanceCard, backgroundColor: '#dbeafe' }}>
              <p style={{ ...styles.attendanceValue, color: '#2563eb' }}>{performance?.leaveDays || 0}</p>
              <p style={{ ...styles.attendanceLabel, color: '#1d4ed8' }}>Leave Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed
        activities={recentActivities}
        title="Performance Summary"
        subtitle="Your current performance metrics"
      />

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />
    </div>
  );
}
