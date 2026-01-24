'use client';

import * as React from 'react';
import {
  Users,
  Building2,
  TrendingUp,
  Award,
  UserPlus,
  FileText,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { BarChart } from '@/components/charts/bar-chart';
import { AreaChart } from '@/components/charts/area-chart';
import { DonutChart } from '@/components/charts/pie-chart';

// Mock data - replace with API calls
const stats = {
  totalEmployees: 254,
  departments: 8,
  hiringRequests: 12,
  performanceScore: 94,
};

const departmentData = [
  { name: 'Engineering', employees: 85, performance: 92 },
  { name: 'Sales', employees: 45, performance: 88 },
  { name: 'Marketing', employees: 32, performance: 90 },
  { name: 'HR', employees: 18, performance: 95 },
  { name: 'Finance', employees: 24, performance: 91 },
  { name: 'Operations', employees: 50, performance: 87 },
];

const hiringTrendData = [
  { month: 'Jul', hired: 12, openings: 15 },
  { month: 'Aug', hired: 15, openings: 18 },
  { month: 'Sep', hired: 8, openings: 12 },
  { month: 'Oct', hired: 18, openings: 20 },
  { month: 'Nov', hired: 14, openings: 16 },
  { month: 'Dec', hired: 10, openings: 14 },
];

const employeeDistribution = [
  { name: 'Full-time', value: 210 },
  { name: 'Part-time', value: 24 },
  { name: 'Contract', value: 15 },
  { name: 'Intern', value: 5 },
];

const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'general',
    title: 'Q4 performance reviews completed',
    description: 'All departments have submitted their reviews',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: '2',
    type: 'reward',
    title: 'New Director\'s List nominations',
    description: '5 employees nominated this month',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'general',
    title: 'Annual budget approved',
    description: 'HR budget for 2024 has been finalized',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'approved',
  },
  {
    id: '4',
    type: 'leave',
    title: 'Holiday schedule published',
    description: '2024 company holidays announced',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
];

const quickActions = [
  { label: 'View All Employees', href: '/dashboard/employees', icon: Users },
  { label: 'Department Overview', href: '/dashboard/departments', icon: Building2 },
  { label: "Director's List", href: '/dashboard/directors-list', icon: Award },
  { label: 'Hiring Requests', href: '/dashboard/hiring', icon: UserPlus },
];

export function DirectorDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid>
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees}
          trend={{ value: 5.2, label: 'from last month' }}
          icon={Users}
        />
        <StatsCard
          title="Departments"
          value={stats.departments}
          icon={Building2}
        />
        <StatsCard
          title="Active Hiring Requests"
          value={stats.hiringRequests}
          trend={{ value: 12, label: 'new this month' }}
          icon={UserPlus}
        />
        <StatsCard
          title="Avg Performance"
          value={`${stats.performanceScore}%`}
          trend={{ value: 2.1, label: 'from last quarter' }}
          icon={TrendingUp}
        />
      </StatsGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Department Performance"
          subtitle="Employee count and performance by department"
        >
          <BarChart
            data={departmentData}
            dataKey={['employees', 'performance']}
            xAxisKey="name"
            showLegend
          />
        </ChartCard>

        <ChartCard
          title="Hiring Trends"
          subtitle="Monthly hiring vs open positions"
        >
          <AreaChart
            data={hiringTrendData}
            dataKey={['hired', 'openings']}
            xAxisKey="month"
            showLegend
          />
        </ChartCard>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="Employee Distribution"
          subtitle="By employment type"
        >
          <DonutChart data={employeeDistribution} />
        </ChartCard>

        <div className="lg:col-span-2">
          <ActivityFeed
            activities={recentActivities}
            title="Company Updates"
            subtitle="Recent organizational activities"
            showViewAll
            onViewAll={() => console.log('View all')}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />
    </div>
  );
}
