'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  UserCog,
  Users,
  Key,
  RefreshCw,
  Copy,
  Check,
  Award,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { employeeAPI, roleAPI } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  salary: number;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  joinDate: string;
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  role: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Role {
  id: string;
  name: string;
  minimumRequired?: number;
  currentCount?: number;
}

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  user: { role: string };
  role: { name: string };
}

const USER_ROLES = ['EMPLOYEE', 'MANAGER', 'HR_HEAD', 'DIRECTOR', 'INTERVIEWER'];

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [managers, setManagers] = React.useState<Manager[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterRole, setFilterRole] = React.useState<string>('');
  const [filterStatus, setFilterStatus] = React.useState<string>('');

  // Modal states
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showPromoteModal, setShowPromoteModal] = React.useState(false);
  const [showAssignManagerModal, setShowAssignManagerModal] = React.useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [credentials, setCredentials] = React.useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Form states
  const [formData, setFormData] = React.useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    roleId: '',
    salary: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    managerId: '',
    joinDate: new Date().toISOString().split('T')[0],
  });

  const [promoteData, setPromoteData] = React.useState({
    newUserRole: '',
    newRoleId: '',
    newSalary: '',
  });

  const isDirector = user?.role === 'DIRECTOR';
  const isHRHead = user?.role === 'HR_HEAD';
  const canManageEmployees = isDirector || isHRHead;

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [employeesRes, rolesRes] = await Promise.all([
        employeeAPI.getAll({ limit: 100 }),
        roleAPI.getAll(),
      ]);
      setEmployees(employeesRes.data.data || []);
      setRoles(rolesRes.data || []);

      if (canManageEmployees) {
        const managersRes = await employeeAPI.getManagers();
        setManagers(managersRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [canManageEmployees]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !searchQuery ||
        emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role?.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = !filterRole || emp.role?.id === filterRole;
      const matchesStatus =
        !filterStatus ||
        (filterStatus === 'active' && emp.user.isActive) ||
        (filterStatus === 'inactive' && !emp.user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, filterRole, filterStatus]);

  const resetFormData = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'EMPLOYEE',
      roleId: roles[0]?.id || '',
      salary: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      address: '',
      managerId: '',
      joinDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleAddEmployee = async () => {
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        salary: parseFloat(formData.salary) || 0,
        managerId: formData.managerId || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
      };
      const response = await employeeAPI.create(payload);
      setCredentials({
        email: formData.email,
        password: response.data.temporaryPassword,
      });
      setShowAddModal(false);
      setShowCredentialsModal(true);
      resetFormData();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      setSubmitting(true);
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        salary: parseFloat(formData.salary) || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        roleId: formData.roleId || undefined,
        managerId: formData.managerId || undefined,
      };
      await employeeAPI.update(selectedEmployee.id, payload);
      setShowEditModal(false);
      setSelectedEmployee(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedEmployee) return;
    try {
      setSubmitting(true);
      await employeeAPI.promote(selectedEmployee.id, {
        newUserRole: promoteData.newUserRole,
        newRoleId: promoteData.newRoleId,
        newSalary: promoteData.newSalary ? parseFloat(promoteData.newSalary) : undefined,
      });
      setShowPromoteModal(false);
      setSelectedEmployee(null);
      setPromoteData({ newUserRole: '', newRoleId: '', newSalary: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to promote employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignManager = async () => {
    if (!selectedEmployee || !formData.managerId) return;
    try {
      setSubmitting(true);
      await employeeAPI.assignManager(selectedEmployee.id, formData.managerId);
      setShowAssignManagerModal(false);
      setSelectedEmployee(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to assign manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      setSubmitting(true);
      await employeeAPI.delete(selectedEmployee.id);
      setShowDeleteConfirm(false);
      setSelectedEmployee(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to deactivate employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (emp: Employee) => {
    try {
      await employeeAPI.reactivate(emp.id);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reactivate employee');
    }
  };

  const handleResetPassword = async (emp: Employee) => {
    try {
      const response = await employeeAPI.resetPassword(emp.id);
      setCredentials({
        email: response.data.email,
        password: response.data.temporaryPassword,
      });
      setShowCredentialsModal(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      email: emp.user.email,
      firstName: emp.firstName,
      lastName: emp.lastName,
      role: emp.user.role,
      roleId: emp.role?.id || '',
      salary: emp.salary?.toString() || '',
      dateOfBirth: emp.dateOfBirth?.split('T')[0] || '',
      gender: emp.gender || '',
      phone: emp.phone || '',
      address: emp.address || '',
      managerId: emp.manager?.id || '',
      joinDate: emp.joinDate?.split('T')[0] || '',
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const openPromoteModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setPromoteData({
      newUserRole: emp.user.role,
      newRoleId: emp.role?.id || '',
      newSalary: emp.salary?.toString() || '',
    });
    setShowPromoteModal(true);
    setActionMenuOpen(null);
  };

  const openAssignManagerModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData((prev) => ({ ...prev, managerId: emp.manager?.id || '' }));
    setShowAssignManagerModal(true);
    setActionMenuOpen(null);
  };

  const openDeleteConfirm = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowDeleteConfirm(true);
    setActionMenuOpen(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'DIRECTOR':
        return { bg: '#7c3aed', text: '#fff' };
      case 'HR_HEAD':
        return { bg: '#0891b2', text: '#fff' };
      case 'MANAGER':
        return { bg: '#059669', text: '#fff' };
      case 'INTERVIEWER':
        return { bg: '#d97706', text: '#fff' };
      default:
        return { bg: '#6b7280', text: '#fff' };
    }
  };

  return (
    <DashboardLayout
      title="Employee Management"
      description="Manage your organization's employees, roles, and team structure"
      actions={
        canManageEmployees ? (
          <>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/roles')}
              style={{ marginRight: 8 }}
            >
              <Award style={{ width: 16, height: 16, marginRight: 8 }} />
              Manage Roles
            </Button>
            <Button onClick={() => { resetFormData(); setShowAddModal(true); }}>
              <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
              Add Employee
            </Button>
          </>
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            borderRadius: 16,
            padding: 20,
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Total Employees</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>{employees.length}</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            borderRadius: 16,
            padding: 20,
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Active</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
              {employees.filter((e) => e.user.isActive).length}
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            borderRadius: 16,
            padding: 20,
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Managers</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
              {employees.filter((e) => e.user.role === 'MANAGER').length}
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            borderRadius: 16,
            padding: 20,
            color: '#fff',
          }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Inactive</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
              {employees.filter((e) => !e.user.isActive).length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#fff',
          padding: 16,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 18,
              height: 18,
              color: '#9ca3af',
            }} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              background: '#fff',
              minWidth: 150,
            }}
          >
            <option value="">All Departments</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              background: '#fff',
              minWidth: 120,
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Employee Table */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              Loading employees...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              No employees found
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Employee
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Department
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Access Level
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Reports To
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  {canManageEmployees && (
                    <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#faf5ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        }}>
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b' }}>{emp.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#475569' }}>
                      {emp.role?.name || '-'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        background: getRoleBadgeColor(emp.user.role).bg,
                        color: getRoleBadgeColor(emp.user.role).text,
                      }}>
                        {emp.user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#475569' }}>
                      {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : '-'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        background: emp.user.isActive ? '#dcfce7' : '#fee2e2',
                        color: emp.user.isActive ? '#166534' : '#991b1b',
                      }}>
                        {emp.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManageEmployees && (
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === emp.id ? null : emp.id)}
                            style={{
                              padding: 8,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: 8,
                            }}
                          >
                            <MoreVertical style={{ width: 18, height: 18, color: '#6b7280' }} />
                          </button>
                          {actionMenuOpen === emp.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              background: '#fff',
                              borderRadius: 12,
                              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                              minWidth: 180,
                              zIndex: 50,
                              overflow: 'hidden',
                            }}>
                              <button
                                onClick={() => openEditModal(emp)}
                                style={{
                                  width: '100%',
                                  padding: '10px 16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  color: '#374151',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Edit style={{ width: 16, height: 16 }} /> Edit Details
                              </button>
                              {isDirector && (
                                <button
                                  onClick={() => openPromoteModal(emp)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    color: '#374151',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <UserCog style={{ width: 16, height: 16 }} /> Promote / Change Role
                                </button>
                              )}
                              <button
                                onClick={() => openAssignManagerModal(emp)}
                                style={{
                                  width: '100%',
                                  padding: '10px 16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  color: '#374151',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Users style={{ width: 16, height: 16 }} /> Assign Manager
                              </button>
                              <button
                                onClick={() => handleResetPassword(emp)}
                                style={{
                                  width: '100%',
                                  padding: '10px 16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  color: '#374151',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Key style={{ width: 16, height: 16 }} /> Reset Password
                              </button>
                              <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />
                              {emp.user.isActive ? (
                                <button
                                  onClick={() => openDeleteConfirm(emp)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    color: '#dc2626',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <Trash2 style={{ width: 16, height: 16 }} /> Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => { handleReactivate(emp); setActionMenuOpen(null); }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    color: '#059669',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ecfdf5')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <RefreshCw style={{ width: 16, height: 16 }} /> Reactivate
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent style={{ maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px 0' }}>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="employee@company.com"
              />
            </div>
            <div>
              <Label>Access Level *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>First Name *</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div>
              <Label>Department *</Label>
              <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salary *</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div>
              <Label>Join Date</Label>
              <Input
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Manager</Label>
              <Select value={formData.managerId} onValueChange={(v) => setFormData({ ...formData, managerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.user.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddEmployee} disabled={submitting || !formData.email || !formData.firstName || !formData.lastName || !formData.roleId}>
              {submitting ? 'Creating...' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent style={{ maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px 0' }}>
            <div>
              <Label>First Name</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salary</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateEmployee} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Modal */}
      <Dialog open={showPromoteModal} onOpenChange={setShowPromoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Employee</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            {selectedEmployee && (
              <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontWeight: 500 }}>
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Current: {selectedEmployee.user.role.replace('_', ' ')} - {selectedEmployee.role?.name}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Label>New Access Level</Label>
                <Select value={promoteData.newUserRole} onValueChange={(v) => setPromoteData({ ...promoteData, newUserRole: v })}>
                  <SelectTrigger><SelectValue placeholder="Select access level" /></SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>New Department/Role</Label>
                <Select value={promoteData.newRoleId} onValueChange={(v) => setPromoteData({ ...promoteData, newRoleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>New Salary (optional)</Label>
                <Input
                  type="number"
                  value={promoteData.newSalary}
                  onChange={(e) => setPromoteData({ ...promoteData, newSalary: e.target.value })}
                  placeholder="Leave empty to keep current salary"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteModal(false)}>Cancel</Button>
            <Button onClick={handlePromote} disabled={submitting || !promoteData.newUserRole || !promoteData.newRoleId}>
              {submitting ? 'Promoting...' : 'Promote Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Manager Modal */}
      <Dialog open={showAssignManagerModal} onOpenChange={setShowAssignManagerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Manager</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            {selectedEmployee && (
              <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontWeight: 500 }}>
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Current Manager: {selectedEmployee.manager ? `${selectedEmployee.manager.firstName} ${selectedEmployee.manager.lastName}` : 'None'}
                </div>
              </div>
            )}
            <div>
              <Label>Select Manager</Label>
              <Select value={formData.managerId} onValueChange={(v) => setFormData({ ...formData, managerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  {managers.filter((m) => m.id !== selectedEmployee?.id).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.user.role.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignManagerModal(false)}>Cancel</Button>
            <Button onClick={handleAssignManager} disabled={submitting || !formData.managerId}>
              {submitting ? 'Assigning...' : 'Assign Manager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee Credentials</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', marginBottom: 8 }}>
                <Check style={{ width: 18, height: 18 }} />
                <span style={{ fontWeight: 500 }}>Credentials Generated Successfully</span>
              </div>
              <p style={{ fontSize: 13, color: '#166534' }}>
                Please share these credentials securely with the employee.
              </p>
            </div>
            {credentials && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Label>Email</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Input value={credentials.email} readOnly />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(credentials.email, 'email')}
                    >
                      {copiedField === 'email' ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Temporary Password</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Input value={credentials.password} readOnly />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(credentials.password, 'password')}
                    >
                      {copiedField === 'password' ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowCredentialsModal(false); setCredentials(null); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Employee</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            <p>Are you sure you want to deactivate <strong>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</strong>?</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
              The employee will be deactivated and will no longer be able to log in. You can reactivate them later.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} disabled={submitting}>
              {submitting ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Click outside handler for action menu */}
      {actionMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </DashboardLayout>
  );
}