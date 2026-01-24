'use client';

import * as React from 'react';
import {
  Calendar,
  FileText,
  DollarSign,
  Receipt,
  Package,
  UserPlus,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import { PendingApprovals, type ApprovalItem } from '@/components/dashboard/pending-approvals';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';

// Mock data - replace with API calls
const stats = {
  pendingLeaves: 18,
  pendingDocuments: 7,
  pendingReimbursements: 12,
  newEmployeesThisMonth: 5,
};

const pendingApprovals: ApprovalItem[] = [
  {
    id: '1',
    type: 'leave',
    title: 'Leave Requests',
    subtitle: 'Pending HR approval',
    count: 18,
    href: '/dashboard/leaves/approvals',
    icon: Calendar,
    urgent: true,
  },
  {
    id: '2',
    type: 'document',
    title: 'Document Verification',
    subtitle: 'Pending review',
    count: 7,
    href: '/dashboard/documents',
    icon: FileText,
  },
  {
    id: '3',
    type: 'reimbursement',
    title: 'Reimbursements',
    subtitle: 'Pending approval',
    count: 12,
    href: '/dashboard/reimbursements',
    icon: Receipt,
  },
  {
    id: '4',
    type: 'asset',
    title: 'Asset Requests',
    subtitle: 'Pending allocation',
    count: 4,
    href: '/dashboard/assets',
    icon: Package,
  },
];

const leaveByTypeData = [
  { type: 'Sick', pending: 5, approved: 12, rejected: 2 },
  { type: 'Casual', pending: 8, approved: 25, rejected: 3 },
  { type: 'Earned', pending: 5, approved: 18, rejected: 1 },
];

const attendanceTrendData = [
  { week: 'Week 1', attendance: 95, target: 98 },
  { week: 'Week 2', attendance: 92, target: 98 },
  { week: 'Week 3', attendance: 97, target: 98 },
  { week: 'Week 4', attendance: 94, target: 98 },
];

const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'leave',
    title: 'Leave request from John Doe',
    description: 'Casual leave for 3 days',
    user: { name: 'John Doe' },
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'pending',
  },
  {
    id: '2',
    type: 'document',
    title: 'Document uploaded',
    description: 'Offer letter for Sarah Smith',
    user: { name: 'Sarah Smith' },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'pending',
  },
  {
    id: '3',
    type: 'general',
    title: 'New employee onboarded',
    description: 'Mike Johnson joined Engineering',
    user: { name: 'Mike Johnson' },
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: '4',
    type: 'leave',
    title: 'Leave approved',
    description: 'Sick leave for Emily Davis',
    user: { name: 'Emily Davis' },
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    status: 'approved',
  },
];

const quickActions = [
  { label: 'Process Leave', href: '/dashboard/leaves/approvals', icon: Calendar },
  { label: 'Verify Documents', href: '/dashboard/documents', icon: FileText },
  { label: 'Run Payroll', href: '/dashboard/payroll', icon: DollarSign },
  { label: 'Add Employee', href: '/dashboard/employees/new', icon: UserPlus },
];

export function HRDashboard() {
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats */}
      <StatsGrid>
        <StatsCard
          title="Pending Leaves"
          value={stats.pendingLeaves}
          trend={{ value: -5, label: 'from yesterday' }}
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
          trend={{ value: 3, label: 'new today' }}
          icon={Receipt}
        />
        <StatsCard
          title="New Employees"
          value={stats.newEmployeesThisMonth}
          trend={{ value: 25, label: 'from last month' }}
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
              data={leaveByTypeData}
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
              data={attendanceTrendData}
              dataKey={['attendance', 'target']}
              xAxisKey="week"
              showLegend
            />
          </ChartCard>
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
          activities={recentActivities}
          title="Recent HR Activities"
          subtitle="Latest actions and requests"
          showViewAll
        />
        <QuickActions actions={quickActions} columns={2} />
      </div>
    </div>
  );
}
