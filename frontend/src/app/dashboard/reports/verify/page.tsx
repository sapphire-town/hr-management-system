'use client';

import * as React from 'react';
import {
  CheckCircle,
  Clock,
  FileText,
  Search,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { dailyReportAPI } from '@/lib/api-client';
import { format, parseISO } from 'date-fns';

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
  reportData: Record<string, any>;
  generalNotes?: string;
  attachments?: Array<{ fileName: string; filePath: string; paramKey?: string }>;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  managerComment: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    role?: {
      name: string;
      dailyReportingParams: ReportingParam[];
    };
    user?: { email: string };
  };
}

function getParamValue(data: any): number {
  if (typeof data === 'number') return data;
  if (typeof data === 'object' && data?.value !== undefined) return Number(data.value) || 0;
  return Number(data) || 0;
}

function getParamNotes(data: any): string {
  if (typeof data === 'object' && data?.notes) return data.notes;
  return '';
}

function getParamLinks(data: any): string[] {
  if (typeof data === 'object' && Array.isArray(data?.links)) return data.links;
  return [];
}

export default function VerifyReportsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [reports, setReports] = React.useState<DailyReport[]>([]);
  const [filter, setFilter] = React.useState<'pending' | 'verified' | 'all'>('pending');
  const [search, setSearch] = React.useState('');
  const [expandedReport, setExpandedReport] = React.useState<string | null>(null);
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [commentMap, setCommentMap] = React.useState<Record<string, string>>({});

  const isManager = user?.role === 'MANAGER';
  const isHROrDirector = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const fetchReports = React.useCallback(async () => {
    try {
      setLoading(true);
      if (filter === 'pending') {
        const res = await dailyReportAPI.getPendingTeamReports();
        setReports(res.data || []);
      } else {
        const params: any = {};
        if (filter === 'verified') params.isVerified = true;
        const res = await dailyReportAPI.getTeamReports(params);
        setReports(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching team reports:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleVerify = async (reportId: string) => {
    try {
      setVerifyingId(reportId);
      await dailyReportAPI.verify(reportId, {
        managerComment: commentMap[reportId] || undefined,
      });
      setCommentMap((prev) => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });
      setExpandedReport(null);
      await fetchReports();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to verify report');
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.employee.firstName.toLowerCase().includes(q) ||
      r.employee.lastName.toLowerCase().includes(q) ||
      r.employee.user?.email?.toLowerCase().includes(q) ||
      r.employee.role?.name?.toLowerCase().includes(q)
    );
  });

  const pendingCount = reports.filter((r) => !r.isVerified).length;

  return (
    <DashboardLayout
      title="Verify Team Daily Reports"
      description="Review and approve daily reports submitted by your team members"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{
            padding: 20,
            borderRadius: 12,
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock style={{ width: 20, height: 20, color: '#d97706' }} />
              </div>
              <div>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>{pendingCount}</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Pending Verification</p>
              </div>
            </div>
          </div>
          <div style={{
            padding: 20,
            borderRadius: 12,
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle style={{ width: 20, height: 20, color: '#16a34a' }} />
              </div>
              <div>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>{reports.length - pendingCount}</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Verified</p>
              </div>
            </div>
          </div>
          <div style={{
            padding: 20,
            borderRadius: 12,
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText style={{ width: 20, height: 20, color: '#7c3aed' }} />
              </div>
              <div>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>{reports.length}</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Total Reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          padding: 16,
          borderRadius: 12,
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter style={{ width: 16, height: 16, color: '#6b7280' }} />
            {(['pending', 'verified', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  backgroundColor: filter === f ? '#7c3aed' : '#f3f4f6',
                  color: filter === f ? '#fff' : '#374151',
                  transition: 'all 0.2s',
                }}
              >
                {f === 'pending' ? 'Pending' : f === 'verified' ? 'Verified' : 'All'}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search by name, email, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <X style={{ width: 14, height: 14, color: '#9ca3af' }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 style={{ width: 32, height: 32, color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{
            padding: 60,
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
          }}>
            <CheckCircle style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 16, fontWeight: 500, color: '#6b7280', margin: 0 }}>
              {filter === 'pending' ? 'No pending reports to verify' : 'No reports found'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredReports.map((report) => {
              const isExpanded = expandedReport === report.id;
              const params: ReportingParam[] = (report.employee.role?.dailyReportingParams || []).filter(
                (p) => p.type !== 'text'
              );
              const textParams: ReportingParam[] = (report.employee.role?.dailyReportingParams || []).filter(
                (p) => p.type === 'text'
              );

              return (
                <div
                  key={report.id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    border: `1px solid ${report.isVerified ? '#bbf7d0' : '#fde68a'}`,
                    overflow: 'hidden',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  {/* Report Header */}
                  <div
                    onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: report.isVerified ? '#f0fdf4' : '#fffbeb',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        flexShrink: 0,
                      }}>
                        {report.employee.firstName[0]}{report.employee.lastName[0]}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>
                          {report.employee.firstName} {report.employee.lastName}
                          <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8, fontSize: 13 }}>
                            {report.employee.role?.name}
                          </span>
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#6b7280' }}>
                          {format(parseISO(report.reportDate), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Quick summary of params */}
                      <div style={{ display: 'flex', gap: 8, marginRight: 8 }}>
                        {params.slice(0, 3).map((param) => {
                          const val = getParamValue(report.reportData[param.key]);
                          const pct = param.target > 0 ? (val / param.target) * 100 : 0;
                          return (
                            <span
                              key={param.key}
                              title={`${param.label}: ${val}/${param.target}`}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: pct >= 100 ? '#dcfce7' : pct >= 75 ? '#fef9c3' : '#fee2e2',
                                color: pct >= 100 ? '#15803d' : pct >= 75 ? '#a16207' : '#b91c1c',
                              }}
                            >
                              {val}/{param.target}
                            </span>
                          );
                        })}
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: report.isVerified ? '#dcfce7' : '#fef3c7',
                        color: report.isVerified ? '#15803d' : '#92400e',
                      }}>
                        {report.isVerified ? 'Verified' : 'Pending'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp style={{ width: 18, height: 18, color: '#6b7280' }} />
                      ) : (
                        <ChevronDown style={{ width: 18, height: 18, color: '#6b7280' }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ padding: 20, borderTop: '1px solid #e5e7eb' }}>
                      {/* Numeric Parameters Table */}
                      {params.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                            Report Parameters
                          </h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Parameter</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Target</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Actual</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Achievement</th>
                                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {params.map((param) => {
                                const val = getParamValue(report.reportData[param.key]);
                                const notes = getParamNotes(report.reportData[param.key]);
                                const links = getParamLinks(report.reportData[param.key]);
                                const pct = param.target > 0 ? Math.round((val / param.target) * 100) : 0;
                                return (
                                  <tr key={param.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 500, color: '#111827' }}>
                                      {param.label}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
                                      {param.target}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                      {val}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                      <span style={{
                                        display: 'inline-block',
                                        padding: '3px 10px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        backgroundColor: pct >= 100 ? '#dcfce7' : pct >= 75 ? '#fef9c3' : '#fee2e2',
                                        color: pct >= 100 ? '#15803d' : pct >= 75 ? '#a16207' : '#b91c1c',
                                      }}>
                                        {pct}%
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>
                                      {notes && <p style={{ margin: 0 }}>{notes}</p>}
                                      {links.length > 0 && (
                                        <div style={{ display: 'flex', gap: 6, marginTop: notes ? 4 : 0, flexWrap: 'wrap' }}>
                                          {links.map((link, i) => (
                                            <a
                                              key={i}
                                              href={link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'underline' }}
                                            >
                                              Link {i + 1}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                      {!notes && links.length === 0 && <span style={{ color: '#d1d5db' }}>-</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Text Parameters */}
                      {textParams.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          {textParams.map((param) => {
                            const val = report.reportData[param.key];
                            const text = typeof val === 'string' ? val : (typeof val === 'object' && val?.value ? String(val.value) : '');
                            if (!text) return null;
                            return (
                              <div key={param.key} style={{ marginBottom: 12 }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>{param.label}</p>
                                <p style={{ margin: 0, fontSize: 14, color: '#4b5563', padding: 10, backgroundColor: '#f9fafb', borderRadius: 8 }}>{text}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* General Notes */}
                      {report.generalNotes && (
                        <div style={{ marginBottom: 20 }}>
                          <p style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>General Notes</p>
                          <p style={{ margin: 0, fontSize: 14, color: '#4b5563', padding: 10, backgroundColor: '#f9fafb', borderRadius: 8 }}>{report.generalNotes}</p>
                        </div>
                      )}

                      {/* Attachments */}
                      {report.attachments && report.attachments.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>Attachments</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {report.attachments.map((att, i) => (
                              <a
                                key={i}
                                href={dailyReportAPI.getAttachmentUrl(att.filePath?.split('/').pop() || att.fileName)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: '1px solid #e5e7eb',
                                  fontSize: 13,
                                  color: '#7c3aed',
                                  textDecoration: 'none',
                                  backgroundColor: '#f5f3ff',
                                }}
                              >
                                {att.fileName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verified Info */}
                      {report.isVerified && (
                        <div style={{
                          padding: 14,
                          borderRadius: 10,
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          marginBottom: 16,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle style={{ width: 16, height: 16, color: '#22c55e' }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>Verified</span>
                            {report.verifiedAt && (
                              <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                                on {format(parseISO(report.verifiedAt), 'MMM d, yyyy \'at\' h:mm a')}
                              </span>
                            )}
                          </div>
                          {report.managerComment && (
                            <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#374151', padding: '8px 10px', backgroundColor: '#fff', borderRadius: 6 }}>
                              {report.managerComment}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Verify Action */}
                      {!report.isVerified && (
                        <div style={{
                          padding: 16,
                          borderRadius: 10,
                          backgroundColor: '#fffbeb',
                          border: '1px solid #fde68a',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <MessageSquare style={{ width: 16, height: 16, color: '#d97706' }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>Manager Comment (optional)</span>
                          </div>
                          <textarea
                            value={commentMap[report.id] || ''}
                            onChange={(e) => setCommentMap((prev) => ({ ...prev, [report.id]: e.target.value }))}
                            placeholder="Add a comment about this report..."
                            style={{
                              width: '100%',
                              padding: 10,
                              borderRadius: 8,
                              border: '1px solid #e5e7eb',
                              fontSize: 14,
                              minHeight: 60,
                              resize: 'vertical',
                              outline: 'none',
                              boxSizing: 'border-box',
                              marginBottom: 12,
                            }}
                          />
                          <button
                            onClick={() => handleVerify(report.id)}
                            disabled={verifyingId === report.id}
                            style={{
                              padding: '10px 24px',
                              borderRadius: 8,
                              border: 'none',
                              background: verifyingId === report.id ? '#d1d5db' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                              color: '#fff',
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: verifyingId === report.id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            {verifyingId === report.id ? (
                              <>
                                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle style={{ width: 16, height: 16 }} />
                                Verify & Approve
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
