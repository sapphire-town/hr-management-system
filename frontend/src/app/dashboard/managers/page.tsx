'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Search,
  MoreVertical,
  Edit,
  Target,
  Trash2,
  Loader2,
  X,
  Check,
  UserCog,
  TrendingUp,
  Calendar,
  Plus,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { employeeAPI, targetAPI, roleAPI } from '@/lib/api-client';
import { format } from 'date-fns';

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  salary: number;
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  role?: {
    id: string;
    name: string;
  };
  subordinates?: any[];
}

interface TargetParam {
  name: string;
  value: number;
  unit?: string;
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
  select: {
    padding: '10px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
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
    maxWidth: '600px',
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
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function ManagersPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [managers, setManagers] = React.useState<Manager[]>([]);
  const [roles, setRoles] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showTargetModal, setShowTargetModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [selectedManager, setSelectedManager] = React.useState<Manager | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Edit form
  const [editForm, setEditForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    roleId: '',
    salary: '',
  });

  // Target form
  const [targetForm, setTargetForm] = React.useState({
    targetMonth: getCurrentMonth(),
    employeeIds: [] as string[],
    targetData: [{ name: '', value: 0, unit: '' }] as TargetParam[],
    notes: '',
  });

  const [teamMembers, setTeamMembers] = React.useState<any[]>([]);

  const isDirector = user?.role === 'DIRECTOR';
  const isHRHead = user?.role === 'HR_HEAD';
  const canManage = isDirector || isHRHead;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [managersRes, rolesRes] = await Promise.all([
        employeeAPI.getManagers(),
        roleAPI.getAll(),
      ]);
      setManagers(managersRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredManagers = managers.filter(m =>
    `${m.firstName} ${m.lastName} ${m.user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = {
    total: managers.length,
    active: managers.filter(m => m.user.isActive).length,
    directors: managers.filter(m => m.user.role === 'DIRECTOR').length,
    hrHeads: managers.filter(m => m.user.role === 'HR_HEAD').length,
    managers: managers.filter(m => m.user.role === 'MANAGER').length,
  };

  const openEditModal = (manager: Manager) => {
    setSelectedManager(manager);
    setEditForm({
      firstName: manager.firstName,
      lastName: manager.lastName,
      email: manager.user.email,
      roleId: manager.role?.id || '',
      salary: manager.salary.toString(),
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const openTargetModal = async (manager: Manager) => {
    setSelectedManager(manager);
    setTargetForm({
      targetMonth: getCurrentMonth(),
      employeeIds: [],
      targetData: [{ name: '', value: 0, unit: '' }],
      notes: '',
    });

    // Fetch team members
    try {
      const res = await employeeAPI.getAll({ managerId: manager.id });
      setTeamMembers(res.data || []);
    } catch (error) {
      console.error('Error fetching team:', error);
      setTeamMembers([]);
    }

    setShowTargetModal(true);
    setActionMenuOpen(null);
  };

  const openDeleteModal = (manager: Manager) => {
    setSelectedManager(manager);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const handleEditSubmit = async () => {
    if (!selectedManager) return;

    try {
      setSubmitting(true);
      await employeeAPI.update(selectedManager.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        roleId: editForm.roleId,
        salary: parseFloat(editForm.salary),
      });
      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTargetSubmit = async () => {
    if (!selectedManager || targetForm.employeeIds.length === 0) {
      alert('Please select at least one team member');
      return;
    }

    const validTargets = targetForm.targetData.filter(t => t.name && t.value > 0);
    if (validTargets.length === 0) {
      alert('Please add at least one valid target');
      return;
    }

    try {
      setSubmitting(true);
      await targetAPI.bulkCreate({
        employeeIds: targetForm.employeeIds,
        targetMonth: targetForm.targetMonth,
        targetData: validTargets,
        notes: targetForm.notes,
      });
      setShowTargetModal(false);
      alert('Targets set successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to set targets');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedManager) return;

    try {
      setSubmitting(true);
      await employeeAPI.delete(selectedManager.id);
      setShowDeleteModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to deactivate manager');
    } finally {
      setSubmitting(false);
    }
  };

  const addTargetParam = () => {
    setTargetForm({
      ...targetForm,
      targetData: [...targetForm.targetData, { name: '', value: 0, unit: '' }],
    });
  };

  const removeTargetParam = (index: number) => {
    setTargetForm({
      ...targetForm,
      targetData: targetForm.targetData.filter((_, i) => i !== index),
    });
  };

  const updateTargetParam = (index: number, field: keyof TargetParam, value: any) => {
    const newData = [...targetForm.targetData];
    newData[index] = { ...newData[index], [field]: value };
    setTargetForm({ ...targetForm, targetData: newData });
  };

  const toggleEmployeeSelection = (empId: string) => {
    if (targetForm.employeeIds.includes(empId)) {
      setTargetForm({
        ...targetForm,
        employeeIds: targetForm.employeeIds.filter(id => id !== empId),
      });
    } else {
      setTargetForm({
        ...targetForm,
        employeeIds: [...targetForm.employeeIds, empId],
      });
    }
  };

  const selectAllTeam = () => {
    if (targetForm.employeeIds.length === teamMembers.length) {
      setTargetForm({ ...targetForm, employeeIds: [] });
    } else {
      setTargetForm({ ...targetForm, employeeIds: teamMembers.map(m => m.id) });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      DIRECTOR: { bg: '#fef3c7', text: '#b45309' },
      HR_HEAD: { bg: '#dbeafe', text: '#1d4ed8' },
      MANAGER: { bg: '#dcfce7', text: '#15803d' },
    };
    const color = colors[role] || { bg: '#f3f4f6', text: '#374151' };
    return (
      <span style={{ ...styles.badge, backgroundColor: color.bg, color: color.text }}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  // Generate month options
  const monthOptions = React.useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -2; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value, label: format(date, 'MMMM yyyy') });
    }
    return options;
  }, []);

  if (!canManage) {
    return (
      <DashboardLayout title="Managers" description="Access Denied">
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
          You don't have permission to access this page.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Manager Management"
      description="Edit, set targets, and manage managers"
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#2563eb' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Total Managers</p>
                  <p style={styles.cardValue}>{stats.total}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#dbeafe' }}>
                  <Users style={{ width: '24px', height: '24px', color: '#2563eb' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Directors</p>
                  <p style={{ ...styles.cardValue, color: '#b45309' }}>{stats.directors}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#fef3c7' }}>
                  <UserCog style={{ width: '24px', height: '24px', color: '#b45309' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>HR Heads</p>
                  <p style={{ ...styles.cardValue, color: '#1d4ed8' }}>{stats.hrHeads}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#dbeafe' }}>
                  <UserCog style={{ width: '24px', height: '24px', color: '#1d4ed8' }} />
                </div>
              </div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <p style={styles.cardTitle}>Managers</p>
                  <p style={{ ...styles.cardValue, color: '#15803d' }}>{stats.managers}</p>
                </div>
                <div style={{ ...styles.iconContainer, backgroundColor: '#dcfce7' }}>
                  <UserCog style={{ width: '24px', height: '24px', color: '#15803d' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={styles.card}>
            <div style={{ position: 'relative', maxWidth: '400px' }}>
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
                placeholder="Search managers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...styles.input, paddingLeft: '40px' }}
              />
            </div>
          </div>

          {/* Managers Table */}
          <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>Managers</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Manage directors, HR heads, and managers</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Manager</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Department</th>
                    <th style={styles.th}>Team Size</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManagers.map((manager) => (
                    <tr key={manager.id} style={{ backgroundColor: '#ffffff' }}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={styles.avatar}>
                            {manager.firstName[0]}{manager.lastName[0]}
                          </div>
                          <div style={{ marginLeft: '12px' }}>
                            <p style={{ fontWeight: '500', color: '#111827', margin: 0 }}>
                              {manager.firstName} {manager.lastName}
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                              {manager.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        {getRoleBadge(manager.user.role)}
                      </td>
                      <td style={{ ...styles.td, color: '#4b5563' }}>
                        {manager.role?.name || 'N/A'}
                      </td>
                      <td style={{ ...styles.td, color: '#4b5563' }}>
                        {manager.subordinates?.length || 0} members
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: manager.user.isActive ? '#dcfce7' : '#fee2e2',
                          color: manager.user.isActive ? '#15803d' : '#b91c1c',
                        }}>
                          {manager.user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === manager.id ? null : manager.id)}
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
                          {actionMenuOpen === manager.id && (
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
                                onClick={() => openEditModal(manager)}
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
                                onClick={() => openTargetModal(manager)}
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
                                <Target style={{ width: '16px', height: '16px' }} /> Set Target
                              </button>
                              {manager.user.isActive && isDirector && (
                                <button
                                  onClick={() => openDeleteModal(manager)}
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
                                  <Trash2 style={{ width: '16px', height: '16px' }} /> Deactivate
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredManagers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                  No managers found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {mounted && showEditModal && selectedManager && createPortal(
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Edit Manager
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={styles.label}>First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  disabled
                  style={{ ...styles.input, backgroundColor: '#f9fafb', color: '#6b7280' }}
                />
              </div>

              <div>
                <label style={styles.label}>Department</label>
                <select
                  value={editForm.roleId}
                  onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                  style={{ ...styles.select, width: '100%' }}
                >
                  <option value="">Select Department</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Salary</label>
                <input
                  type="number"
                  value={editForm.salary}
                  onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
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
                  onClick={handleEditSubmit}
                  disabled={submitting}
                  style={{
                    ...styles.button,
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    color: '#fff',
                    opacity: submitting ? 0.5 : 1,
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

      {/* Target Modal */}
      {mounted && showTargetModal && selectedManager && createPortal(
        <div style={styles.modalOverlay} onClick={() => setShowTargetModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Set Targets for {selectedManager.firstName}'s Team
              </h3>
              <button
                onClick={() => setShowTargetModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Target Month */}
              <div>
                <label style={styles.label}>Target Month</label>
                <select
                  value={targetForm.targetMonth}
                  onChange={(e) => setTargetForm({ ...targetForm, targetMonth: e.target.value })}
                  style={{ ...styles.select, width: '100%' }}
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Team Members Selection */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={styles.label}>Select Team Members</label>
                  <button
                    onClick={selectAllTeam}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px' }}
                  >
                    {targetForm.employeeIds.length === teamMembers.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {teamMembers.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>No team members found</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflow: 'auto' }}>
                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => toggleEmployeeSelection(member.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          border: targetForm.employeeIds.includes(member.id) ? '2px solid #2563eb' : '1px solid #e5e7eb',
                          backgroundColor: targetForm.employeeIds.includes(member.id) ? '#eff6ff' : '#fff',
                          color: targetForm.employeeIds.includes(member.id) ? '#2563eb' : '#374151',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {targetForm.employeeIds.includes(member.id) && <Check style={{ width: '14px', height: '14px' }} />}
                        {member.firstName} {member.lastName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Target Parameters */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={styles.label}>Target Parameters</label>
                  <button
                    onClick={addTargetParam}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus style={{ width: '16px', height: '16px' }} /> Add Parameter
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {targetForm.targetData.map((param, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Parameter name (e.g., Sales, Calls)"
                        value={param.name}
                        onChange={(e) => updateTargetParam(index, 'name', e.target.value)}
                        style={{ ...styles.input, flex: 2 }}
                      />
                      <input
                        type="number"
                        placeholder="Target value"
                        value={param.value || ''}
                        onChange={(e) => updateTargetParam(index, 'value', parseFloat(e.target.value) || 0)}
                        style={{ ...styles.input, flex: 1 }}
                      />
                      <input
                        type="text"
                        placeholder="Unit (optional)"
                        value={param.unit || ''}
                        onChange={(e) => updateTargetParam(index, 'unit', e.target.value)}
                        style={{ ...styles.input, flex: 1 }}
                      />
                      {targetForm.targetData.length > 1 && (
                        <button
                          onClick={() => removeTargetParam(index)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <X style={{ width: '20px', height: '20px' }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={styles.label}>Notes (Optional)</label>
                <textarea
                  value={targetForm.notes}
                  onChange={(e) => setTargetForm({ ...targetForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes..."
                  style={{ ...styles.input, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
                <button
                  onClick={() => setShowTargetModal(false)}
                  style={{ ...styles.button, backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#4b5563' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTargetSubmit}
                  disabled={submitting || targetForm.employeeIds.length === 0}
                  style={{
                    ...styles.button,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                    color: '#fff',
                    opacity: (submitting || targetForm.employeeIds.length === 0) ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Setting Targets...' : 'Set Targets'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {mounted && showDeleteModal && selectedManager && createPortal(
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
                Deactivate Manager?
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Are you sure you want to deactivate {selectedManager.firstName} {selectedManager.lastName}?
                Their team members will need to be reassigned.
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
                {submitting ? 'Deactivating...' : 'Deactivate'}
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
