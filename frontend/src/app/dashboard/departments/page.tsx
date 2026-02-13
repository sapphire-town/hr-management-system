'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Users,
  Plus,
  Edit,
  Trash2,
  Settings,
  MoreVertical,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { roleAPI } from '@/lib/api-client';

interface Department {
  id: string;
  name: string;
  employeeCount: number;
  minimumRequired?: number;
  isActive: boolean;
  createdAt: string;
  _count?: { employees: number };
}

interface DepartmentStats {
  roles: {
    id: string;
    name: string;
    current: number;
    required: number;
    shortage: number;
    fulfillmentRate: number;
  }[];
  summary: {
    totalEmployees: number;
    totalRequired: number;
    totalShortage: number;
    overallFulfillment: number;
  };
}

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
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
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
    borderRadius: '12px',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2563eb',
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
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  } as React.CSSProperties,
};

export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [stats, setStats] = React.useState<DepartmentStats | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [selectedDept, setSelectedDept] = React.useState<Department | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Form states
  const [createForm, setCreateForm] = React.useState({ name: '' });
  const [editForm, setEditForm] = React.useState({ name: '' });
  const [requirementsForm, setRequirementsForm] = React.useState({ minimumRequired: 0 });

  const isDirector = user?.role === 'DIRECTOR';
  const isHRHead = user?.role === 'HR_HEAD';
  const canManage = isDirector || isHRHead;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [deptRes, statsRes] = await Promise.all([
        roleAPI.getAll(),
        roleAPI.getStatistics(),
      ]);

      const deptData = deptRes.data || [];
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get stats for a specific department
  const getDeptStats = (deptId: string) => {
    return stats?.roles.find(r => r.id === deptId);
  };

  const getStatusBadge = (current: number, required: number) => {
    if (required === 0) {
      return (
        <span style={{ ...styles.badge, backgroundColor: '#f3f4f6', color: '#6b7280' }}>
          No Target
        </span>
      );
    }
    if (current >= required) {
      return (
        <span style={{ ...styles.badge, backgroundColor: '#dcfce7', color: '#15803d' }}>
          <CheckCircle style={{ width: '12px', height: '12px' }} />
          Optimal
        </span>
      );
    }
    const shortage = required - current;
    return (
      <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#b45309' }}>
        <AlertTriangle style={{ width: '12px', height: '12px' }} />
        Need {shortage} more
      </span>
    );
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      alert('Please enter a department name');
      return;
    }

    try {
      setSubmitting(true);
      await roleAPI.create({ name: createForm.name.trim() });
      setShowCreateModal(false);
      setCreateForm({ name: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (dept: Department) => {
    setSelectedDept(dept);
    setEditForm({ name: dept.name });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const handleEdit = async () => {
    if (!selectedDept || !editForm.name.trim()) return;

    try {
      setSubmitting(true);
      await roleAPI.update(selectedDept.id, { name: editForm.name.trim() });
      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update department');
    } finally {
      setSubmitting(false);
    }
  };

  const openRequirementsModal = (dept: Department) => {
    const deptStats = getDeptStats(dept.id);
    setSelectedDept(dept);
    setRequirementsForm({ minimumRequired: deptStats?.required || 0 });
    setShowRequirementsModal(true);
    setActionMenuOpen(null);
  };

  const handleSetRequirements = async () => {
    if (!selectedDept) return;

    try {
      setSubmitting(true);
      await roleAPI.setRequirements(selectedDept.id, requirementsForm.minimumRequired);
      setShowRequirementsModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to set requirements');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (dept: Department) => {
    setSelectedDept(dept);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!selectedDept) return;

    try {
      setSubmitting(true);
      await roleAPI.delete(selectedDept.id);
      setShowDeleteModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete department');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <DashboardLayout title="Departments" description="Access Denied">
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
          Only Directors and HR Heads can access this page.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Departments"
      description="Manage organization departments and staffing"
      actions={
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            ...styles.button,
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: '#ffffff',
          }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          Add Department
        </button>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#2563eb' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Total Departments</p>
                  <p style={styles.cardValue}>{departments.length}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#dbeafe' }}>
                  <Building2 style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Total Employees</p>
                  <p style={styles.cardValue}>{stats?.summary.totalEmployees || 0}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#dcfce7' }}>
                  <Users style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Required Positions</p>
                  <p style={styles.cardValue}>{stats?.summary.totalRequired || 0}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#fef3c7' }}>
                  <UserPlus style={{ width: '24px', height: '24px', color: '#ca8a04' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Fulfillment Rate</p>
                  <p style={{ ...styles.cardValue, color: stats?.summary.overallFulfillment >= 100 ? '#16a34a' : '#ca8a04' }}>
                    {stats?.summary.overallFulfillment?.toFixed(0) || 0}%
                  </p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#f3e8ff' }}>
                  <TrendingUp style={{ width: '24px', height: '24px', color: '#9333ea' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Departments Table */}
          <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                All Departments
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Manage department staffing and requirements
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Department</th>
                    <th style={styles.th}>Current</th>
                    <th style={styles.th}>Required</th>
                    <th style={styles.th}>Fulfillment</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => {
                    const deptStats = getDeptStats(dept.id);
                    const current = deptStats?.current || dept._count?.employees || dept.employeeCount || 0;
                    const required = deptStats?.required || 0;
                    const fulfillment = deptStats?.fulfillmentRate || (required > 0 ? (current / required) * 100 : 100);

                    return (
                      <tr key={dept.id} style={{ backgroundColor: '#ffffff' }}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={styles.avatar}>
                              {dept.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ marginLeft: '12px' }}>
                              <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>
                                {dept.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...styles.td, color: '#4b5563' }}>
                          <span style={{ fontWeight: '600', fontSize: '16px' }}>{current}</span>
                          <span style={{ color: '#9ca3af' }}> employees</span>
                        </td>
                        <td style={{ ...styles.td, color: '#4b5563' }}>
                          {required > 0 ? (
                            <>
                              <span style={{ fontWeight: '600', fontSize: '16px' }}>{required}</span>
                              <span style={{ color: '#9ca3af' }}> minimum</span>
                            </>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>Not set</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={{ width: '120px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {fulfillment.toFixed(0)}%
                              </span>
                            </div>
                            <div style={styles.progressBar}>
                              <div
                                style={{
                                  width: `${Math.min(fulfillment, 100)}%`,
                                  height: '100%',
                                  backgroundColor: fulfillment >= 100 ? '#16a34a' : fulfillment >= 75 ? '#ca8a04' : '#dc2626',
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          {getStatusBadge(current, required)}
                        </td>
                        <td style={styles.td}>
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setActionMenuOpen(actionMenuOpen === dept.id ? null : dept.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                              }}
                            >
                              <MoreVertical style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                            </button>
                            {actionMenuOpen === dept.id && (
                              <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                background: '#fff',
                                borderRadius: '12px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                minWidth: '180px',
                                zIndex: 50,
                                overflow: 'hidden',
                              }}>
                                <button
                                  onClick={() => openEditModal(dept)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#2563eb',
                                    textAlign: 'left',
                                  }}
                                >
                                  <Edit style={{ width: '16px', height: '16px' }} /> Edit
                                </button>
                                <button
                                  onClick={() => openRequirementsModal(dept)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#7c3aed',
                                    textAlign: 'left',
                                  }}
                                >
                                  <Settings style={{ width: '16px', height: '16px' }} /> Set Requirements
                                </button>
                                <button
                                  onClick={() => openDeleteModal(dept)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#dc2626',
                                    textAlign: 'left',
                                  }}
                                >
                                  <Trash2 style={{ width: '16px', height: '16px' }} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {departments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                  No departments found. Create one to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {mounted && showCreateModal && createPortal(
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Create Department
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.label}>Department Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ name: e.target.value })}
                  placeholder="e.g., Engineering, Sales, Marketing"
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{ ...styles.button, backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#4b5563' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting || !createForm.name.trim()}
                  style={{
                    ...styles.button,
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    color: '#fff',
                    opacity: (submitting || !createForm.name.trim()) ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {mounted && showEditModal && selectedDept && createPortal(
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Edit Department
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.label}>Department Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{ ...styles.button, backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#4b5563' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={submitting || !editForm.name.trim()}
                  style={{
                    ...styles.button,
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    color: '#fff',
                    opacity: (submitting || !editForm.name.trim()) ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Set Requirements Modal */}
      {mounted && showRequirementsModal && selectedDept && createPortal(
        <div style={styles.modalOverlay} onClick={() => setShowRequirementsModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Set Staffing Requirements
              </h3>
              <button
                onClick={() => setShowRequirementsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
              </button>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#111827' }}>
                {selectedDept.name}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                Current employees: {getDeptStats(selectedDept.id)?.current || 0}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.label}>Minimum Required Employees</label>
                <input
                  type="number"
                  min="0"
                  value={requirementsForm.minimumRequired}
                  onChange={(e) => setRequirementsForm({ minimumRequired: parseInt(e.target.value) || 0 })}
                  style={styles.input}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Set to 0 to remove requirement
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
                <button
                  onClick={() => setShowRequirementsModal(false)}
                  style={{ ...styles.button, backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#4b5563' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetRequirements}
                  disabled={submitting}
                  style={{
                    ...styles.button,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                    color: '#fff',
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Saving...' : 'Set Requirements'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {mounted && showDeleteModal && selectedDept && createPortal(
        <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Trash2 style={{ width: '32px', height: '32px', color: '#dc2626' }} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                Delete Department?
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Are you sure you want to delete "{selectedDept.name}"?
                {getDeptStats(selectedDept.id)?.current > 0 && (
                  <span style={{ color: '#dc2626', display: 'block', marginTop: '8px' }}>
                    This department has {getDeptStats(selectedDept.id)?.current} employees assigned.
                  </span>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ ...styles.button, backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#4b5563' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                style={{
                  ...styles.button,
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Click outside handler */}
      {actionMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setActionMenuOpen(null)}
        />
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
