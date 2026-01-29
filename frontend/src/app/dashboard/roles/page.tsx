'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Target,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { roleAPI, employeeAPI } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Role {
  id: string;
  name: string;
  minimumRequired: number;
  createdAt: string;
  _count?: {
    employees: number;
  };
}

interface RoleStats {
  id: string;
  name: string;
  current: number;
  required: number;
  shortage: number;
  fulfillmentRate: number;
}

interface StatsSummary {
  totalEmployees: number;
  totalRequired: number;
  totalShortage: number;
  overallFulfillment: number;
}

export default function RolesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [stats, setStats] = React.useState<RoleStats[]>([]);
  const [summary, setSummary] = React.useState<StatsSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showRequirementModal, setShowRequirementModal] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: '',
    minimumRequired: '0',
  });

  const isDirector = user?.role === 'DIRECTOR';

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, statsRes] = await Promise.all([
        roleAPI.getAll(),
        roleAPI.getStatistics(),
      ]);
      setRoles(rolesRes.data || []);
      // Backend returns { roles: [...], summary: {...} }
      const statsData = statsRes.data;
      if (statsData && statsData.roles) {
        setStats(statsData.roles);
        setSummary(statsData.summary);
      } else {
        setStats([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({ name: '', minimumRequired: '0' });
  };

  const handleCreateRole = async () => {
    try {
      setSubmitting(true);
      await roleAPI.create({ name: formData.name });
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    try {
      setSubmitting(true);
      await roleAPI.update(selectedRole.id, { name: formData.name });
      setShowEditModal(false);
      setSelectedRole(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetRequirement = async () => {
    if (!selectedRole) return;
    try {
      setSubmitting(true);
      await roleAPI.setRequirements(selectedRole.id, parseInt(formData.minimumRequired) || 0);
      setShowRequirementModal(false);
      setSelectedRole(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update requirement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    try {
      setSubmitting(true);
      await roleAPI.delete(selectedRole.id);
      setShowDeleteConfirm(false);
      setSelectedRole(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete role');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({ name: role.name, minimumRequired: role.minimumRequired?.toString() || '0' });
    setShowEditModal(true);
  };

  const openRequirementModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({ name: role.name, minimumRequired: role.minimumRequired?.toString() || '0' });
    setShowRequirementModal(true);
  };

  const openDeleteConfirm = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteConfirm(true);
  };

  const getRoleStats = (roleId: string) => {
    return stats.find((s) => s.id === roleId);
  };

  // Use summary from backend, or calculate from stats array as fallback
  const totalEmployees = summary?.totalEmployees ?? stats.reduce((sum, s) => sum + s.current, 0);
  const totalRequired = summary?.totalRequired ?? stats.reduce((sum, s) => sum + s.required, 0);
  const totalDeficit = summary?.totalShortage ?? stats.reduce((sum, s) => sum + s.shortage, 0);

  return (
    <DashboardLayout
      title="Role Management"
      description="Manage organizational roles and staffing requirements"
      actions={
        isDirector ? (
          <>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/employees')}
              style={{ marginRight: 8 }}
            >
              <ArrowLeft style={{ width: 16, height: 16, marginRight: 8 }} />
              Back to Employees
            </Button>
            <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
              <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
              Create Role
            </Button>
          </>
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            borderRadius: 16,
            padding: 24,
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Users style={{ width: 24, height: 24 }} />
              </div>
              <div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>Total Roles</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{roles.length}</div>
              </div>
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: 16,
            padding: 24,
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Check style={{ width: 24, height: 24 }} />
              </div>
              <div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>Filled Positions</div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{totalEmployees} / {totalRequired || '-'}</div>
              </div>
            </div>
          </div>
          <div style={{
            background: totalDeficit > 0
              ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
              : 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            borderRadius: 16,
            padding: 24,
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {totalDeficit > 0 ? <AlertCircle style={{ width: 24, height: 24 }} /> : <Target style={{ width: 24, height: 24 }} />}
              </div>
              <div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>
                  {totalDeficit > 0 ? 'Hiring Deficit' : 'Staffing Status'}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>
                  {totalDeficit > 0 ? `-${totalDeficit}` : 'Optimal'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              All Roles & Staffing Requirements
            </h3>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              Loading roles...
            </div>
          ) : roles.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              No roles defined yet. Create your first role to get started.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Role Name
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current Employees
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Minimum Required
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  {isDirector && (
                    <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => {
                  const roleStat = getRoleStats(role.id);
                  const currentCount = roleStat?.current ?? role._count?.employees ?? 0;
                  const minRequired = roleStat?.required ?? role.minimumRequired ?? 0;
                  const shortage = roleStat?.shortage ?? (minRequired > 0 ? Math.max(0, minRequired - currentCount) : 0);
                  const isDeficit = shortage > 0;
                  const isSurplus = currentCount > minRequired && minRequired > 0;

                  return (
                    <tr
                      key={role.id}
                      style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#faf5ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: 14,
                          }}>
                            {role.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>{role.name}</div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#475569',
                        }}>
                          {currentCount}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          background: minRequired > 0 ? '#ede9fe' : '#f1f5f9',
                          color: minRequired > 0 ? '#7c3aed' : '#9ca3af',
                        }}>
                          {minRequired > 0 ? minRequired : 'Not Set'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        {minRequired === 0 ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            background: '#f1f5f9',
                            color: '#6b7280',
                          }}>
                            No Target
                          </span>
                        ) : isDeficit ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            background: '#fee2e2',
                            color: '#991b1b',
                          }}>
                            Need {shortage} more
                          </span>
                        ) : isSurplus ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            background: '#dbeafe',
                            color: '#1e40af',
                          }}>
                            +{currentCount - minRequired} surplus
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            background: '#dcfce7',
                            color: '#166534',
                          }}>
                            Optimal
                          </span>
                        )}
                      </td>
                      {isDirector && (
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => openEditModal(role)}
                              style={{
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                color: '#475569',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e2e8f0';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f1f5f9';
                              }}
                            >
                              <Edit style={{ width: 14, height: 14 }} /> Edit
                            </button>
                            <button
                              onClick={() => openRequirementModal(role)}
                              style={{
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#ede9fe',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                color: '#7c3aed',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ddd6fe';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ede9fe';
                              }}
                            >
                              <Target style={{ width: 14, height: 14 }} /> Set Target
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(role)}
                              style={{
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#fee2e2',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                color: '#dc2626',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fecaca';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fee2e2';
                              }}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Role Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <div>
              <Label>Role Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Software Engineer, HR Manager"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={submitting || !formData.name.trim()}>
              {submitting ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <div>
              <Label>Role Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateRole} disabled={submitting || !formData.name.trim()}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Requirement Modal */}
      <Dialog open={showRequirementModal} onOpenChange={setShowRequirementModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Staffing Requirement</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            {selectedRole && (
              <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontWeight: 500 }}>{selectedRole.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Set the minimum number of employees required for this role
                </div>
              </div>
            )}
            <div>
              <Label>Minimum Required Employees</Label>
              <Input
                type="number"
                min="0"
                value={formData.minimumRequired}
                onChange={(e) => setFormData({ ...formData, minimumRequired: e.target.value })}
                placeholder="0"
              />
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                Set to 0 to disable staffing targets for this role
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequirementModal(false)}>Cancel</Button>
            <Button onClick={handleSetRequirement} disabled={submitting}>
              {submitting ? 'Saving...' : 'Set Requirement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <p>Are you sure you want to delete <strong>{selectedRole?.name}</strong>?</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
              This action cannot be undone. Employees with this role will need to be reassigned.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}