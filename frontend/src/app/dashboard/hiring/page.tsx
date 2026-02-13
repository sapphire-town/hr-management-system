'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { DashboardLayout } from '@/components/layout';
import { hiringAPI, roleAPI } from '@/lib/api-client';
import {
  Plus,
  Briefcase,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  X,
  Play,
  Flag,
  Loader2,
  Trash2,
} from 'lucide-react';

interface HiringRequest {
  id: string;
  requestedBy: string;
  roleId: string;
  positions: number;
  justification: string;
  urgency: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  requester: { firstName: string; lastName: string };
  role: { name: string };
}

interface HiringStats {
  total: number;
  pending: number;
  approved: number;
  inProgress: number;
  filled: number;
  rejected: number;
  totalPositionsOpen: number;
  byUrgency: Record<string, number>;
}

interface Role {
  id: string;
  name: string;
}

interface RoleRequirement {
  id: string;
  name: string;
  current: number;
  required: number;
  shortage: number;
  fulfillmentRate: number;
}

interface RequirementStats {
  roles: RoleRequirement[];
  summary: {
    totalEmployees: number;
    totalRequired: number;
    totalShortage: number;
    overallFulfillment: number;
  };
}

const URGENCY_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  LOW: { color: '#6b7280', bg: '#f3f4f6', icon: Flag },
  MEDIUM: { color: '#d97706', bg: '#fef3c7', icon: Flag },
  HIGH: { color: '#ea580c', bg: '#ffedd5', icon: AlertTriangle },
  CRITICAL: { color: '#dc2626', bg: '#fee2e2', icon: AlertTriangle },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: '#d97706', bg: '#fef3c7', label: 'Pending' },
  APPROVED: { color: '#16a34a', bg: '#dcfce7', label: 'Approved' },
  REJECTED: { color: '#dc2626', bg: '#fee2e2', label: 'Rejected' },
  IN_PROGRESS: { color: '#7c3aed', bg: '#ede9fe', label: 'In Progress' },
  FILLED: { color: '#059669', bg: '#d1fae5', label: 'Filled' },
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: '20px', height: '20px', color }} />
        </div>
        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{value}</div>
    </div>
  );
}

export default function HiringRequestsPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<HiringRequest[]>([]);
  const [stats, setStats] = useState<HiringStats | null>(null);
  const [requirementStats, setRequirementStats] = useState<RequirementStats | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState<HiringRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formRoleId, setFormRoleId] = useState('');
  const [formPositions, setFormPositions] = useState(1);
  const [formJustification, setFormJustification] = useState('');
  const [formUrgency, setFormUrgency] = useState('MEDIUM');

  // Approve/reject form state
  const [approveAction, setApproveAction] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');

  const isDirector = user?.role === 'DIRECTOR';
  const isHR = user?.role === 'HR_HEAD';
  const isManager = user?.role === 'MANAGER';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const [requestsRes, rolesRes] = await Promise.all([
        hiringAPI.getAll(params),
        roleAPI.getAll(),
      ]);

      setRequests(requestsRes.data?.data || requestsRes.data || []);
      setRoles(rolesRes.data || []);

      // Stats and requirements only for Director & HR
      if (isDirector || isHR) {
        const [statsRes, reqStatsRes] = await Promise.all([
          hiringAPI.getStats(),
          roleAPI.getStatistics(),
        ]);
        setStats(statsRes.data);
        setRequirementStats(reqStatsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch hiring data:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isDirector, isHR]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!formRoleId || !formJustification) return;
    setActionLoading(true);
    try {
      await hiringAPI.create({
        roleId: formRoleId,
        positions: formPositions,
        justification: formJustification,
        urgency: formUrgency,
      });
      setShowCreateModal(false);
      setFormRoleId('');
      setFormPositions(1);
      setFormJustification('');
      setFormUrgency('MEDIUM');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!showApproveModal) return;
    if (!approveAction && !rejectionReason) {
      alert('Please provide a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      await hiringAPI.approve(showApproveModal.id, {
        approve: approveAction,
        rejectionReason: approveAction ? undefined : rejectionReason,
      });
      setShowApproveModal(null);
      setRejectionReason('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await hiringAPI.updateStatus(id, status);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hiring request?')) return;
    try {
      await hiringAPI.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete request');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '44px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '0 16px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#f9fafb',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '20px 20px',
    paddingRight: '36px',
  };

  return (
    <DashboardLayout
      title="Hiring Requests"
      description={isHR ? 'Manage approved hiring requests as your targets' : isDirector ? 'Create and approve hiring requests' : 'Submit hiring requests'}
      actions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Status filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                ...selectStyle,
                width: '160px',
                height: '40px',
              }}
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FILLED">Filled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Create button for Director and Manager */}
          {(isDirector || isManager) && (
            <button
              onClick={() => setShowCreateModal(true)}
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
                cursor: 'pointer',
              }}
            >
              <Plus style={{ width: '16px', height: '16px' }} />
              New Request
            </button>
          )}
        </div>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#9ca3af', fontSize: '14px' }}>
          <Loader2 style={{ width: '24px', height: '24px', marginRight: '8px', animation: 'spin 1s linear infinite' }} />
          Loading hiring requests...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats Cards - Director & HR */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <StatCard icon={Briefcase} label="Total Requests" value={stats.total} color="#7c3aed" />
              <StatCard icon={Clock} label="Pending Approval" value={stats.pending} color="#d97706" />
              <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="#16a34a" />
              <StatCard icon={Play} label="In Progress" value={stats.inProgress} color="#7c3aed" />
              <StatCard icon={Users} label="Positions Open" value={stats.totalPositionsOpen} color="#3b82f6" />
              <StatCard icon={Flag} label="Filled" value={stats.filled} color="#059669" />
            </div>
          )}

          {/* Organization-wide Employee Requirements Table */}
          {requirementStats && (isDirector || isHR) && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f3f4f6',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  Employee Requirements
                </h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>
                    Total: <strong style={{ color: '#111827' }}>{requirementStats.summary.totalEmployees}/{requirementStats.summary.totalRequired}</strong>
                  </span>
                  <span style={{ color: '#6b7280' }}>
                    Gap: <strong style={{ color: requirementStats.summary.totalShortage > 0 ? '#dc2626' : '#059669' }}>
                      {requirementStats.summary.totalShortage > 0 ? `-${requirementStats.summary.totalShortage}` : 'None'}
                    </strong>
                  </span>
                  <span style={{ color: '#6b7280' }}>
                    Fulfillment: <strong style={{ color: requirementStats.summary.overallFulfillment >= 100 ? '#059669' : '#d97706' }}>
                      {requirementStats.summary.overallFulfillment}%
                    </strong>
                  </span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      {['Role', 'Minimum Required', 'Current Count', 'Gap', 'Fulfillment'].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '10px 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requirementStats.roles
                      .filter((r) => r.required > 0)
                      .map((role, idx) => (
                        <tr key={role.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>{role.name}</td>
                          <td style={{ padding: '12px 16px', color: '#374151' }}>{role.required}</td>
                          <td style={{ padding: '12px 16px', color: '#374151' }}>{role.current}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {role.shortage > 0 ? (
                              <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '13px' }}>
                                Need {role.shortage} more
                              </span>
                            ) : (
                              <span style={{ color: '#059669', fontWeight: 500, fontSize: '13px' }}>
                                {role.current > role.required ? `+${role.current - role.required} surplus` : 'Optimal'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, maxWidth: '100px', height: '6px', borderRadius: '3px', backgroundColor: '#f3f4f6' }}>
                                <div
                                  style={{
                                    width: `${Math.min(100, role.fulfillmentRate)}%`,
                                    height: '100%',
                                    borderRadius: '3px',
                                    backgroundColor: role.fulfillmentRate >= 100 ? '#059669' : role.fulfillmentRate >= 50 ? '#d97706' : '#dc2626',
                                    transition: 'width 0.3s ease',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: role.fulfillmentRate >= 100 ? '#059669' : '#6b7280' }}>
                                {role.fulfillmentRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {requirementStats.roles.filter((r) => r.required > 0).length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af' }}>
                          No staffing requirements set. {isDirector ? 'Go to Roles page to set targets.' : 'Ask the Director to set targets.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HR Target Banner */}
          {isHR && (
            <div
              style={{
                backgroundColor: '#f5f3ff',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid #ede9fe',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users style={{ width: '20px', height: '20px', color: '#7c3aed' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#5b21b6', fontSize: '14px' }}>Your Hiring Targets</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Approved and In-Progress requests are your targets to fill. Update status as you progress.
                </div>
              </div>
            </div>
          )}

          {/* Requests Table */}
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
              {isHR ? 'Hiring Requests' : isDirector ? 'All Hiring Requests' : 'My Hiring Requests'}
            </h3>

            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                <Briefcase style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>No hiring requests found</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  {isDirector || isManager ? 'Click "New Request" to create one.' : 'No requests have been submitted yet.'}
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    {['Role', 'Positions', 'Urgency', 'Requested By', 'Status', 'Date', 'Actions'].map((h) => (
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
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req, idx) => {
                    const urgencyConf = URGENCY_CONFIG[req.urgency] || URGENCY_CONFIG.MEDIUM;
                    const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                    const UrgencyIcon = urgencyConf.icon;

                    return (
                      <tr
                        key={req.id}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        }}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: 500, color: '#111827' }}>
                          {req.role.name}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#111827', fontWeight: 600 }}>
                          {req.positions}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: urgencyConf.bg,
                              color: urgencyConf.color,
                            }}
                          >
                            <UrgencyIcon style={{ width: '12px', height: '12px' }} />
                            {req.urgency}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#6b7280' }}>
                          {req.requester.firstName} {req.requester.lastName}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: statusConf.bg,
                              color: statusConf.color,
                            }}
                          >
                            {statusConf.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {/* Director: Approve/Reject pending */}
                            {isDirector && req.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => { setShowApproveModal(req); setApproveAction(true); }}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #dcfce7',
                                    backgroundColor: '#f0fdf4',
                                    color: '#16a34a',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => { setShowApproveModal(req); setApproveAction(false); }}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #fee2e2',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* HR: Mark In Progress */}
                            {isHR && req.status === 'APPROVED' && (
                              <button
                                onClick={() => handleStatusUpdate(req.id, 'IN_PROGRESS')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #ede9fe',
                                  backgroundColor: '#f5f3ff',
                                  color: '#7c3aed',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Start Hiring
                              </button>
                            )}

                            {/* HR: Mark Filled */}
                            {isHR && req.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleStatusUpdate(req.id, 'FILLED')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #d1fae5',
                                  backgroundColor: '#ecfdf5',
                                  color: '#059669',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Mark Filled
                              </button>
                            )}

                            {/* Director: Delete */}
                            {isDirector && (
                              <button
                                onClick={() => handleDelete(req.id)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #e5e7eb',
                                  backgroundColor: '#ffffff',
                                  color: '#6b7280',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Trash2 style={{ width: '14px', height: '14px' }} />
                              </button>
                            )}

                            {/* Show rejection reason */}
                            {req.status === 'REJECTED' && req.rejectionReason && (
                              <span style={{ fontSize: '11px', color: '#dc2626', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.rejectionReason}>
                                {req.rejectionReason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Justification detail row for each request */}
          {requests.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #f3f4f6',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
                Request Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requests.map((req) => {
                  const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                  return (
                    <div
                      key={req.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f3f4f6',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                          {req.role.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          ({req.positions} position{req.positions > 1 ? 's' : ''})
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: statusConf.bg,
                            color: statusConf.color,
                          }}
                        >
                          {statusConf.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '1.5' }}>
                        {req.justification}
                      </p>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                        Requested by {req.requester.firstName} {req.requester.lastName} on {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>New Hiring Request</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Role */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Role *</label>
              <select value={formRoleId} onChange={(e) => setFormRoleId(e.target.value)} style={selectStyle}>
                <option value="">Select a role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Positions */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Number of Positions *</label>
              <input
                type="number"
                min={1}
                value={formPositions}
                onChange={(e) => setFormPositions(parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
            </div>

            {/* Urgency */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Urgency *</label>
              <select value={formUrgency} onChange={(e) => setFormUrgency(e.target.value)} style={selectStyle}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Justification */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Justification *</label>
              <textarea
                value={formJustification}
                onChange={(e) => setFormJustification(e.target.value)}
                placeholder="Why are these positions needed?"
                rows={3}
                style={{
                  ...inputStyle,
                  height: 'auto',
                  padding: '12px 16px',
                  resize: 'vertical' as const,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formRoleId || !formJustification || actionLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: (!formRoleId || !formJustification || actionLoading) ? 'not-allowed' : 'pointer',
                  opacity: (!formRoleId || !formJustification || actionLoading) ? 0.5 : 1,
                }}
              >
                {actionLoading ? 'Creating...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {showApproveModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
          onClick={() => setShowApproveModal(null)}
        >
          <div
            style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: approveAction ? '#16a34a' : '#dc2626', margin: 0 }}>
                {approveAction ? 'Approve Request' : 'Reject Request'}
              </h2>
              <button onClick={() => setShowApproveModal(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                {showApproveModal.role.name} - {showApproveModal.positions} position{showApproveModal.positions > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                Requested by {showApproveModal.requester.firstName} {showApproveModal.requester.lastName}
              </div>
              <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '8px' }}>
                {showApproveModal.justification}
              </div>
            </div>

            {!approveAction && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why this request is being rejected..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    height: 'auto',
                    padding: '12px 16px',
                    resize: 'vertical' as const,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            )}

            {approveAction && (
              <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>
                  Approving this request will notify HR to begin the recruitment process for {showApproveModal.positions} {showApproveModal.role.name} position{showApproveModal.positions > 1 ? 's' : ''}.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowApproveModal(null)}
                style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading || (!approveAction && !rejectionReason)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: approveAction ? '#16a34a' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: (actionLoading || (!approveAction && !rejectionReason)) ? 'not-allowed' : 'pointer',
                  opacity: (actionLoading || (!approveAction && !rejectionReason)) ? 0.5 : 1,
                }}
              >
                {actionLoading ? 'Processing...' : approveAction ? 'Approve' : 'Reject'}
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
