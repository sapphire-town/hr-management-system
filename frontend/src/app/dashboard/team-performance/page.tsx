'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { performanceAPI } from '@/lib/api-client';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
  Download,
  ChevronDown,
  UserMinus,
  BarChart3,
  Target,
  Loader2,
} from 'lucide-react';

// ==================== Types ====================

interface EmployeePerf {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  overallScore: number;
  attendanceScore: number;
  punctualityScore: number;
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

interface TeamDashboard {
  managerId: string;
  managerName: string;
  managerRole: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  teamSize: number;
  averageScore: number;
  previousAverageScore: number;
  trend: 'up' | 'down' | 'stable';
  averageAttendance: number;
  averageLeaveScore: number;
  averageTaskCompletion: number;
  attritionRate: { rate: number; left: number; startCount: number };
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
  topPerformers: EmployeePerf[];
  needsImprovement: EmployeePerf[];
  members: EmployeePerf[];
}

interface TeamSummary {
  managerId: string;
  managerName: string;
  managerRole: string;
  teamSize: number;
  averageScore: number;
  previousAverageScore: number;
  trend: 'up' | 'down' | 'stable';
  averageAttendance: number;
  attritionRate: { rate: number; left: number; startCount: number };
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
}

// ==================== Styles ====================

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e5e7eb',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const statCardStyle = (gradient: string): React.CSSProperties => ({
  background: gradient,
  borderRadius: '16px',
  padding: '20px 24px',
  color: '#ffffff',
  flex: 1,
  minWidth: '180px',
});

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left' as const,
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '2px solid #e5e7eb',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '14px',
  color: '#374151',
  borderBottom: '1px solid #f3f4f6',
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthDateRange = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp style={{ width: '16px', height: '16px', color: '#059669' }} />;
  if (trend === 'down') return <TrendingDown style={{ width: '16px', height: '16px', color: '#dc2626' }} />;
  return <Minus style={{ width: '16px', height: '16px', color: '#6b7280' }} />;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? '#059669' : score >= 75 ? '#3b82f6' : score >= 60 ? '#d97706' : '#dc2626';
  const bg = score >= 90 ? '#ecfdf5' : score >= 75 ? '#eff6ff' : score >= 60 ? '#fffbeb' : '#fef2f2';
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 600,
      color,
      backgroundColor: bg,
    }}>
      {score}
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: '#f3f4f6' }}>
        <div style={{ width: `${Math.min(100, value)}%`, height: '100%', borderRadius: '3px', backgroundColor: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color, minWidth: '32px' }}>{value}%</span>
    </div>
  );
}

// ==================== Main Page ====================

export default function TeamPerformancePage() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'MANAGER';
  const isDirectorOrHR = user?.role === 'DIRECTOR' || user?.role === 'HR_HEAD';

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [teamDashboard, setTeamDashboard] = useState<TeamDashboard | null>(null);
  const [allTeams, setAllTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeamData, setSelectedTeamData] = useState<TeamDashboard | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth);
      const params = { period: 'monthly', startDate, endDate };
      if (isManager) {
        const res = await performanceAPI.getTeamDashboard(params);
        setTeamDashboard(res.data);
      } else if (isDirectorOrHR) {
        const teamsRes = await performanceAPI.getAllTeams(params);
        setAllTeams(teamsRes.data || []);
        // Also try to get own team if applicable
        try {
          const ownRes = await performanceAPI.getTeamDashboard(params);
          setTeamDashboard(ownRes.data);
        } catch {
          // May not have a team
        }
      }
    } catch (error) {
      console.error('Failed to fetch team performance:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, isManager, isDirectorOrHR]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When Director/HR clicks a team to drill down
  const [loadingTeam, setLoadingTeam] = useState(false);
  const handleTeamSelect = async (managerId: string) => {
    if (selectedTeamId === managerId) {
      setSelectedTeamId(null);
      setSelectedTeamData(null);
      return;
    }
    setSelectedTeamId(managerId);
    setLoadingTeam(true);
    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth);
      const res = await performanceAPI.getManagerTeamDashboard(managerId, { period: 'monthly', startDate, endDate });
      setSelectedTeamData(res.data);
    } catch {
      setSelectedTeamData(null);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleExport = async () => {
    const activeDashboard = selectedTeamData || teamDashboard;
    const data = activeDashboard?.members || [];
    if (data.length === 0) {
      alert('No team data available to export');
      return;
    }

    try {
      await exportToExcel({
        filename: `team_performance_${selectedMonth}_${new Date().toISOString().split('T')[0]}`,
        title: `Team Performance - ${activeDashboard?.managerName || 'All Teams'}`,
        columns: [
          { key: 'employeeName', header: 'Employee', width: 20 },
          { key: 'role', header: 'Role', width: 15 },
          { key: 'overallScore', header: 'Overall Score', width: 12 },
          { key: 'attendanceScore', header: 'Attendance', width: 12 },
          { key: 'leaveScore', header: 'Leave Score', width: 12 },
          { key: 'taskCompletionScore', header: 'Task Completion', width: 14 },
          { key: 'daysPresent', header: 'Days Present', width: 12 },
          { key: 'daysAbsent', header: 'Days Absent', width: 12 },
          { key: 'trend', header: 'Trend', width: 8 },
        ],
        data,
      });
    } catch (error) {
      console.error('Export Excel error:', error);
      alert('Failed to export Excel. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    const activeDashboard = selectedTeamData || teamDashboard;
    const data = activeDashboard?.members || [];
    if (data.length === 0) {
      alert('No team data available to export');
      return;
    }

    try {
      await exportToPDF({
        filename: `team_performance_${selectedMonth}_${new Date().toISOString().split('T')[0]}`,
        title: `Team Performance Report - ${activeDashboard?.managerName || ''}`,
        columns: [
          { key: 'employeeName', header: 'Employee', width: 20 },
          { key: 'role', header: 'Role', width: 15 },
          { key: 'overallScore', header: 'Score', width: 10 },
          { key: 'attendanceScore', header: 'Attendance', width: 10 },
          { key: 'taskCompletionScore', header: 'Tasks', width: 10 },
          { key: 'trend', header: 'Trend', width: 8 },
        ],
        data,
      });
    } catch (error) {
      console.error('Export PDF error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Team Performance
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              {isManager ? 'Monitor your team\'s collective performance' : 'View all team performance across the organization'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Month Selector */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={getCurrentMonth()}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                cursor: 'pointer',
                outline: 'none',
              }}
            />

            {(selectedTeamData || teamDashboard) && (
              <>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                  PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <Loader2 style={{ width: '24px', height: '24px', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
            Loading team performance...
          </div>
        ) : (
          <>
            {/* All Teams Overview (Director/HR) */}
            {isDirectorOrHR && allTeams.length > 0 && (
              <AllTeamsOverview
                teams={allTeams}
                selectedTeamId={selectedTeamId}
                onSelect={handleTeamSelect}
              />
            )}

            {/* Selected Manager's Team Dashboard (Director/HR drill-down) */}
            {isDirectorOrHR && selectedTeamId && (
              loadingTeam ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  <Loader2 style={{ width: '20px', height: '20px', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                  Loading team details...
                </div>
              ) : selectedTeamData ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                      {selectedTeamData.managerName}&apos;s Team
                    </h2>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: '#ede9fe',
                      color: '#7c3aed',
                    }}>
                      {selectedTeamData.managerRole}
                    </span>
                    <button
                      onClick={() => { setSelectedTeamId(null); setSelectedTeamData(null); }}
                      style={{
                        marginLeft: 'auto',
                        fontSize: '13px',
                        color: '#6b7280',
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </div>
                  <TeamDashboardView dashboard={selectedTeamData} />
                </div>
              ) : (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '40px', marginBottom: '24px' }}>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                    No detailed team data available for this manager.
                  </p>
                </div>
              )
            )}

            {/* Own Team Dashboard (Manager view, or Director/HR without selection) */}
            {teamDashboard && !selectedTeamId && (
              <TeamDashboardView dashboard={teamDashboard} />
            )}

            {!teamDashboard && !isDirectorOrHR && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
                <Users style={{ width: '64px', height: '64px', margin: '0 auto 16px', opacity: 0.3 }} />
                <p style={{ fontSize: '16px', fontWeight: 500 }}>No team data available</p>
                <p style={{ fontSize: '14px' }}>You don&apos;t have any team members assigned.</p>
              </div>
            )}
          </>
        )}

        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

// ==================== All Teams Overview (Director/HR) ====================

function AllTeamsOverview({
  teams,
  selectedTeamId,
  onSelect,
}: {
  teams: TeamSummary[];
  selectedTeamId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
          All Teams Overview ({teams.length} teams)
        </h3>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Click a manager to view team details</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={thStyle}>Manager</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Team Size</th>
              <th style={thStyle}>Avg Score</th>
              <th style={thStyle}>Prev Score</th>
              <th style={thStyle}>Trend</th>
              <th style={thStyle}>Attendance</th>
              <th style={thStyle}>Attrition</th>
              <th style={thStyle}>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, idx) => (
              <tr
                key={team.managerId}
                onClick={() => onSelect(team.managerId)}
                style={{
                  borderBottom: '1px solid #f3f4f6',
                  backgroundColor: selectedTeamId === team.managerId ? '#f5f3ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => { if (selectedTeamId !== team.managerId) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                onMouseLeave={(e) => { if (selectedTeamId !== team.managerId) e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#fafafa'; }}
              >
                <td style={{ ...tdStyle, fontWeight: 500 }}>
                  <span style={{
                    color: selectedTeamId === team.managerId ? '#7c3aed' : '#111827',
                    textDecoration: selectedTeamId === team.managerId ? 'underline' : 'none',
                    cursor: 'pointer',
                  }}>
                    {team.managerName}
                    {selectedTeamId === team.managerId && ' ▾'}
                  </span>
                </td>
                <td style={tdStyle}>{team.managerRole}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{team.teamSize}</td>
                <td style={tdStyle}><ScoreBadge score={team.averageScore} /></td>
                <td style={{ ...tdStyle, color: '#9ca3af' }}>{team.previousAverageScore}</td>
                <td style={tdStyle}><TrendIcon trend={team.trend} /></td>
                <td style={tdStyle}><ProgressBar value={team.averageAttendance} color="#059669" /></td>
                <td style={tdStyle}>
                  <span style={{
                    color: team.attritionRate.rate > 10 ? '#dc2626' : team.attritionRate.rate > 0 ? '#d97706' : '#059669',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}>
                    {team.attritionRate.rate}%
                  </span>
                </td>
                <td style={tdStyle}>
                  <DistributionBar dist={team.performanceDistribution} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Mini Distribution Bar ====================

function DistributionBar({ dist }: { dist: { excellent: number; good: number; average: number; needsImprovement: number } }) {
  const total = dist.excellent + dist.good + dist.average + dist.needsImprovement;
  if (total === 0) return <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>;
  return (
    <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', width: '80px' }}>
      {dist.excellent > 0 && <div style={{ width: `${(dist.excellent / total) * 100}%`, backgroundColor: '#059669' }} />}
      {dist.good > 0 && <div style={{ width: `${(dist.good / total) * 100}%`, backgroundColor: '#3b82f6' }} />}
      {dist.average > 0 && <div style={{ width: `${(dist.average / total) * 100}%`, backgroundColor: '#d97706' }} />}
      {dist.needsImprovement > 0 && <div style={{ width: `${(dist.needsImprovement / total) * 100}%`, backgroundColor: '#dc2626' }} />}
    </div>
  );
}

// ==================== Team Dashboard View ====================

function TeamDashboardView({ dashboard }: { dashboard: TeamDashboard }) {
  const [showAllMembers, setShowAllMembers] = useState(false);
  const scoreDiff = dashboard.averageScore - dashboard.previousAverageScore;

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={statCardStyle('linear-gradient(135deg, #7c3aed, #a78bfa)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target style={{ width: '20px', height: '20px' }} />
            <span style={{ fontSize: '13px', opacity: 0.9 }}>Average Score</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
            {dashboard.averageScore}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendIcon trend={dashboard.trend} />
            {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} from previous
          </div>
        </div>

        <div style={statCardStyle('linear-gradient(135deg, #059669, #34d399)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users style={{ width: '20px', height: '20px' }} />
            <span style={{ fontSize: '13px', opacity: 0.9 }}>Team Size</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
            {dashboard.teamSize}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Attendance: {dashboard.averageAttendance}%
          </div>
        </div>

        <div style={statCardStyle('linear-gradient(135deg, #d97706, #fbbf24)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserMinus style={{ width: '20px', height: '20px' }} />
            <span style={{ fontSize: '13px', opacity: 0.9 }}>Attrition Rate</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
            {dashboard.attritionRate.rate}%
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            {dashboard.attritionRate.left} left / {dashboard.attritionRate.startCount} start
          </div>
        </div>

        <div style={statCardStyle('linear-gradient(135deg, #2563eb, #60a5fa)')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 style={{ width: '20px', height: '20px' }} />
            <span style={{ fontSize: '13px', opacity: 0.9 }}>Task Completion</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
            {dashboard.averageTaskCompletion}%
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Leave score: {dashboard.averageLeaveScore}%
          </div>
        </div>
      </div>

      {/* Performance Distribution & Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Distribution */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Performance Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Excellent (90+)', count: dashboard.performanceDistribution.excellent, color: '#059669', bg: '#ecfdf5' },
              { label: 'Good (75-89)', count: dashboard.performanceDistribution.good, color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Average (60-74)', count: dashboard.performanceDistribution.average, color: '#d97706', bg: '#fffbeb' },
              { label: 'Needs Improvement (<60)', count: dashboard.performanceDistribution.needsImprovement, color: '#dc2626', bg: '#fef2f2' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '120px', fontSize: '13px', color: '#6b7280' }}>{item.label}</div>
                <div style={{ flex: 1, height: '20px', borderRadius: '4px', backgroundColor: '#f3f4f6', position: 'relative' }}>
                  <div style={{
                    width: dashboard.teamSize > 0 ? `${(item.count / dashboard.teamSize) * 100}%` : '0%',
                    height: '100%',
                    borderRadius: '4px',
                    backgroundColor: item.color,
                    transition: 'width 0.3s',
                    minWidth: item.count > 0 ? '20px' : '0',
                  }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: item.color, minWidth: '24px', textAlign: 'right' }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers & Needs Improvement */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
            Highlights
          </h3>
          {dashboard.topPerformers.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                <Award style={{ width: '14px', height: '14px', display: 'inline', verticalAlign: 'text-bottom' }} /> Top Performers
              </div>
              {dashboard.topPerformers.map(p => (
                <div key={p.employeeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: '14px', color: '#111827' }}>{p.employeeName}</span>
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>{p.role}</span>
                  </div>
                  <ScoreBadge score={p.overallScore} />
                </div>
              ))}
            </div>
          )}
          {dashboard.needsImprovement.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                <AlertTriangle style={{ width: '14px', height: '14px', display: 'inline', verticalAlign: 'text-bottom' }} /> Needs Improvement
              </div>
              {dashboard.needsImprovement.map(p => (
                <div key={p.employeeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: '14px', color: '#111827' }}>{p.employeeName}</span>
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>{p.role}</span>
                  </div>
                  <ScoreBadge score={p.overallScore} />
                </div>
              ))}
            </div>
          )}
          {dashboard.topPerformers.length === 0 && dashboard.needsImprovement.length === 0 && (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No performance highlights to show</p>
          )}
        </div>
      </div>

      {/* All Members Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
            Individual Performance ({dashboard.members.length} members)
          </h3>
          {dashboard.members.length > 5 && (
            <button
              onClick={() => setShowAllMembers(!showAllMembers)}
              style={{
                fontSize: '13px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {showAllMembers ? 'Show Less' : 'Show All'}
              <ChevronDown style={{ width: '14px', height: '14px', transform: showAllMembers ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Overall</th>
                <th style={thStyle}>Attendance</th>
                <th style={thStyle}>Leave</th>
                <th style={thStyle}>Tasks</th>
                <th style={thStyle}>Present</th>
                <th style={thStyle}>Absent</th>
                <th style={thStyle}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {(showAllMembers ? dashboard.members : dashboard.members.slice(0, 5)).map((member, idx) => (
                <tr key={member.employeeId} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...tdStyle, fontWeight: 500, color: '#111827' }}>{member.employeeName}</td>
                  <td style={tdStyle}>{member.role}</td>
                  <td style={tdStyle}><ScoreBadge score={member.overallScore} /></td>
                  <td style={tdStyle}><ProgressBar value={member.attendanceScore} color="#059669" /></td>
                  <td style={tdStyle}><ProgressBar value={member.leaveScore} color="#3b82f6" /></td>
                  <td style={tdStyle}><ProgressBar value={member.taskCompletionScore} color="#7c3aed" /></td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{member.daysPresent}/{member.totalWorkingDays}</td>
                  <td style={{ ...tdStyle, color: member.daysAbsent > 3 ? '#dc2626' : '#6b7280' }}>
                    {member.daysAbsent}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendIcon trend={member.trend} />
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {member.previousScore > 0 ? member.previousScore : '-'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
