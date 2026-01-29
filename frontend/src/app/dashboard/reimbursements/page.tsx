'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  Users,
  Eye,
  CreditCard,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { reimbursementAPI } from '@/lib/api-client';

interface Claim {
  id: string;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  status: string;
  createdAt: string;
  acknowledgedAt?: string | null;
  rejectionReason?: string | null;
  managerComment?: string | null;
  hrComment?: string | null;
  receiptPath?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    user?: { email: string };
  };
}

interface Stats {
  totalClaims: number;
  pendingClaims: number;
  approvedAmount: number;
  rejectedCount: number;
}

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  travel: { icon: <TrendingUp style={{ height: '18px', width: '18px' }} />, label: 'Travel', color: '#7c3aed' },
  food: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Food & Meals', color: '#f59e0b' },
  communication: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Communication', color: '#3b82f6' },
  accommodation: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Accommodation', color: '#06b6d4' },
  transport: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Local Transport', color: '#10b981' },
  medical: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Medical', color: '#ef4444' },
  training: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Training', color: '#8b5cf6' },
  equipment: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Equipment', color: '#ec4899' },
  other: { icon: <Receipt style={{ height: '18px', width: '18px' }} />, label: 'Other', color: '#6b7280' },
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  SUBMITTED: { color: '#3b82f6', bg: '#eff6ff', label: 'Submitted' },
  MANAGER_APPROVED: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Manager Approved' },
  PENDING_HR: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending HR' },
  APPROVED: { color: '#22c55e', bg: '#f0fdf4', label: 'Approved' },
  PAYMENT_PROCESSED: { color: '#06b6d4', bg: '#ecfeff', label: 'Payment Processed' },
  ACKNOWLEDGED: { color: '#10b981', bg: '#ecfdf5', label: 'Acknowledged' },
  REJECTED: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
  MANAGER_REJECTED: { color: '#ef4444', bg: '#fef2f2', label: 'Manager Rejected' },
  HR_REJECTED: { color: '#ef4444', bg: '#fef2f2', label: 'HR Rejected' },
};

export default function ReimbursementsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<'my' | 'team' | 'pending'>('my');
  const [filter, setFilter] = React.useState<string>('all');
  const [claims, setClaims] = React.useState<Claim[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const isManager = user?.role === 'MANAGER';
  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      let claimsData: Claim[] = [];

      if (activeTab === 'my') {
        const [claimsRes, statsRes] = await Promise.all([
          reimbursementAPI.getMyClaims(),
          reimbursementAPI.getMyStats(),
        ]);
        claimsData = claimsRes.data;
        setStats(statsRes.data);
      } else if (activeTab === 'team' && isManager) {
        const res = await reimbursementAPI.getTeamClaims();
        claimsData = res.data;
      } else if (activeTab === 'pending' && isHR) {
        const res = await reimbursementAPI.getPending();
        claimsData = res.data;
      }

      setClaims(claimsData);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isManager, isHR]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcknowledge = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      await reimbursementAPI.acknowledge(claimId);
      fetchData();
    } catch (error) {
      console.error('Error acknowledging claim:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManagerApprove = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      await reimbursementAPI.managerApprove(claimId);
      fetchData();
    } catch (error) {
      console.error('Error approving claim:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManagerReject = async (claimId: string) => {
    if (!rejectReason.trim()) return;
    setActionLoading(claimId);
    try {
      await reimbursementAPI.managerReject(claimId, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
      fetchData();
    } catch (error) {
      console.error('Error rejecting claim:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleHRApprove = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      await reimbursementAPI.hrApprove(claimId);
      fetchData();
    } catch (error) {
      console.error('Error approving claim:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleHRReject = async (claimId: string) => {
    if (!rejectReason.trim()) return;
    setActionLoading(claimId);
    try {
      await reimbursementAPI.hrReject(claimId, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
      fetchData();
    } catch (error) {
      console.error('Error rejecting claim:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessPayment = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      await reimbursementAPI.processPayment(claimId);
      fetchData();
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewReceipt = async (claimId: string) => {
    try {
      const res = await reimbursementAPI.getReceipt(claimId);
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading receipt:', error);
    }
  };

  const filteredClaims = filter === 'all'
    ? claims
    : claims.filter(c => c.status === filter);

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: isActive ? '#7c3aed' : 'transparent',
    color: isActive ? '#ffffff' : '#6b7280',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const filterButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: isActive ? '2px solid #7c3aed' : '1px solid #e5e7eb',
    backgroundColor: isActive ? '#f5f3ff' : '#ffffff',
    color: isActive ? '#7c3aed' : '#6b7280',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const actionButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s',
  };

  return (
    <DashboardLayout
      title="Reimbursements"
      description="Submit and track expense reimbursements"
      actions={
        <button
          onClick={() => router.push('/dashboard/reimbursements/submit')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Plus style={{ height: '16px', width: '16px' }} />
          Submit Claim
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Tabs for Manager/HR */}
        {(isManager || isHR) && (
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
            <button onClick={() => setActiveTab('my')} style={tabStyle(activeTab === 'my')}>
              <Receipt style={{ height: '16px', width: '16px', display: 'inline', marginRight: '8px' }} />
              My Claims
            </button>
            {isManager && (
              <button onClick={() => setActiveTab('team')} style={tabStyle(activeTab === 'team')}>
                <Users style={{ height: '16px', width: '16px', display: 'inline', marginRight: '8px' }} />
                Team Claims
              </button>
            )}
            {isHR && (
              <button onClick={() => setActiveTab('pending')} style={tabStyle(activeTab === 'pending')}>
                <Clock style={{ height: '16px', width: '16px', display: 'inline', marginRight: '8px' }} />
                Pending Approval
              </button>
            )}
          </div>
        )}

        {/* Stats - only show for My Claims tab */}
        {activeTab === 'my' && stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {[
              { label: 'Total Claims', value: stats.totalClaims, icon: <FileText />, color: '#7c3aed' },
              { label: 'Pending', value: stats.pendingClaims, icon: <Clock />, color: '#f59e0b' },
              { label: 'Approved Amount', value: `₹${stats.approvedAmount?.toLocaleString() || 0}`, icon: <DollarSign />, color: '#22c55e' },
              { label: 'Rejected', value: stats.rejectedCount, icon: <XCircle />, color: '#ef4444' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  ...cardStyle,
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: `${stat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                  }}
                >
                  {React.cloneElement(stat.icon as React.ReactElement, { style: { height: '24px', width: '24px' } })}
                </div>
                <div>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'MANAGER_APPROVED', label: 'Manager Approved' },
            { value: 'PENDING_HR', label: 'Pending HR' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'PAYMENT_PROCESSED', label: 'Processed' },
            { value: 'REJECTED', label: 'Rejected' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={filterButtonStyle(filter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Claims Table */}
        <div style={cardStyle}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
              {activeTab === 'my' ? 'My Reimbursement Claims' : activeTab === 'team' ? 'Team Reimbursement Claims' : 'Pending Approval'}
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              Loading claims...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {(activeTab !== 'my' ? ['Employee'] : []).concat(['Category', 'Amount', 'Expense Date', 'Description', 'Status', 'Action']).map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim, idx) => {
                    const category = categoryConfig[claim.category?.toLowerCase()] || categoryConfig.other;
                    const status = statusConfig[claim.status] || statusConfig.SUBMITTED;
                    return (
                      <tr
                        key={claim.id}
                        style={{
                          borderBottom: idx < filteredClaims.length - 1 ? '1px solid #f3f4f6' : 'none',
                        }}
                      >
                        {activeTab !== 'my' && (
                          <td style={{ padding: '16px' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                                {claim.employee?.firstName} {claim.employee?.lastName}
                              </p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                                {claim.employee?.user?.email}
                              </p>
                            </div>
                          </td>
                        )}
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                backgroundColor: `${category.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: category.color,
                              }}
                            >
                              {category.icon}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                              {category.label}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                            ₹{claim.amount?.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {new Date(claim.expenseDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={{ padding: '16px', maxWidth: '250px' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {claim.description?.length > 40 ? `${claim.description.substring(0, 40)}...` : claim.description}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: status.bg,
                              color: status.color,
                            }}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {/* View Receipt */}
                            {claim.receiptPath && (
                              <button
                                onClick={() => handleViewReceipt(claim.id)}
                                style={{
                                  ...actionButtonStyle,
                                  backgroundColor: '#f3f4f6',
                                  color: '#374151',
                                }}
                              >
                                <Eye style={{ height: '14px', width: '14px' }} />
                                Receipt
                              </button>
                            )}

                            {/* Employee Acknowledge */}
                            {activeTab === 'my' && claim.status === 'PAYMENT_PROCESSED' && (
                              <button
                                onClick={() => handleAcknowledge(claim.id)}
                                disabled={actionLoading === claim.id}
                                style={{
                                  ...actionButtonStyle,
                                  backgroundColor: '#7c3aed',
                                  color: '#ffffff',
                                }}
                              >
                                {actionLoading === claim.id ? 'Processing...' : 'Acknowledge'}
                              </button>
                            )}

                            {/* Manager Actions */}
                            {activeTab === 'team' && claim.status === 'SUBMITTED' && (
                              <>
                                <button
                                  onClick={() => handleManagerApprove(claim.id)}
                                  disabled={actionLoading === claim.id}
                                  style={{
                                    ...actionButtonStyle,
                                    backgroundColor: '#22c55e',
                                    color: '#ffffff',
                                  }}
                                >
                                  <CheckCircle style={{ height: '14px', width: '14px' }} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => setShowRejectModal(claim.id)}
                                  style={{
                                    ...actionButtonStyle,
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                  }}
                                >
                                  <XCircle style={{ height: '14px', width: '14px' }} />
                                  Reject
                                </button>
                              </>
                            )}

                            {/* HR Actions */}
                            {activeTab === 'pending' && (claim.status === 'MANAGER_APPROVED' || claim.status === 'PENDING_HR' || claim.status === 'SUBMITTED') && (
                              <>
                                <button
                                  onClick={() => handleHRApprove(claim.id)}
                                  disabled={actionLoading === claim.id}
                                  style={{
                                    ...actionButtonStyle,
                                    backgroundColor: '#22c55e',
                                    color: '#ffffff',
                                  }}
                                >
                                  <CheckCircle style={{ height: '14px', width: '14px' }} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => setShowRejectModal(claim.id)}
                                  style={{
                                    ...actionButtonStyle,
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                  }}
                                >
                                  <XCircle style={{ height: '14px', width: '14px' }} />
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Process Payment */}
                            {activeTab === 'pending' && claim.status === 'APPROVED' && (
                              <button
                                onClick={() => handleProcessPayment(claim.id)}
                                disabled={actionLoading === claim.id}
                                style={{
                                  ...actionButtonStyle,
                                  backgroundColor: '#06b6d4',
                                  color: '#ffffff',
                                }}
                              >
                                <CreditCard style={{ height: '14px', width: '14px' }} />
                                Process Payment
                              </button>
                            )}

                            {/* Rejection Reason Display */}
                            {(claim.status === 'REJECTED' || claim.status === 'MANAGER_REJECTED' || claim.status === 'HR_REJECTED') && claim.rejectionReason && (
                              <span style={{ fontSize: '12px', color: '#ef4444' }}>
                                {claim.rejectionReason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredClaims.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  No claims found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Policy Info */}
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: '#f5f3ff',
            border: '1px solid #e9d5ff',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#5b21b6', margin: 0, marginBottom: '12px' }}>
            Reimbursement Policy
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280', fontSize: '13px', lineHeight: '1.8' }}>
            <li>Submit claims within 30 days of expense date</li>
            <li>Original receipts are required for claims above ₹500</li>
            <li>Manager approval required for all claims</li>
            <li>HR approval required for claims above ₹5,000</li>
            <li>Payment is processed within 7 working days after final approval</li>
          </ul>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => {
            setShowRejectModal(null);
            setRejectReason('');
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, marginBottom: '16px', color: '#111827' }}>
              Reject Claim
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, marginBottom: '16px' }}>
              Please provide a reason for rejecting this claim.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
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
                onClick={() => {
                  if (activeTab === 'team') {
                    handleManagerReject(showRejectModal);
                  } else {
                    handleHRReject(showRejectModal);
                  }
                }}
                disabled={!rejectReason.trim() || actionLoading === showRejectModal}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: !rejectReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: !rejectReason.trim() ? 0.5 : 1,
                }}
              >
                {actionLoading === showRejectModal ? 'Rejecting...' : 'Reject Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
