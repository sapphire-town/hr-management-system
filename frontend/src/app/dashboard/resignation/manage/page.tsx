'use client';

import * as React from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  UserX,
  Calendar,
  Loader2,
  Eye,
  Check,
  X,
  Package,
  Mail,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { resignationAPI } from '@/lib/api-client';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  user?: { email: string };
  role?: { name: string };
  manager?: { firstName: string; lastName: string };
  joinDate?: string;
}

interface Resignation {
  id: string;
  employeeId: string;
  noticePeriodDays: number;
  reason: string;
  lastWorkingDay: string;
  status: string;
  createdAt: string;
  managerApproved: boolean;
  hrApproved: boolean;
  rejectionReason?: string;
  assetHandover: boolean;
  accountDeactivatedAt: string | null;
  noDueClearanceSentAt: string | null;
  employee: Employee;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  exitComplete: number;
  upcomingExits: Array<{
    id: string;
    lastWorkingDay: string;
    employee: { firstName: string; lastName: string; role?: { name: string } };
  }>;
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  SUBMITTED: { color: '#3b82f6', bg: '#eff6ff', label: 'Submitted' },
  MANAGER_APPROVED: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Manager Approved' },
  PENDING_HR: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending HR' },
  APPROVED: { color: '#22c55e', bg: '#f0fdf4', label: 'Approved' },
  REJECTED: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
  EXIT_COMPLETE: { color: '#6b7280', bg: '#f3f4f6', label: 'Exit Complete' },
};

export default function ResignationManagePage() {
  const { user } = useAuthStore();
  const [resignations, setResignations] = React.useState<Resignation[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState('all');
  const [selectedResignation, setSelectedResignation] = React.useState<Resignation | null>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  const isManager = user?.role === 'MANAGER';
  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  React.useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isHR) {
        const [resignationsRes, statsRes] = await Promise.all([
          resignationAPI.getAll(),
          resignationAPI.getStats(),
        ]);
        setResignations(resignationsRes.data);
        setStats(statsRes.data);
      } else if (isManager) {
        const response = await resignationAPI.getTeam();
        setResignations(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch resignations');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (resignation: Resignation) => {
    setProcessing(true);
    try {
      if (resignation.status === 'SUBMITTED' && isManager) {
        await resignationAPI.managerApprove(resignation.id);
      } else if (resignation.status === 'PENDING_HR' && isHR) {
        await resignationAPI.hrApprove(resignation.id);
      }
      await fetchData();
      setShowDetailModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve resignation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedResignation || !rejectionReason.trim()) return;

    setProcessing(true);
    try {
      if (selectedResignation.status === 'SUBMITTED' && isManager) {
        await resignationAPI.managerReject(selectedResignation.id, rejectionReason);
      } else if (selectedResignation.status === 'PENDING_HR' && isHR) {
        await resignationAPI.hrReject(selectedResignation.id, rejectionReason);
      }
      await fetchData();
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectionReason('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject resignation');
    } finally {
      setProcessing(false);
    }
  };

  const handleExitStatusUpdate = async (field: 'assetHandover' | 'accountDeactivated' | 'noDueClearanceSent') => {
    if (!selectedResignation) return;

    setProcessing(true);
    try {
      await resignationAPI.updateExitStatus(selectedResignation.id, { [field]: true });
      await fetchData();
      // Refresh selected resignation
      const updated = await resignationAPI.getById(selectedResignation.id);
      setSelectedResignation(updated.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update exit status');
    } finally {
      setProcessing(false);
    }
  };

  const filteredResignations = React.useMemo(() => {
    if (activeTab === 'all') return resignations;
    return resignations.filter((r) => r.status === activeTab);
  }, [resignations, activeTab]);

  const canApprove = (resignation: Resignation) => {
    if (isManager && resignation.status === 'SUBMITTED') return true;
    if (isHR && resignation.status === 'PENDING_HR') return true;
    return false;
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  if (loading) {
    return (
      <DashboardLayout title="Manage Resignations" description="Review and manage resignation requests">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loader2 style={{ height: '48px', width: '48px', color: '#7c3aed', animation: 'spin 1s linear infinite' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Manage Resignations"
      description={isManager ? 'Review team resignation requests' : 'Manage all resignation requests'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Stats Cards (HR only) */}
        {isHR && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Total Resignations</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '4px 0 0 0' }}>{stats.total}</p>
                  </div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users style={{ height: '24px', width: '24px', color: '#6b7280' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Pending Approval</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', margin: '4px 0 0 0' }}>{stats.pending}</p>
                  </div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock style={{ height: '24px', width: '24px', color: '#f59e0b' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Approved</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e', margin: '4px 0 0 0' }}>{stats.approved}</p>
                  </div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle style={{ height: '24px', width: '24px', color: '#22c55e' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Exit Complete</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: '#6b7280', margin: '4px 0 0 0' }}>{stats.exitComplete}</p>
                  </div>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserX style={{ height: '24px', width: '24px', color: '#6b7280' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Exits (HR only) */}
        {isHR && stats && stats.upcomingExits.length > 0 && (
          <div style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp style={{ height: '18px', width: '18px', color: '#f59e0b' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                Upcoming Exits (Next 30 Days)
              </h3>
            </div>
            <div style={{ padding: '0' }}>
              {stats.upcomingExits.map((exit, idx) => (
                <div
                  key={exit.id}
                  style={{
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: idx < stats.upcomingExits.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>
                      {exit.employee.firstName} {exit.employee.lastName}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      {exit.employee.role?.name || 'Employee'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar style={{ height: '14px', width: '14px', color: '#6b7280' }} />
                    <span style={{ fontSize: '13px', color: '#374151' }}>
                      {new Date(exit.lastWorkingDay).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'SUBMITTED', 'PENDING_HR', 'APPROVED', 'REJECTED', 'EXIT_COMPLETE'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab ? '#7c3aed' : '#f3f4f6',
                color: activeTab === tab ? '#ffffff' : '#374151',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'all' ? 'All' : statusConfig[tab]?.label || tab}
            </button>
          ))}
        </div>

        {/* Resignations List */}
        <div style={cardStyle}>
          {filteredResignations.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Users style={{ height: '48px', width: '48px', color: '#d1d5db', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>No resignations found</p>
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
                  gap: '16px',
                  padding: '12px 20px',
                  backgroundColor: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                }}
              >
                <div>Employee</div>
                <div>Last Working Day</div>
                <div>Notice Period</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Table Body */}
              {filteredResignations.map((resignation) => (
                <div
                  key={resignation.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
                    gap: '16px',
                    padding: '16px 20px',
                    borderBottom: '1px solid #f3f4f6',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>
                      {resignation.employee.firstName} {resignation.employee.lastName}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                      {resignation.employee.role?.name || 'Employee'}
                    </p>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    {new Date(resignation.lastWorkingDay).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    {resignation.noticePeriodDays} days
                  </div>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        backgroundColor: statusConfig[resignation.status]?.bg || '#f3f4f6',
                        color: statusConfig[resignation.status]?.color || '#6b7280',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {statusConfig[resignation.status]?.label || resignation.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedResignation(resignation);
                        setShowDetailModal(true);
                      }}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                      }}
                      title="View Details"
                    >
                      <Eye style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                    </button>
                    {canApprove(resignation) && (
                      <>
                        <button
                          onClick={() => handleApprove(resignation)}
                          disabled={processing}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#22c55e',
                            cursor: 'pointer',
                          }}
                          title="Approve"
                        >
                          <Check style={{ height: '16px', width: '16px', color: '#ffffff' }} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedResignation(resignation);
                            setShowRejectModal(true);
                          }}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#ef4444',
                            cursor: 'pointer',
                          }}
                          title="Reject"
                        >
                          <X style={{ height: '16px', width: '16px', color: '#ffffff' }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedResignation && (
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
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '600px',
              margin: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#111827' }}>
                Resignation Details
              </h3>
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  backgroundColor: statusConfig[selectedResignation.status]?.bg || '#f3f4f6',
                  color: statusConfig[selectedResignation.status]?.color || '#6b7280',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {statusConfig[selectedResignation.status]?.label || selectedResignation.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Employee Info */}
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Employee</p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  {selectedResignation.employee.firstName} {selectedResignation.employee.lastName}
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  {selectedResignation.employee.role?.name || 'Employee'} • {selectedResignation.employee.user?.email}
                </p>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f9fafb' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Last Working Day</p>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: '4px 0 0 0' }}>
                    {new Date(selectedResignation.lastWorkingDay).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f9fafb' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Notice Period</p>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: '4px 0 0 0' }}>
                    {selectedResignation.noticePeriodDays} days
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f9fafb' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Submitted On</p>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: '4px 0 0 0' }}>
                    {new Date(selectedResignation.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f9fafb' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Approvals</p>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: '4px 0 0 0' }}>
                    Manager: {selectedResignation.managerApproved ? '✓' : '−'} | HR: {selectedResignation.hrApproved ? '✓' : '−'}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>Reason for Resignation</p>
                <p style={{ fontSize: '14px', color: '#111827', margin: 0, lineHeight: '1.6' }}>
                  {selectedResignation.reason}
                </p>
              </div>

              {/* Rejection Reason */}
              {selectedResignation.rejectionReason && (
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <p style={{ fontSize: '12px', color: '#991b1b', margin: '0 0 8px 0' }}>Rejection Reason</p>
                  <p style={{ fontSize: '14px', color: '#991b1b', margin: 0 }}>
                    {selectedResignation.rejectionReason}
                  </p>
                </div>
              )}

              {/* Exit Status (for approved resignations, HR only) */}
              {isHR && selectedResignation.status === 'APPROVED' && (
                <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 12px 0' }}>Exit Checklist</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                        <span style={{ fontSize: '14px', color: '#374151' }}>Asset Handover</span>
                      </div>
                      {selectedResignation.assetHandover ? (
                        <CheckCircle style={{ height: '20px', width: '20px', color: '#22c55e' }} />
                      ) : (
                        <button
                          onClick={() => handleExitStatusUpdate('assetHandover')}
                          disabled={processing}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#7c3aed',
                            color: '#ffffff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserX style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                        <span style={{ fontSize: '14px', color: '#374151' }}>Account Deactivated</span>
                      </div>
                      {selectedResignation.accountDeactivatedAt ? (
                        <CheckCircle style={{ height: '20px', width: '20px', color: '#22c55e' }} />
                      ) : (
                        <button
                          onClick={() => handleExitStatusUpdate('accountDeactivated')}
                          disabled={processing}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#7c3aed',
                            color: '#ffffff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                        <span style={{ fontSize: '14px', color: '#374151' }}>No Dues Clearance Sent</span>
                      </div>
                      {selectedResignation.noDueClearanceSentAt ? (
                        <CheckCircle style={{ height: '20px', width: '20px', color: '#22c55e' }} />
                      ) : (
                        <button
                          onClick={() => handleExitStatusUpdate('noDueClearanceSent')}
                          disabled={processing}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#7c3aed',
                            color: '#ffffff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                {canApprove(selectedResignation) && (
                  <>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedResignation)}
                      disabled={processing}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#22c55e',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {processing && <Loader2 style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }} />}
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedResignation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 51,
          }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '450px',
              margin: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle style={{ height: '20px', width: '20px', color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#111827' }}>
                  Reject Resignation
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  {selectedResignation.employee.firstName} {selectedResignation.employee.lastName}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this resignation..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
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
                disabled={processing || !rejectionReason.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: processing || !rejectionReason.trim() ? '#d1d5db' : '#ef4444',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: processing || !rejectionReason.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {processing && <Loader2 style={{ height: '16px', width: '16px', animation: 'spin 1s linear infinite' }} />}
                Reject Resignation
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