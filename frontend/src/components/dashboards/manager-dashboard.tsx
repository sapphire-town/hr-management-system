'use client';

import * as React from 'react';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  ClipboardCheck,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import { PendingApprovals, type ApprovalItem } from '@/components/dashboard/pending-approvals';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { CalendarWidget, type CalendarEvent } from '@/components/dashboard/calendar-widget';
import { LineChart } from '@/components/charts/line-chart';
import { cn } from '@/lib/utils';

// Mock data - replace with API calls
const stats = {
  teamSize: 12,
  presentToday: 10,
  pendingLeaves: 3,
  pendingReports: 5,
};

const teamMembers = [
  { id: '1', name: 'Alice Johnson', status: 'present', avatar: null },
  { id: '2', name: 'Bob Smith', status: 'present', avatar: null },
  { id: '3', name: 'Carol Williams', status: 'leave', avatar: null },
  { id: '4', name: 'David Brown', status: 'present', avatar: null },
  { id: '5', name: 'Emma Davis', status: 'present', avatar: null },
  { id: '6', name: 'Frank Miller', status: 'absent', avatar: null },
  { id: '7', name: 'Grace Lee', status: 'present', avatar: null },
  { id: '8', name: 'Henry Wilson', status: 'present', avatar: null },
];

const pendingApprovals: ApprovalItem[] = [
  {
    id: '1',
    type: 'leave',
    title: 'Leave Requests',
    subtitle: 'From your team',
    count: 3,
    href: '/dashboard/leaves/approvals',
    icon: Calendar,
  },
  {
    id: '2',
    type: 'report',
    title: 'Daily Reports',
    subtitle: 'Pending verification',
    count: 5,
    href: '/dashboard/reports/daily',
    icon: FileText,
  },
  {
    id: '3',
    type: 'reimbursement',
    title: 'Reimbursements',
    subtitle: 'Team requests',
    count: 2,
    href: '/dashboard/reimbursements',
    icon: Clock,
  },
];

const performanceData = [
  { week: 'Week 1', score: 85, target: 90 },
  { week: 'Week 2', score: 88, target: 90 },
  { week: 'Week 3', score: 92, target: 90 },
  { week: 'Week 4', score: 87, target: 90 },
];

const calendarEvents: CalendarEvent[] = [
  { date: new Date(), type: 'present' },
  { date: new Date(Date.now() - 86400000), type: 'present' },
  { date: new Date(Date.now() - 2 * 86400000), type: 'present' },
  { date: new Date(Date.now() + 86400000), type: 'event', label: 'Team Meeting' },
  { date: new Date(Date.now() + 3 * 86400000), type: 'leave' },
];

const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'leave',
    title: 'Leave request from Carol',
    description: 'Sick leave for 2 days',
    user: { name: 'Carol Williams' },
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    status: 'pending',
  },
  {
    id: '2',
    type: 'performance',
    title: 'Daily report submitted',
    description: 'Alice completed daily tasks',
    user: { name: 'Alice Johnson' },
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: '3',
    type: 'attendance',
    title: 'Team meeting scheduled',
    description: 'Tomorrow at 10:00 AM',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
];

const quickActions = [
  { label: 'View Team', href: '/dashboard/team', icon: Users },
  { label: 'Approve Leaves', href: '/dashboard/leaves/approvals', icon: Calendar },
  { label: 'Review Reports', href: '/dashboard/reports/daily', icon: FileText },
  { label: 'Team Performance', href: '/dashboard/performance', icon: TrendingUp },
];

const statusColors: Record<string, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  leave: 'bg-blue-500',
  half_day: 'bg-yellow-500',
};

export function ManagerDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid>
        <StatsCard
          title="Team Size"
          value={stats.teamSize}
          icon={Users}
        />
        <StatsCard
          title="Present Today"
          value={stats.presentToday}
          trend={{ value: 83, label: '% attendance' }}
          icon={CheckCircle}
        />
        <StatsCard
          title="Pending Leaves"
          value={stats.pendingLeaves}
          trend={{ value: -2, label: 'from last week' }}
          icon={Calendar}
        />
        <StatsCard
          title="Reports to Review"
          value={stats.pendingReports}
          icon={FileText}
        />
      </StatsGrid>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Attendance Today */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Team Attendance Today</h3>
          <div className="grid grid-cols-2 gap-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name.split(' ')[0]}</p>
                  <div className="flex items-center gap-1">
                    <span className={cn('h-2 w-2 rounded-full', statusColors[member.status])} />
                    <span className="text-xs text-muted-foreground capitalize">{member.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <PendingApprovals items={pendingApprovals} />

        {/* Calendar */}
        <CalendarWidget events={calendarEvents} title="Team Calendar" />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Team Performance"
          subtitle="Weekly performance score vs target"
        >
          <LineChart
            data={performanceData}
            dataKey={['score', 'target']}
            xAxisKey="week"
            showLegend
          />
        </ChartCard>

        <ActivityFeed
          activities={recentActivities}
          title="Team Activity"
          subtitle="Recent team updates"
          showViewAll
        />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />
    </div>
  );
}
