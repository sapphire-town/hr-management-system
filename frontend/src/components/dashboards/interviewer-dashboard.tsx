'use client';

import * as React from 'react';
import {
  Video,
  Building2,
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/dashboard/stats-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { ActivityFeed, type Activity } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { Badge } from '@/components/ui/badge';
import { DonutChart } from '@/components/charts/pie-chart';
import { cn } from '@/lib/utils';

// Mock data - replace with API calls
const stats = {
  scheduledInterviews: 5,
  completedThisMonth: 18,
  pendingEvaluations: 3,
  passRate: 68,
};

const upcomingInterviews = [
  {
    id: '1',
    candidate: 'Rahul Sharma',
    position: 'Software Engineer',
    time: 'Today, 2:00 PM',
    round: 'Technical Round 1',
    drive: 'Campus Drive - IIT Delhi',
  },
  {
    id: '2',
    candidate: 'Priya Patel',
    position: 'Software Engineer',
    time: 'Today, 4:00 PM',
    round: 'Technical Round 1',
    drive: 'Campus Drive - IIT Delhi',
  },
  {
    id: '3',
    candidate: 'Amit Kumar',
    position: 'Data Analyst',
    time: 'Tomorrow, 10:00 AM',
    round: 'HR Round',
    drive: 'Campus Drive - BITS Pilani',
  },
];

const pendingEvaluations = [
  {
    id: '1',
    candidate: 'Sneha Reddy',
    position: 'Frontend Developer',
    interviewDate: '12 Jan 2024',
    drive: 'Campus Drive - NIT Trichy',
  },
  {
    id: '2',
    candidate: 'Vikram Singh',
    position: 'Backend Developer',
    interviewDate: '11 Jan 2024',
    drive: 'Campus Drive - NIT Trichy',
  },
  {
    id: '3',
    candidate: 'Anjali Gupta',
    position: 'Software Engineer',
    interviewDate: '10 Jan 2024',
    drive: 'Campus Drive - IIT Delhi',
  },
];

const evaluationStats = [
  { name: 'Selected', value: 12, color: 'hsl(142, 76%, 36%)' },
  { name: 'Rejected', value: 5, color: 'hsl(0, 84%, 60%)' },
  { name: 'On Hold', value: 1, color: 'hsl(45, 93%, 47%)' },
];

const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'general',
    title: 'Interview completed',
    description: 'Technical round with Rahul Sharma',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'completed',
  },
  {
    id: '2',
    type: 'general',
    title: 'Evaluation submitted',
    description: 'Priya Patel - Selected',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    status: 'approved',
  },
  {
    id: '3',
    type: 'general',
    title: 'Assigned to new drive',
    description: 'Campus Drive - BITS Pilani',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

const quickActions = [
  { label: 'My Interviews', href: '/dashboard/interviews', icon: Video },
  { label: 'Submit Evaluation', href: '/dashboard/evaluations/new', icon: ClipboardList },
  { label: 'Placement Drives', href: '/dashboard/drives', icon: Building2 },
  { label: 'Past Evaluations', href: '/dashboard/evaluations', icon: CheckCircle },
];

export function InterviewerDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsGrid>
        <StatsCard
          title="Scheduled Interviews"
          value={stats.scheduledInterviews}
          trend={{ value: 2, label: 'today' }}
          icon={Video}
        />
        <StatsCard
          title="Completed This Month"
          value={stats.completedThisMonth}
          icon={CheckCircle}
        />
        <StatsCard
          title="Pending Evaluations"
          value={stats.pendingEvaluations}
          icon={ClipboardList}
        />
        <StatsCard
          title="Selection Rate"
          value={`${stats.passRate}%`}
          trend={{ value: 5, label: 'from last month' }}
          icon={TrendingUp}
        />
      </StatsGrid>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Interviews */}
        <div className="card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Upcoming Interviews</h3>
            <p className="text-sm text-muted-foreground mt-1">Your scheduled interviews</p>
          </div>
          <div className="divide-y divide-border">
            {upcomingInterviews.map((interview) => (
              <div key={interview.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {interview.candidate.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{interview.candidate}</p>
                      <p className="text-xs text-muted-foreground">{interview.position}</p>
                      <p className="text-xs text-muted-foreground mt-1">{interview.drive}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="primary">{interview.round}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{interview.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border">
            <button className="w-full text-sm text-primary hover:underline">
              View all interviews
            </button>
          </div>
        </div>

        {/* Pending Evaluations */}
        <div className="card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Pending Evaluations</h3>
              <p className="text-sm text-muted-foreground mt-1">Submit your feedback</p>
            </div>
            <Badge variant="warning">{pendingEvaluations.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {pendingEvaluations.map((evaluation) => (
              <div key={evaluation.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{evaluation.candidate}</p>
                  <p className="text-xs text-muted-foreground">{evaluation.position}</p>
                  <p className="text-xs text-muted-foreground">{evaluation.drive}</p>
                </div>
                <div className="text-right">
                  <button className="btn-primary text-xs py-1 px-3">
                    Evaluate
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">
                    {evaluation.interviewDate}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          title="My Evaluations"
          subtitle="This month's interview outcomes"
        >
          <DonutChart data={evaluationStats} />
        </ChartCard>

        <div className="lg:col-span-2">
          <ActivityFeed
            activities={recentActivities}
            title="Recent Activity"
            subtitle="Your interview activities"
            showViewAll
          />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />
    </div>
  );
}
