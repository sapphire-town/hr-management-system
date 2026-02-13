'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  Plus,
  Check,
  X,
  Clock,
  Trophy,
  Users,
  Calendar,
  Star,
  Loader2,
  ChevronDown,
  Search,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { directorsListAPI, employeeAPI } from '@/lib/api-client';
import { format } from 'date-fns';

interface Nomination {
  id: string;
  employeeId: string;
  nominatedBy: string;
  period: string;
  reason: string;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  employee: {
    firstName: string;
    lastName: string;
    role?: { name: string };
    user?: { email: string };
  };
  nominator: {
    firstName: string;
    lastName: string;
  };
}

interface Stats {
  total: number;
  currentMonth: number;
  approved: number;
  pending: number;
  topEmployees: {
    id: string;
    firstName: string;
    lastName: string;
    directorsListCount: number;
    role?: { name: string };
  }[];
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role?: { name: string };
  department?: { name: string };
}

const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, 'MMMM yyyy');
};

// Style constants
const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
  } as React.CSSProperties,
  cardValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
  } as React.CSSProperties,
  iconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 16px',
    paddingLeft: '40px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  } as React.CSSProperties,
  select: {
    padding: '10px 40px 10px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    appearance: 'none' as const,
    outline: 'none',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,
  th: {
    padding: '12px 24px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    backgroundColor: '#f9fafb',
  } as React.CSSProperties,
  td: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
  } as React.CSSProperties,
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#f3e8ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9333ea',
    fontWeight: '600',
    fontSize: '14px',
  } as React.CSSProperties,
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '500',
  } as React.CSSProperties,
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  } as React.CSSProperties,
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    padding: '24px',
    maxHeight: '90vh',
    overflow: 'auto',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '10px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'none' as const,
    outline: 'none',
  } as React.CSSProperties,
};

export default function DirectorsListPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [nominations, setNominations] = React.useState<Nomination[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [showNominateModal, setShowNominateModal] = React.useState(false);
  const [selectedNomination, setSelectedNomination] = React.useState<Nomination | null>(null);
  const [showApproveModal, setShowApproveModal] = React.useState(false);

  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [filterPeriod, setFilterPeriod] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const [nominationForm, setNominationForm] = React.useState({
    employeeId: '',
    period: getCurrentPeriod(),
    reason: '',
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const isDirector = user?.role === 'DIRECTOR';
  const canNominate = ['DIRECTOR', 'HR_HEAD', 'MANAGER'].includes(user?.role || '');

  // For portal rendering
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: '100' };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPeriod) params.period = filterPeriod;

      // Fetch nominations, stats, and employees independently so one failure doesn't block others
      const [nominationsResult, statsResult, employeesResult] = await Promise.allSettled([
        directorsListAPI.getAll(params),
        directorsListAPI.getStats(),
        employeeAPI.getAll(),
      ]);

      if (nominationsResult.status === 'fulfilled') {
        const nomData = nominationsResult.value.data?.data || nominationsResult.value.data || [];
        setNominations(Array.isArray(nomData) ? nomData : []);
      } else {
        console.error('Error fetching nominations:', nominationsResult.reason);
        setNominations([]);
        setError('Failed to load nominations. Please check your permissions or try again.');
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data);
      } else {
        console.error('Error fetching stats:', statsResult.reason);
      }

      if (employeesResult.status === 'fulfilled') {
        const empData = employeesResult.value.data?.data || employeesResult.value.data || [];
        setEmployees(Array.isArray(empData) ? empData : []);
      } else {
        console.error('Error fetching employees:', employeesResult.reason);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPeriod]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNominate = async () => {
    if (!nominationForm.employeeId || !nominationForm.reason) return;

    try {
      setSubmitting(true);
      await directorsListAPI.nominate(nominationForm);
      setShowNominateModal(false);
      setNominationForm({ employeeId: '', period: getCurrentPeriod(), reason: '' });
      await fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to submit nomination';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (isApproved: boolean) => {
    if (!selectedNomination) return;

    try {
      setSubmitting(true);
      await directorsListAPI.approve(selectedNomination.id, isApproved);
      setShowApproveModal(false);
      setSelectedNomination(null);
      await fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to process nomination';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openApproveModal = (nomination: Nomination) => {
    setSelectedNomination(nomination);
    setShowApproveModal(true);
  };

  const filteredNominations = nominations.filter(n =>
    `${n.employee.firstName} ${n.employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (nomination: Nomination) => {
    if (nomination.approvedBy === null) {
      return (
        <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#b45309' }}>
          <Clock style={{ width: '12px', height: '12px' }} />
          Pending
        </span>
      );
    }
    if (nomination.isApproved) {
      return (
        <span style={{ ...styles.badge, backgroundColor: '#dcfce7', color: '#15803d' }}>
          <Check style={{ width: '12px', height: '12px' }} />
          Approved
        </span>
      );
    }
    return (
      <span style={{ ...styles.badge, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
        <X style={{ width: '12px', height: '12px' }} />
        Rejected
      </span>
    );
  };

  // Generate period options (last 12 months)
  const periodOptions = React.useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value: period, label: format(date, 'MMMM yyyy') });
    }
    return options;
  }, []);

  return (
    <DashboardLayout
      title="Director's List"
      description="Recognize and reward top-performing employees"
      actions={
        canNominate ? (
          <button
            onClick={() => setShowNominateModal(true)}
            style={{
              ...styles.button,
              background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
              color: '#ffffff',
            }}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            Nominate Employee
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#9333ea' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Error Banner */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#b91c1c',
              fontSize: '14px',
            }}>
              <X style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Total Nominations</p>
                  <p style={styles.cardValue}>{stats?.total || 0}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#f3e8ff' }}>
                  <Award style={{ width: '24px', height: '24px', color: '#9333ea' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>This Month</p>
                  <p style={styles.cardValue}>{stats?.currentMonth || 0}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#dbeafe' }}>
                  <Calendar style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Approved</p>
                  <p style={{ ...styles.cardValue, color: '#16a34a' }}>{stats?.approved || 0}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#dcfce7' }}>
                  <Check style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Pending Review</p>
                  <p style={{ ...styles.cardValue, color: '#ca8a04' }}>{stats?.pending || 0}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#fef3c7' }}>
                  <Clock style={{ width: '24px', height: '24px', color: '#ca8a04' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          {stats?.topEmployees && stats.topEmployees.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)',
              borderRadius: '12px',
              padding: '24px',
              color: '#ffffff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Trophy style={{ width: '24px', height: '24px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Top Recognized Employees</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                {stats.topEmployees.map((emp, idx) => (
                  <div
                    key={emp.id}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 8px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {idx === 0 ? (
                        <Trophy style={{ width: '24px', height: '24px', color: '#fcd34d' }} />
                      ) : (
                        <Star style={{ width: '24px', height: '24px', color: 'rgba(255, 255, 255, 0.8)' }} />
                      )}
                    </div>
                    <p style={{ fontWeight: '600', margin: '0 0 4px 0' }}>{emp.firstName} {emp.lastName}</p>
                    <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0' }}>{emp.role?.name || 'N/A'}</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', margin: '0' }}>{emp.directorsListCount}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '0' }}>times recognized</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={styles.card}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                <Search style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: '#9ca3af',
                }} />
                <input
                  type="text"
                  placeholder="Search by employee name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  style={styles.select}
                >
                  <option value="">All Periods</option>
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: '#9ca3af',
                  pointerEvents: 'none',
                }} />
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={styles.select}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: '#9ca3af',
                  pointerEvents: 'none',
                }} />
              </div>
            </div>
          </div>

          {/* Nominations List */}
          <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>Nominations</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Review and manage employee nominations</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Period</th>
                    <th style={styles.th}>Nominated By</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Status</th>
                    {isDirector && <th style={styles.th}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredNominations.map((nomination) => (
                    <tr key={nomination.id} style={{ backgroundColor: '#ffffff' }}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={styles.avatar}>
                            {nomination.employee.firstName[0]}{nomination.employee.lastName[0]}
                          </div>
                          <div style={{ marginLeft: '12px' }}>
                            <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>
                              {nomination.employee.firstName} {nomination.employee.lastName}
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                              {nomination.employee.role?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, color: '#4b5563' }}>
                        {formatPeriod(nomination.period)}
                      </td>
                      <td style={{ ...styles.td, color: '#4b5563' }}>
                        {nomination.nominator.firstName} {nomination.nominator.lastName}
                      </td>
                      <td style={styles.td}>
                        <p style={{
                          fontSize: '14px',
                          color: '#4b5563',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          margin: 0,
                        }} title={nomination.reason}>
                          {nomination.reason}
                        </p>
                      </td>
                      <td style={styles.td}>
                        {getStatusBadge(nomination)}
                      </td>
                      {isDirector && (
                        <td style={styles.td}>
                          {nomination.approvedBy === null && (
                            <button
                              onClick={() => openApproveModal(nomination)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#9333ea',
                                fontWeight: '500',
                                fontSize: '14px',
                                cursor: 'pointer',
                              }}
                            >
                              Review
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredNominations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                  No nominations found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nominate Modal - Using Portal */}
      {mounted && showNominateModal && createPortal(
        <div
          style={styles.modalOverlay}
          onClick={() => setShowNominateModal(false)}
        >
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              Nominate Employee
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.label}>Select Employee *</label>
                <select
                  value={nominationForm.employeeId}
                  onChange={(e) => setNominationForm({ ...nominationForm, employeeId: e.target.value })}
                  style={{ ...styles.select, width: '100%', paddingRight: '16px' }}
                >
                  <option value="">Choose an employee</option>
                  {(employees || []).map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - {emp.role?.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Period *</label>
                <select
                  value={nominationForm.period}
                  onChange={(e) => setNominationForm({ ...nominationForm, period: e.target.value })}
                  style={{ ...styles.select, width: '100%', paddingRight: '16px' }}
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Reason for Nomination *</label>
                <textarea
                  value={nominationForm.reason}
                  onChange={(e) => setNominationForm({ ...nominationForm, reason: e.target.value })}
                  rows={4}
                  placeholder="Describe why this employee deserves to be on the Director's List..."
                  style={styles.textarea}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
                <button
                  onClick={() => setShowNominateModal(false)}
                  style={{
                    ...styles.button,
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    color: '#4b5563',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleNominate}
                  disabled={!nominationForm.employeeId || !nominationForm.reason || submitting}
                  style={{
                    ...styles.button,
                    background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                    color: '#ffffff',
                    opacity: (!nominationForm.employeeId || !nominationForm.reason || submitting) ? 0.5 : 1,
                    cursor: (!nominationForm.employeeId || !nominationForm.reason || submitting) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Nomination'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Approve Modal - Using Portal */}
      {mounted && showApproveModal && selectedNomination && createPortal(
        <div
          style={styles.modalOverlay}
          onClick={() => setShowApproveModal(false)}
        >
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              Review Nomination
            </h3>

            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  ...styles.avatar,
                  width: '48px',
                  height: '48px',
                  fontSize: '16px',
                }}>
                  {selectedNomination.employee.firstName[0]}{selectedNomination.employee.lastName[0]}
                </div>
                <div>
                  <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                    {selectedNomination.employee.firstName} {selectedNomination.employee.lastName}
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    {selectedNomination.employee.role?.name || 'N/A'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <p style={{ margin: 0 }}>
                  <span style={{ color: '#6b7280' }}>Period:</span>{' '}
                  <span style={{ color: '#111827' }}>{formatPeriod(selectedNomination.period)}</span>
                </p>
                <p style={{ margin: 0 }}>
                  <span style={{ color: '#6b7280' }}>Nominated by:</span>{' '}
                  <span style={{ color: '#111827' }}>{selectedNomination.nominator.firstName} {selectedNomination.nominator.lastName}</span>
                </p>
                <div>
                  <span style={{ color: '#6b7280' }}>Reason:</span>
                  <p style={{ marginTop: '4px', color: '#374151' }}>{selectedNomination.reason}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowApproveModal(false)}
                style={{
                  ...styles.button,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  color: '#4b5563',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(false)}
                disabled={submitting}
                style={{
                  ...styles.button,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
                Reject
              </button>
              <button
                onClick={() => handleApprove(true)}
                disabled={submitting}
                style={{
                  ...styles.button,
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <Check style={{ width: '16px', height: '16px' }} />
                Approve
              </button>
            </div>
          </div>
        </div>,
        document.body
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
