'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Download, Calendar, Clock, CheckCircle, XCircle, Users, Loader2, Check, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { leaveAPI } from '@/lib/api-client';

interface Leave {
  id: string;
  employeeId: string;
  employee: {
    firstName: string;
    lastName: string;
    user?: { email: string };
    manager?: { firstName: string; lastName: string };
  };
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID';
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';
  reason: string;
  rejectionReason?: string;
  createdAt: string;
}

interface LeaveBalance {
  isIntern?: boolean;
  sick: number;
  casual: number;
  earned: number;
  total: number;
  allocation?: {
    sick: number;
    casual: number;
    earned: number;
    total: number;
  };
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  PENDING_MANAGER: { color: '#d97706', bg: '#fef3c7', label: 'Pending Manager', icon: <Clock className="w-3.5 h-3.5" /> },
  PENDING_HR: { color: '#7c3aed', bg: '#ede9fe', label: 'Pending HR', icon: <Clock className="w-3.5 h-3.5" /> },
  APPROVED: { color: '#059669', bg: '#d1fae5', label: 'Approved', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  REJECTED: { color: '#dc2626', bg: '#fee2e2', label: 'Rejected', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const leaveTypeConfig: Record<string, { color: string; bg: string }> = {
  CASUAL: { color: '#2563eb', bg: '#dbeafe' },
  SICK: { color: '#dc2626', bg: '#fee2e2' },
  EARNED: { color: '#059669', bg: '#d1fae5' },
  UNPAID: { color: '#6b7280', bg: '#f3f4f6' },
};

export default function LeavesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [leaves, setLeaves] = React.useState<Leave[]>([]);
  const [balance, setBalance] = React.useState<LeaveBalance | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('all');
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const isEmployee = user?.role === 'EMPLOYEE';
  const isManager = user?.role === 'MANAGER';
  const isHRHead = user?.role === 'HR_HEAD';
  const isDirector = user?.role === 'DIRECTOR';

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);

      // Fetch leave balance
      const balanceRes = await leaveAPI.getMyBalance();
      setBalance(balanceRes.data);

      // Fetch leaves based on role
      let leavesData: Leave[] = [];

      if (isEmployee) {
        const myLeavesRes = await leaveAPI.getMyLeaves({ limit: 100 });
        leavesData = myLeavesRes.data.data || [];
      } else if (isManager) {
        // Get pending for manager and my leaves
        const [pendingRes, myLeavesRes] = await Promise.all([
          leaveAPI.getPendingForManager(),
          leaveAPI.getMyLeaves({ limit: 100 }),
        ]);
        const pendingLeaves = pendingRes.data || [];
        const myLeaves = myLeavesRes.data.data || [];
        // Combine and dedupe
        const allLeaves = [...pendingLeaves, ...myLeaves];
        leavesData = allLeaves.filter((leave, index, self) =>
          index === self.findIndex(l => l.id === leave.id)
        );
      } else if (isHRHead || isDirector) {
        // Get all leaves for HR/Director
        const [allLeavesRes, pendingHRRes] = await Promise.all([
          leaveAPI.getAll({ limit: 100 }),
          leaveAPI.getPendingForHR(),
        ]);
        const allLeaves = allLeavesRes.data.data || [];
        const pendingHR = pendingHRRes.data || [];
        // Combine and dedupe
        const combined = [...pendingHR, ...allLeaves];
        leavesData = combined.filter((leave, index, self) =>
          index === self.findIndex(l => l.id === leave.id)
        );
      }

      setLeaves(leavesData);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  }, [isEmployee, isManager, isHRHead, isDirector]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLeaves = React.useMemo(() => {
    if (activeTab === 'all') return leaves;
    return leaves.filter((l) => l.status === activeTab);
  }, [leaves, activeTab]);

  const handleApprove = async (leaveId: string) => {
    try {
      setActionLoading(leaveId);
      await leaveAPI.approve(leaveId);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve leave');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (leaveId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      setActionLoading(leaveId);
      await leaveAPI.reject(leaveId, reason);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject leave');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (leaveId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      setActionLoading(leaveId);
      await leaveAPI.cancel(leaveId);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to cancel leave');
    } finally {
      setActionLoading(null);
    }
  };

  const canApprove = (leave: Leave) => {
    if (isManager && leave.status === 'PENDING_MANAGER') return true;
    if ((isHRHead || isDirector) && leave.status === 'PENDING_HR') return true;
    return false;
  };

  const canCancel = (leave: Leave) => {
    return leave.employeeId === user?.employee?.id &&
           (leave.status === 'PENDING_MANAGER' || leave.status === 'PENDING_HR');
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'PENDING_MANAGER', label: 'Pending Manager' },
    { key: 'PENDING_HR', label: 'Pending HR' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  return (
    <DashboardLayout
      title="Leave Management"
      description="View and manage leave requests"
      actions={
        balance?.isIntern ? null : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {}}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => router.push('/dashboard/leaves/apply')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.25)',
              }}
            >
              <Plus className="w-4 h-4" />
              Apply Leave
            </button>
          </div>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Intern Notice */}
        {balance?.isIntern && (
          <div style={{
            ...cardStyle,
            padding: '32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #fbbf24',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Calendar className="w-8 h-8" style={{ color: '#92400e' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#92400e', margin: '0 0 8px 0' }}>
              Paid Leave Not Available for Interns
            </h3>
            <p style={{ fontSize: 14, color: '#a16207', margin: 0, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              As an intern, you are not eligible for paid leave benefits. If you need time off, please speak directly with your manager to arrange unpaid leave.
            </p>
          </div>
        )}

        {/* Leave Balance Cards - Only for non-interns */}
        {balance && !balance.isIntern && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Sick Leave', value: balance.sick, color: '#ef4444', bg: '#fef2f2', total: balance.allocation?.sick ?? 12 },
              { label: 'Casual Leave', value: balance.casual, color: '#3b82f6', bg: '#eff6ff', total: balance.allocation?.casual ?? 12 },
              { label: 'Earned Leave', value: balance.earned, color: '#22c55e', bg: '#f0fdf4', total: balance.allocation?.earned ?? 15 },
            ].map((item) => {
              const used = item.total - item.value;
              const percentRemaining = item.total > 0 ? (item.value / item.total) * 100 : 0;
              return (
                <div key={item.label} style={cardStyle}>
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{item.label}</span>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {item.value} remaining
                      </span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percentRemaining}%`,
                          backgroundColor: item.color,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', margin: '8px 0 0 0' }}>
                      {used} used of {item.total} days
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: activeTab === tab.key ? '#7c3aed' : '#f3f4f6',
                color: activeTab === tab.key ? '#ffffff' : '#4b5563',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={cardStyle}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
              <Loader2 style={{ height: '32px', width: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <Users style={{ height: '48px', width: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>No leave requests found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Employee
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Type
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Duration
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Days
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Status
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Reason
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((leave, index) => {
                    const typeConfig = leaveTypeConfig[leave.leaveType];
                    const status = statusConfig[leave.status];

                    return (
                      <tr
                        key={leave.id}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafbfc'}
                      >
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#7c3aed',
                              }}
                            >
                              {leave.employee.firstName[0]}{leave.employee.lastName[0]}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                              {leave.employee.firstName} {leave.employee.lastName}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600,
                              backgroundColor: typeConfig?.bg || '#f3f4f6',
                              color: typeConfig?.color || '#374151',
                            }}
                          >
                            {leave.leaveType.charAt(0) + leave.leaveType.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                            <span style={{ fontSize: '14px', color: '#475569' }}>
                              {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {leave.startDate !== leave.endDate && (
                                <> - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                              )}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: '#f1f5f9',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#334155',
                            }}
                          >
                            {leave.numberOfDays}
                          </span>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontSize: '13px',
                              fontWeight: 600,
                              backgroundColor: status?.bg || '#f3f4f6',
                              color: status?.color || '#374151',
                            }}
                          >
                            {status?.icon}
                            {status?.label || leave.status}
                          </span>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: '14px', color: '#64748b', maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {leave.reason}
                          </span>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {canApprove(leave) && (
                              <>
                                <button
                                  onClick={() => handleApprove(leave.id)}
                                  disabled={actionLoading === leave.id}
                                  style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#dcfce7',
                                    color: '#166534',
                                    cursor: actionLoading === leave.id ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Approve"
                                >
                                  <Check style={{ width: '16px', height: '16px' }} />
                                </button>
                                <button
                                  onClick={() => handleReject(leave.id)}
                                  disabled={actionLoading === leave.id}
                                  style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#fee2e2',
                                    color: '#991b1b',
                                    cursor: actionLoading === leave.id ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Reject"
                                >
                                  <X style={{ width: '16px', height: '16px' }} />
                                </button>
                              </>
                            )}
                            {canCancel(leave) && (
                              <button
                                onClick={() => handleCancel(leave.id)}
                                disabled={actionLoading === leave.id}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: '#ffffff',
                                  color: '#6b7280',
                                  fontSize: '13px',
                                  cursor: actionLoading === leave.id ? 'not-allowed' : 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            )}
                            {!canApprove(leave) && !canCancel(leave) && (
                              <span style={{ color: '#9ca3af', fontSize: '13px' }}>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredLeaves.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderTop: '1px solid #f1f5f9',
                backgroundColor: '#fafbfc',
              }}
            >
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Showing <strong>{filteredLeaves.length}</strong> of <strong>{leaves.length}</strong> entries
              </span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  );
}