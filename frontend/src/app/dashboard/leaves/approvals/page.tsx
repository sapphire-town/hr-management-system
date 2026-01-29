'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, Clock, CheckCircle, XCircle, Users, Loader2, Calendar } from 'lucide-react';
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
  leaveType: 'CASUAL' | 'SICK' | 'EARNED';
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';
  reason: string;
  rejectionReason?: string;
  createdAt: string;
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
};

export default function LeaveApprovalsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [pendingLeaves, setPendingLeaves] = React.useState<Leave[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [selectedLeave, setSelectedLeave] = React.useState<Leave | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const isManager = user?.role === 'MANAGER';
  const isHRHead = user?.role === 'HR_HEAD';
  const isDirector = user?.role === 'DIRECTOR';

  const fetchPendingLeaves = React.useCallback(async () => {
    try {
      setLoading(true);
      let leaves: Leave[] = [];

      if (isManager) {
        const response = await leaveAPI.getPendingForManager();
        leaves = response.data || [];
      } else if (isHRHead || isDirector) {
        const response = await leaveAPI.getPendingForHR();
        leaves = response.data || [];
      }

      setPendingLeaves(leaves);
    } catch (error) {
      console.error('Error fetching pending leaves:', error);
    } finally {
      setLoading(false);
    }
  }, [isManager, isHRHead, isDirector]);

  React.useEffect(() => {
    fetchPendingLeaves();
  }, [fetchPendingLeaves]);

  const handleApprove = async (leaveId: string) => {
    try {
      setActionLoading(leaveId);
      await leaveAPI.approve(leaveId, 'Approved');
      fetchPendingLeaves();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve leave');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (leave: Leave) => {
    setSelectedLeave(leave);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedLeave || !rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(selectedLeave.id);
      await leaveAPI.reject(selectedLeave.id, rejectReason);
      setRejectModalOpen(false);
      setSelectedLeave(null);
      setRejectReason('');
      fetchPendingLeaves();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject leave');
    } finally {
      setActionLoading(null);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const pendingType = isManager ? 'Manager' : 'HR';

  return (
    <DashboardLayout
      title="Leave Approvals"
      description={`Pending leave requests requiring your approval`}
      actions={
        <button
          onClick={() => router.push('/dashboard/leaves')}
          style={{
            display: 'inline-flex',
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
          <ArrowLeft style={{ height: '16px', width: '16px' }} />
          Back to Leaves
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock style={{ width: '24px', height: '24px', color: '#d97706' }} />
                </div>
                <div>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>{pendingLeaves.length}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Pending Approvals</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Leaves Table */}
        <div style={cardStyle}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              Pending {pendingType} Approval
            </h3>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
              <Loader2 style={{ height: '32px', width: '32px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <CheckCircle style={{ height: '48px', width: '48px', color: '#22c55e', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>No pending leave requests</p>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: '8px 0 0 0' }}>All caught up!</p>
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
                      Reason
                    </th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLeaves.map((leave, index) => {
                    const typeConfig = leaveTypeConfig[leave.leaveType];

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
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', margin: 0 }}>
                                {leave.employee.firstName} {leave.employee.lastName}
                              </p>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                {leave.employee.user?.email}
                              </p>
                            </div>
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
                          <span style={{ fontSize: '14px', color: '#64748b', maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {leave.reason}
                          </span>
                        </td>
                        <td style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleApprove(leave.id)}
                              disabled={actionLoading === leave.id}
                              style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#22c55e',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: actionLoading === leave.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: actionLoading === leave.id ? 0.6 : 1,
                              }}
                            >
                              <Check style={{ width: '16px', height: '16px' }} />
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(leave)}
                              disabled={actionLoading === leave.id}
                              style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: actionLoading === leave.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: actionLoading === leave.id ? 0.6 : 1,
                              }}
                            >
                              <X style={{ width: '16px', height: '16px' }} />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setRejectModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              Reject Leave Request
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
              Please provide a reason for rejecting this leave request from{' '}
              <strong>{selectedLeave?.employee.firstName} {selectedLeave?.employee.lastName}</strong>.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setRejectModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading !== null}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: !rejectReason.trim() ? '#d1d5db' : '#ef4444',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: !rejectReason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Reject Leave
              </button>
            </div>
          </div>
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