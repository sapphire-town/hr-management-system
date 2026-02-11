'use client';

import * as React from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  Calendar,
  Target,
  TrendingUp,
  Edit,
  Trash2,
  Send,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { dailyReportAPI } from '@/lib/api-client';
import { format, parseISO, isToday, startOfMonth, endOfMonth } from 'date-fns';

interface ReportingParam {
  key: string;
  label: string;
  target: number;
  type: string;
}

interface DailyReport {
  id: string;
  employeeId: string;
  reportDate: string;
  reportData: Record<string, number>;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  managerComment: string | null;
  createdAt: string;
  employee?: {
    firstName: string;
    lastName: string;
    role?: {
      name: string;
      dailyReportingParams: ReportingParam[];
    };
  };
}

interface ReportStats {
  totalReports: number;
  verifiedReports: number;
  pendingReports: number;
  workingDays: number;
  submissionRate: number;
  month: string;
}

export default function DailyReportPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [reportingParams, setReportingParams] = React.useState<ReportingParam[]>([]);
  const [roleName, setRoleName] = React.useState('');
  const [todayReport, setTodayReport] = React.useState<DailyReport | null>(null);
  const [reports, setReports] = React.useState<DailyReport[]>([]);
  const [stats, setStats] = React.useState<ReportStats | null>(null);
  const [reportData, setReportData] = React.useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingReport, setEditingReport] = React.useState<DailyReport | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch reporting parameters
      const paramsRes = await dailyReportAPI.getMyParams();
      setReportingParams(paramsRes.data.parameters || []);
      setRoleName(paramsRes.data.roleName || '');

      // Initialize report data with zeros
      const initialData: Record<string, number> = {};
      (paramsRes.data.parameters || []).forEach((param: ReportingParam) => {
        initialData[param.key] = 0;
      });
      setReportData(initialData);

      // Fetch today's report
      const todayRes = await dailyReportAPI.getToday();
      setTodayReport(todayRes.data);

      // If there's a report for today, populate the form
      if (todayRes.data) {
        setReportData(todayRes.data.reportData);
      }

      // Fetch report history for current month
      const now = new Date();
      const reportsRes = await dailyReportAPI.getMyReports({
        startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      });
      setReports(reportsRes.data || []);

      // Fetch stats
      const statsRes = await dailyReportAPI.getMyStats();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching daily report data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setReportData((prev) => ({ ...prev, [key]: numValue }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingReport) {
        await dailyReportAPI.update(editingReport.id, { reportData });
        setEditingReport(null);
      } else {
        await dailyReportAPI.submit({
          reportDate: selectedDate,
          reportData,
        });
      }
      await fetchData();
      // Reset form after submission
      const initialData: Record<string, number> = {};
      reportingParams.forEach((param) => {
        initialData[param.key] = 0;
      });
      setReportData(initialData);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      alert(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (report: DailyReport) => {
    setEditingReport(report);
    setReportData(report.reportData);
    setSelectedDate(format(parseISO(report.reportDate), 'yyyy-MM-dd'));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await dailyReportAPI.delete(id);
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting report:', error);
      alert(error.response?.data?.message || 'Failed to delete report');
    }
  };

  const cancelEdit = () => {
    setEditingReport(null);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    if (todayReport) {
      setReportData(todayReport.reportData);
    } else {
      const initialData: Record<string, number> = {};
      reportingParams.forEach((param) => {
        initialData[param.key] = 0;
      });
      setReportData(initialData);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return '#22c55e';
    if (percentage >= 75) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <DashboardLayout title="Daily Report" description="Submit your daily work report">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (reportingParams.length === 0) {
    return (
      <DashboardLayout title="Daily Report" description="Submit your daily work report">
        <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
          <AlertCircle style={{ height: '48px', width: '48px', color: '#f59e0b', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
            No Reporting Parameters Configured
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Your role does not have daily reporting parameters configured. Please contact your manager or HR.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const isTodaySelected = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const hasSubmittedToday = todayReport !== null;

  return (
    <DashboardLayout
      title="Daily Report"
      description={`Submit your daily work report${roleName ? ` - ${roleName}` : ''}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Expected Results Banner */}
        <div
          style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border: '1px solid #ddd6fe',
          }}
        >
          <div style={{ padding: '20px', borderBottom: '1px solid #ddd6fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target style={{ height: '20px', width: '20px', color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  Today's Expected Results - {roleName}
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  Keep these targets in mind while submitting your daily report
                </p>
              </div>
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {reportingParams.map((param) => (
                <div
                  key={param.key}
                  style={{
                    padding: '16px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#7c3aed' }}>
                    {param.target}
                  </span>
                  <span style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    {param.label}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      marginTop: '2px',
                      textTransform: 'capitalize',
                    }}
                  >
                    {param.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            {
              label: "Today's Status",
              value: hasSubmittedToday ? (todayReport?.isVerified ? 'Verified' : 'Submitted') : 'Not Submitted',
              icon: <FileText />,
              color: hasSubmittedToday ? (todayReport?.isVerified ? '#22c55e' : '#f59e0b') : '#ef4444',
            },
            {
              label: 'Submission Rate',
              value: `${stats?.submissionRate || 0}%`,
              icon: <TrendingUp />,
              color: '#7c3aed',
            },
            {
              label: 'Reports This Month',
              value: stats?.totalReports || 0,
              icon: <Calendar />,
              color: '#3b82f6',
            },
            {
              label: 'Verified Reports',
              value: stats?.verifiedReports || 0,
              icon: <CheckCircle />,
              color: '#22c55e',
            },
          ].map((stat) => (
            <div key={stat.label} style={{ ...cardStyle, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                {React.cloneElement(stat.icon as React.ReactElement, { style: { height: '24px', width: '24px' } })}
              </div>
              <div>
                <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Report Form */}
        <div style={cardStyle}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                {editingReport ? 'Edit Report' : 'Submit Daily Report'}
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {editingReport
                  ? `Editing report for ${format(parseISO(editingReport.reportDate), 'MMMM d, yyyy')}`
                  : 'Enter your daily metrics below'}
              </p>
            </div>
            {!editingReport && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  color: '#111827',
                }}
              />
            )}
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {reportingParams.map((param) => {
                const value = reportData[param.key] || 0;
                const percentage = Math.min((value / param.target) * 100, 100);
                const progressColor = getProgressColor(value, param.target);

                return (
                  <div
                    key={param.key}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        {param.label}
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Target: {param.target}</span>
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => handleInputChange(param.key, e.target.value)}
                      disabled={todayReport?.isVerified && isTodaySelected && !editingReport}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#111827',
                        backgroundColor: todayReport?.isVerified && isTodaySelected && !editingReport ? '#f3f4f6' : '#ffffff',
                        textAlign: 'center',
                      }}
                    />
                    {/* Progress bar */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Progress</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: progressColor }}>
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: progressColor,
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {editingReport && (
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || (todayReport?.isVerified && isTodaySelected && !editingReport)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background:
                    submitting || (todayReport?.isVerified && isTodaySelected && !editingReport)
                      ? '#d1d5db'
                      : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor:
                    submitting || (todayReport?.isVerified && isTodaySelected && !editingReport)
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                <Send style={{ height: '16px', width: '16px' }} />
                {submitting ? 'Submitting...' : editingReport ? 'Update Report' : hasSubmittedToday && isTodaySelected ? 'Update Report' : 'Submit Report'}
              </button>
            </div>

            {todayReport?.isVerified && isTodaySelected && !editingReport && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle style={{ height: '20px', width: '20px', color: '#22c55e' }} />
                <span style={{ fontSize: '14px', color: '#166534' }}>
                  This report has been verified by your manager
                  {todayReport.managerComment && `: "${todayReport.managerComment}"`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Report History */}
        <div style={cardStyle}>
          <div
            style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowHistory(!showHistory)}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
              Report History ({reports.length})
            </h3>
            <span style={{ fontSize: '14px', color: '#7c3aed', fontWeight: 500 }}>
              {showHistory ? 'Hide' : 'Show'}
            </span>
          </div>
          {showHistory && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {['Date', 'Status', ...reportingParams.map((p) => p.label), 'Actions'].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, idx) => (
                    <tr
                      key={report.id}
                      style={{
                        borderBottom: idx < reports.length - 1 ? '1px solid #f3f4f6' : 'none',
                        backgroundColor: isToday(parseISO(report.reportDate)) ? '#f5f3ff' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                          {format(parseISO(report.reportDate), 'MMM d, yyyy')}
                        </span>
                        {isToday(parseISO(report.reportDate)) && (
                          <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, backgroundColor: '#7c3aed', color: '#ffffff' }}>
                            Today
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: report.isVerified ? '#dcfce7' : '#fef3c7',
                            color: report.isVerified ? '#166534' : '#92400e',
                          }}
                        >
                          {report.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      {reportingParams.map((param) => {
                        const value = report.reportData[param.key] || 0;
                        const isAboveTarget = value >= param.target;
                        return (
                          <td key={param.key} style={{ padding: '16px' }}>
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: isAboveTarget ? '#22c55e' : value >= param.target * 0.75 ? '#f59e0b' : '#ef4444',
                              }}
                            >
                              {value}
                              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400 }}>
                                /{param.target}
                              </span>
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: '16px' }}>
                        {!report.isVerified && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEdit(report)}
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#dbeafe',
                                color: '#1d4ed8',
                                cursor: 'pointer',
                              }}
                              title="Edit"
                            >
                              <Edit style={{ height: '14px', width: '14px' }} />
                            </button>
                            <button
                              onClick={() => handleDelete(report.id)}
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                              }}
                              title="Delete"
                            >
                              <Trash2 style={{ height: '14px', width: '14px' }} />
                            </button>
                          </div>
                        )}
                        {report.isVerified && (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td
                        colSpan={3 + reportingParams.length}
                        style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}
                      >
                        No reports submitted this month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
