'use client';

import * as React from 'react';
import {
  Calendar,
  FileText,
  DollarSign,
  Package,
  Receipt,
  Clock,
  CheckCircle,
  TrendingUp,
  Folder,
  MessageSquare,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { CalendarWidget, type CalendarEvent } from '@/components/dashboard/calendar-widget';
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressWithLabel } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Mock data - replace with API calls
const stats = {
  attendanceThisMonth: 18,
  totalWorkingDays: 22,
  pendingRequests: 2,
  performanceScore: 92,
};

const leaveBalances = [
  { type: 'Sick Leave', used: 2, total: 12, color: 'bg-red-500' },
  { type: 'Casual Leave', used: 4, total: 12, color: 'bg-blue-500' },
  { type: 'Earned Leave', used: 0, total: 15, color: 'bg-green-500' },
];

const myRequests = [
  {
    id: '1',
    type: 'Leave',
    title: 'Casual Leave',
    date: '15 Jan - 17 Jan',
    status: 'pending',
  },
  {
    id: '2',
    type: 'Reimbursement',
    title: 'Travel Expense',
    date: '10 Jan',
    status: 'approved',
  },
  {
    id: '3',
    type: 'Asset',
    title: 'Laptop Stand',
    date: '5 Jan',
    status: 'rejected',
  },
];

const recentPayslips = [
  { month: 'December 2023', amount: 75000, status: 'paid' },
  { month: 'November 2023', amount: 75000, status: 'paid' },
  { month: 'October 2023', amount: 72000, status: 'paid' },
];

const calendarEvents: CalendarEvent[] = [
  { date: new Date(), type: 'present' },
  { date: new Date(Date.now() - 86400000), type: 'present' },
  { date: new Date(Date.now() - 2 * 86400000), type: 'present' },
  { date: new Date(Date.now() - 3 * 86400000), type: 'half_day' },
  { date: new Date(Date.now() - 6 * 86400000), type: 'leave' },
  { date: new Date(Date.now() - 7 * 86400000), type: 'holiday' },
];

const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'attendance',
    title: 'Checked in at 9:15 AM',
    timestamp: new Date(),
    status: 'completed',
  },
  {
    id: '2',
    type: 'leave',
    title: 'Leave request submitted',
    description: 'Casual leave for Jan 15-17',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'pending',
  },
  {
    id: '3',
    type: 'performance',
    title: 'Daily report submitted',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: '4',
    type: 'document',
    title: 'Payslip available',
    description: 'December 2023 payslip is ready',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
  },
];

const quickActions = [
  { label: 'Apply Leave', href: '/dashboard/leaves/apply', icon: Calendar },
  { label: 'Submit Report', href: '/dashboard/reports/daily/new', icon: FileText },
  { label: 'Request Asset', href: '/dashboard/assets/new', icon: Package },
  { label: 'Reimbursement', href: '/dashboard/reimbursements/new', icon: Receipt },
];

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  paid: 'success',
};

export function EmployeeDashboard() {
  const attendancePercentage = Math.round((stats.attendanceThisMonth / stats.totalWorkingDays) * 100);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid>
        <StatsCard
          title="Attendance This Month"
          value={`${stats.attendanceThisMonth}/${stats.totalWorkingDays}`}
          trend={{ value: attendancePercentage, label: '% attendance' }}
          icon={CheckCircle}
        />
        <StatsCard
          title="Pending Requests"
          value={stats.pendingRequests}
          icon={Clock}
        />
        <StatsCard
          title="Performance Score"
          value={`${stats.performanceScore}%`}
          trend={{ value: 3, label: 'from last month' }}
          icon={TrendingUp}
        />
        <StatsCard
          title="Total Leave Balance"
          value={`${leaveBalances.reduce((sum, l) => sum + (l.total - l.used), 0)} days`}
          icon={Calendar}
        />
      </StatsGrid>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Balances */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Leave Balances</h3>
          <div className="space-y-4">
            {leaveBalances.map((leave) => (
              <div key={leave.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{leave.type}</span>
                  <span className="text-sm text-muted-foreground">
                    {leave.total - leave.used} / {leave.total} days
                  </span>
                </div>
                <Progress
                  value={((leave.total - leave.used) / leave.total) * 100}
                  indicatorClassName={leave.color}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Calendar */}
        <CalendarWidget events={calendarEvents} title="My Attendance" />

        {/* My Requests */}
        <div className="card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">My Requests</h3>
            <p className="text-sm text-muted-foreground mt-1">Recent submissions</p>
          </div>
          <div className="divide-y divide-border">
            {myRequests.map((request) => (
              <div key={request.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{request.type}</span>
                    <Badge variant={statusVariant[request.status]}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mt-1">{request.title}</p>
                  <p className="text-xs text-muted-foreground">{request.date}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border">
            <button className="w-full text-sm text-primary hover:underline">
              View all requests
            </button>
          </div>
        </div>
      </div>

      {/* Payslips & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payslips */}
        <div className="card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Payslips</h3>
            <p className="text-sm text-muted-foreground mt-1">Download your payslips</p>
          </div>
          <div className="divide-y divide-border">
            {recentPayslips.map((payslip) => (
              <div key={payslip.month} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{payslip.month}</p>
                    <p className="text-xs text-muted-foreground">
                      Rs. {payslip.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <button className="btn-outline text-xs py-1 px-2">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <ActivityFeed
          activities={recentActivities}
          title="My Activity"
          subtitle="Recent actions and updates"
          showViewAll
        />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />
    </div>
  );
}
