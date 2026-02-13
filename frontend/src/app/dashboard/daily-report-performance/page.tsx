'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { DashboardLayout } from '@/components/layout';
import { BarChart } from '@/components/charts/bar-chart';
import { LineChart } from '@/components/charts/line-chart';
import { dailyReportAPI } from '@/lib/api-client';
import { exportDailyReportPerformanceToPDF } from '@/lib/export-utils';
import {
  TrendingUp,
  TrendingDown,
  Target,
  CalendarCheck,
  Award,
  AlertTriangle,
  Download,
  ChevronDown,
  Users,
  Eye,
  ArrowLeft,
} from 'lucide-react';

type Period = 'weekly' | 'monthly' | 'quarterly' | 'annual';

interface ParameterPerformance {
  paramKey: string;
  paramLabel: string;
  paramType: string;
  target: number;
  totalTarget: number;
  totalActual: number;
  achievementPct: number;
  averageDaily: number;
  daysReported: number;
}

interface TimeBucketData {
  bucketLabel: string;
  bucketStart: string;
  bucketEnd: string;
  parameters: Record<string, { actual: number; target: number; achievementPct: number }>;
  submissionCount: number;
  expectedSubmissions: number;
}

interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  roleName: string;
  parameters: ParameterPerformance[];
  overallAchievementPct: number;
  submissionRate: number;
  totalReports: number;
  totalWorkingDays: number;
  timeSeries: TimeBucketData[];
  bestParameter: { key: string; label: string; pct: number } | null;
  worstParameter: { key: string; label: string; pct: number } | null;
}

interface TeamPerformance {
  employees: EmployeePerformance[];
  teamAverageAchievement: number;
  teamAverageSubmissionRate: number;
  parameterAverages: ParameterPerformance[];
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'quarterly', label: 'This Quarter' },
  { value: 'annual', label: 'This Year' },
];

function SummaryCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #f3f4f6',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon style={{ width: '20px', height: '20px', color }} />
        </div>
        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{subtitle}</div>
      )}
    </div>
  );
}

export default function DailyReportPerformancePage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState(true);
  const [myPerformance, setMyPerformance] = useState<EmployeePerformance | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformance | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const isManager = user?.role === 'MANAGER';
  const isHROrDirector = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';
  const canViewTeam = isManager || isHROrDirector;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { period };

      // Fetch own performance
      const myRes = await dailyReportAPI.getMyPerformance(params);
      setMyPerformance(myRes.data);

      // Fetch team/all performance for managers and above
      if (isManager) {
        const teamRes = await dailyReportAPI.getTeamPerformance(params);
        setTeamPerformance(teamRes.data);
      } else if (isHROrDirector) {
        const allRes = await dailyReportAPI.getAllPerformance(params);
        setTeamPerformance(allRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
    } finally {
      setLoading(false);
    }
  }, [period, isManager, isHROrDirector]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportPDF = () => {
    const perf = selectedEmployee || myPerformance;
    if (!perf) return;
    const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || period;
    exportDailyReportPerformanceToPDF(perf, periodLabel);
  };

  // Prepare bar chart data for target vs actual
  const getBarChartData = (perf: EmployeePerformance) => {
    return perf.parameters.map((p) => ({
      name: p.paramLabel,
      Actual: p.totalActual,
      Target: p.totalTarget,
    }));
  };

  // Prepare line chart data for trend
  const getTrendChartData = (perf: EmployeePerformance) => {
    if (!perf.timeSeries || perf.timeSeries.length === 0) return [];
    const paramKeys = perf.parameters.map((p) => p.paramKey);
    return perf.timeSeries.map((bucket) => {
      const row: any = { name: bucket.bucketLabel };
      paramKeys.forEach((key) => {
        const paramData = bucket.parameters[key];
        row[perf.parameters.find((p) => p.paramKey === key)?.paramLabel || key] =
          paramData ? Math.round(paramData.achievementPct) : 0;
      });
      return row;
    });
  };

  const activePerfView = selectedEmployee || myPerformance;

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || period;

  return (
    <DashboardLayout
      title="Daily Report Performance"
      description="Track target vs actual performance from daily reports"
      actions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Period Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              {periodLabel}
              <ChevronDown style={{ width: '16px', height: '16px' }} />
            </button>
            {showPeriodDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  minWidth: '160px',
                  overflow: 'hidden',
                }}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setPeriod(opt.value);
                      setShowPeriodDropdown(false);
                      setSelectedEmployee(null);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '14px',
                      border: 'none',
                      backgroundColor: period === opt.value ? '#f5f3ff' : 'transparent',
                      color: period === opt.value ? '#7c3aed' : '#374151',
                      fontWeight: period === opt.value ? 600 : 400,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (period !== opt.value) e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      if (period !== opt.value) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            disabled={!activePerfView}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: activePerfView ? 'pointer' : 'not-allowed',
              opacity: activePerfView ? 1 : 0.5,
            }}
          >
            <Download style={{ width: '16px', height: '16px' }} />
            Export PDF
          </button>
        </div>
      }
    >
      {/* Click away to close dropdown */}
      {showPeriodDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setShowPeriodDropdown(false)}
        />
      )}

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            color: '#9ca3af',
            fontSize: '14px',
          }}
        >
          <svg
            style={{ width: '24px', height: '24px', marginRight: '8px', animation: 'spin 1s linear infinite' }}
            viewBox="0 0 24 24"
          >
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading performance data...
        </div>
      ) : !activePerfView ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
            color: '#9ca3af',
          }}
        >
          <Target style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>No performance data available</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Submit daily reports to see your performance analytics here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Back button when viewing specific employee */}
          {selectedEmployee && (
            <button
              onClick={() => setSelectedEmployee(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                width: 'fit-content',
              }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              Back to {isManager ? 'Team' : 'All Employees'} View
            </button>
          )}

          {/* Employee name header when viewing specific employee */}
          {selectedEmployee && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#ede9fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#7c3aed',
                }}
              >
                {selectedEmployee.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#111827' }}>{selectedEmployee.employeeName}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedEmployee.roleName}</div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <SummaryCard
              icon={Target}
              label="Overall Achievement"
              value={`${activePerfView.overallAchievementPct.toFixed(1)}%`}
              subtitle={activePerfView.overallAchievementPct >= 100 ? 'On track' : 'Below target'}
              color={activePerfView.overallAchievementPct >= 100 ? '#22c55e' : activePerfView.overallAchievementPct >= 75 ? '#eab308' : '#ef4444'}
            />
            <SummaryCard
              icon={CalendarCheck}
              label="Submission Rate"
              value={`${activePerfView.submissionRate.toFixed(1)}%`}
              subtitle={`${activePerfView.totalReports} of ${activePerfView.totalWorkingDays} days`}
              color="#7c3aed"
            />
            <SummaryCard
              icon={Award}
              label="Best Parameter"
              value={activePerfView.bestParameter?.label || 'N/A'}
              subtitle={activePerfView.bestParameter ? `${activePerfView.bestParameter.pct.toFixed(1)}% achievement` : undefined}
              color="#22c55e"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Needs Improvement"
              value={activePerfView.worstParameter?.label || 'N/A'}
              subtitle={activePerfView.worstParameter ? `${activePerfView.worstParameter.pct.toFixed(1)}% achievement` : undefined}
              color="#ef4444"
            />
          </div>

          {/* Target vs Actual Bar Chart */}
          {activePerfView.parameters.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f3f4f6',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 20px 0' }}>
                Target vs Actual Comparison
              </h3>
              <div style={{ height: '320px' }}>
                <BarChart
                  data={getBarChartData(activePerfView)}
                  dataKey={['Actual', 'Target']}
                  xAxisKey="name"
                  colors={['#7c3aed', '#d1d5db']}
                  showLegend
                />
              </div>
            </div>
          )}

          {/* Parameter Details Table */}
          {activePerfView.parameters.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f3f4f6',
                overflowX: 'auto',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 20px 0' }}>
                Parameter Details
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    {['Parameter', 'Daily Target', 'Period Target', 'Actual', 'Achievement', 'Avg/Day', 'Days'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '12px 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activePerfView.parameters.map((p, idx) => (
                    <tr
                      key={p.paramKey}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>{p.paramLabel}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{p.target}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{p.totalTarget}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>{p.totalActual}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            backgroundColor:
                              p.achievementPct >= 100
                                ? '#dcfce7'
                                : p.achievementPct >= 75
                                ? '#fef9c3'
                                : '#fee2e2',
                            color:
                              p.achievementPct >= 100
                                ? '#15803d'
                                : p.achievementPct >= 75
                                ? '#a16207'
                                : '#b91c1c',
                          }}
                        >
                          {p.achievementPct >= 100 ? (
                            <TrendingUp style={{ width: '14px', height: '14px' }} />
                          ) : (
                            <TrendingDown style={{ width: '14px', height: '14px' }} />
                          )}
                          {p.achievementPct.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{p.averageDaily.toFixed(1)}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{p.daysReported}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Trend Analysis Line Chart */}
          {activePerfView.timeSeries && activePerfView.timeSeries.length > 1 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f3f4f6',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 20px 0' }}>
                Trend Analysis (Achievement %)
              </h3>
              <div style={{ height: '320px' }}>
                <LineChart
                  data={getTrendChartData(activePerfView)}
                  dataKey={activePerfView.parameters.map((p) => p.paramLabel)}
                  xAxisKey="name"
                  colors={['#7c3aed', '#22c55e', '#eab308', '#ef4444', '#3b82f6', '#ec4899']}
                  showLegend
                  showDots
                  curved
                />
              </div>
            </div>
          )}

          {/* Team / All Employees Table */}
          {canViewTeam && teamPerformance && !selectedEmployee && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f3f4f6',
                overflowX: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Users style={{ width: '20px', height: '20px', color: '#7c3aed' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {isManager ? 'Team Performance' : 'All Employees Performance'}
                </h3>
              </div>

              {/* Team summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f5f3ff',
                    border: '1px solid #ede9fe',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                    Team Avg Achievement
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed', marginTop: '4px' }}>
                    {teamPerformance.teamAverageAchievement.toFixed(1)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f5f3ff',
                    border: '1px solid #ede9fe',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                    Team Avg Submission Rate
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed', marginTop: '4px' }}>
                    {teamPerformance.teamAverageSubmissionRate.toFixed(1)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f5f3ff',
                    border: '1px solid #ede9fe',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                    Total Employees
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed', marginTop: '4px' }}>
                    {teamPerformance.employees.length}
                  </div>
                </div>
              </div>

              {/* Employee table */}
              {teamPerformance.employees.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      {['Employee', 'Role', 'Achievement', 'Submission Rate', 'Best Parameter', 'Action'].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '12px 16px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#6b7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerformance.employees.map((emp, idx) => (
                      <tr
                        key={emp.employeeId}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                backgroundColor: '#ede9fe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#7c3aed',
                              }}
                            >
                              {emp.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <span style={{ fontWeight: 500, color: '#111827' }}>{emp.employeeName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>{emp.roleName}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '13px',
                              fontWeight: 600,
                              backgroundColor:
                                emp.overallAchievementPct >= 100
                                  ? '#dcfce7'
                                  : emp.overallAchievementPct >= 75
                                  ? '#fef9c3'
                                  : '#fee2e2',
                              color:
                                emp.overallAchievementPct >= 100
                                  ? '#15803d'
                                  : emp.overallAchievementPct >= 75
                                  ? '#a16207'
                                  : '#b91c1c',
                            }}
                          >
                            {emp.overallAchievementPct.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                          {emp.submissionRate.toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                          {emp.bestParameter?.label || 'N/A'}
                          {emp.bestParameter && (
                            <span style={{ fontSize: '12px', color: '#22c55e', marginLeft: '4px' }}>
                              ({emp.bestParameter.pct.toFixed(0)}%)
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#ffffff',
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#7c3aed',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f5f3ff';
                              e.currentTarget.style.borderColor = '#c4b5fd';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                          >
                            <Eye style={{ width: '14px', height: '14px' }} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                  No team members with daily reporting parameters found.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  );
}
