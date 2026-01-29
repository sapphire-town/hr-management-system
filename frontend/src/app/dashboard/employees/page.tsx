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
  Eye,
  Hash,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { employeeAPI, roleAPI, settingsAPI } from '@/lib/api-client';
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
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [detailedEmployee, setDetailedEmployee] = React.useState<any>(null);
  const [credentials, setCredentials] = React.useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [searchById, setSearchById] = React.useState('');
  const [searchingById, setSearchingById] = React.useState(false);
  const [initializingLeave, setInitializingLeave] = React.useState(false);

  // Bulk import states
  const [showBulkImportModal, setShowBulkImportModal] = React.useState(false);
  const [bulkImportFile, setBulkImportFile] = React.useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = React.useState(false);
  const [bulkImportResults, setBulkImportResults] = React.useState<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{ email: string; status: 'success' | 'failed'; message?: string; temporaryPassword?: string }>;
  } | null>(null);

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
  employeeType: 'FULL_TIME', // ✅ ADDED
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

const resetFormData = React.useCallback(() => {
  setFormData({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    roleId: roles.length > 0 ? roles[0].id : '',
    salary: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    managerId: '',
    employeeType: 'FULL_TIME', // ✅ ADDED
    joinDate: new Date().toISOString().split('T')[0],
  });
}, [roles]);


  // Update roleId when roles are loaded and form is empty
  React.useEffect(() => {
    if (roles.length > 0 && !formData.roleId) {
      setFormData(prev => ({ ...prev, roleId: roles[0].id }));
    }
  }, [roles, formData.roleId]);

  const handleAddEmployee = async () => {
    // Validate roleId before submitting
    if (!formData.roleId) {
      alert('Please select a department/role');
      return;
    }
    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      alert('Please enter a valid salary');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      roleId: formData.roleId,
      salary: parseFloat(formData.salary),
      employeeType: formData.employeeType, // ✅ ADDED
      joinDate: formData.joinDate || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      managerId: formData.managerId || undefined,
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
      console.error('Create employee error:', error);
      const message = error.response?.data?.message;
      if (Array.isArray(message)) {
        alert('Validation errors:\n' + message.join('\n'));
      } else {
        alert(message || 'Failed to create employee');
      }
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

  // Search employee by ID
  const handleSearchById = async () => {
    if (!searchById.trim()) {
      alert('Please enter an Employee ID');
      return;
    }
    try {
      setSearchingById(true);
      const response = await employeeAPI.getById(searchById.trim());
      setDetailedEmployee(response.data);
      setShowDetailsModal(true);
      setSearchById('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Employee not found');
    } finally {
      setSearchingById(false);
    }
  };

  // View employee details
  const handleViewDetails = async (emp: Employee) => {
    try {
      const response = await employeeAPI.getById(emp.id);
      setDetailedEmployee(response.data);
      setShowDetailsModal(true);
      setActionMenuOpen(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to load employee details');
    }
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

  const handleInitializeLeaveBalances = async () => {
    if (!confirm('This will reset leave policies AND all employee leave balances to defaults (12 sick, 12 casual, 15 earned). Continue?')) {
      return;
    }
    setInitializingLeave(true);
    try {
      const res = await settingsAPI.resetLeaveSystem();
      alert(res.data.message || 'Leave system reset successfully');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reset leave system');
    } finally {
      setInitializingLeave(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await employeeAPI.downloadBulkImportTemplate();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employee_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Template download error:', error);
      // For blob responses, error data might be a blob, try to read it
      if (error.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorJson = JSON.parse(errorText);
          alert(errorJson.message || 'Failed to download template');
        } catch {
          alert('Failed to download template. Please ensure the backend server is running.');
        }
      } else {
        alert(error.response?.data?.message || error.message || 'Failed to download template. Please ensure the backend server is running.');
      }
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) return;

    setBulkImporting(true);
    setBulkImportResults(null);

    try {
      const response = await employeeAPI.bulkImport(bulkImportFile);
      setBulkImportResults(response.data);
      fetchData(); // Refresh the employee list
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to import employees');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
        alert('Please upload an Excel file (.xlsx)');
        return;
      }
      setBulkImportFile(file);
      setBulkImportResults(null);
    }
  };

  const closeBulkImportModal = () => {
    setShowBulkImportModal(false);
    setBulkImportFile(null);
    setBulkImportResults(null);
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
            <Button
              variant="outline"
              onClick={handleInitializeLeaveBalances}
              disabled={initializingLeave}
              style={{ marginRight: 8 }}
            >
              <RefreshCw style={{ width: 16, height: 16, marginRight: 8, animation: initializingLeave ? 'spin 1s linear infinite' : 'none' }} />
              {initializingLeave ? 'Resetting...' : 'Reset Leave System'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkImportModal(true)}
              style={{ marginRight: 8 }}
            >
              <Upload style={{ width: 16, height: 16, marginRight: 8 }} />
              Bulk Import
            </Button>
            <Button
              onClick={() => { resetFormData(); setShowAddModal(true); }}
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
                color: '#fff',
                boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.35)',
              }}
            >
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
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
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
          {/* Search by ID - Only for Director and HR Head */}
          {canManageEmployees && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <Hash style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: '#9ca3af',
                }} />
                <input
                  type="text"
                  placeholder="Search by ID..."
                  value={searchById}
                  onChange={(e) => setSearchById(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchById()}
                  style={{
                    width: 200,
                    padding: '10px 12px 10px 36px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              <Button
                onClick={handleSearchById}
                disabled={searchingById}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                  color: '#fff',
                }}
              >
                {searchingById ? 'Searching...' : 'Find'}
              </Button>
            </div>
          )}
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
                                onClick={() => handleViewDetails(emp)}
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
                                  color: '#7c3aed',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f3ff')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Eye style={{ width: 16, height: 16 }} /> View Details
                              </button>
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
              {roles.length > 0 ? (
                <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div style={{ padding: '8px', background: '#fef3cd', borderRadius: 4, fontSize: 13, color: '#856404' }}>
                  No departments available. Please create roles first in Role Management.
                </div>
              )}
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
              <Select value={formData.managerId || 'none'} onValueChange={(v) => setFormData({ ...formData, managerId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
              <Select value={formData.gender || 'unspecified'} onValueChange={(v) => setFormData({ ...formData, gender: v === 'unspecified' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Not specified</SelectItem>
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
            <Button
              onClick={handleAddEmployee}
              disabled={submitting || !formData.email || !formData.firstName || !formData.lastName || !formData.roleId || !formData.salary || roles.length === 0}
            >
              {submitting ? 'Creating...' : roles.length === 0 ? 'Loading...' : 'Create Employee'}
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
              {roles.length > 0 && formData.roleId ? (
                <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input disabled placeholder="Loading departments..." />
              )}
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
              <Select value={formData.gender || 'unspecified'} onValueChange={(v) => setFormData({ ...formData, gender: v === 'unspecified' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Not specified</SelectItem>
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
                {promoteData.newUserRole ? (
                  <Select value={promoteData.newUserRole} onValueChange={(v) => setPromoteData({ ...promoteData, newUserRole: v })}>
                    <SelectTrigger><SelectValue placeholder="Select access level" /></SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input disabled placeholder="Loading..." />
                )}
              </div>
              <div>
                <Label>New Department/Role</Label>
                {promoteData.newRoleId && roles.length > 0 ? (
                  <Select value={promoteData.newRoleId} onValueChange={(v) => setPromoteData({ ...promoteData, newRoleId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input disabled placeholder="Loading..." />
                )}
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
                <span style={{ fontWeight: 500 }}>Credentials Generated & Email Sent</span>
              </div>
              <p style={{ fontSize: 13, color: '#166534' }}>
                A welcome email with login credentials has been sent to the employee's email address.
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

      {/* View Employee Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent style={{ maxWidth: 700 }}>
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {detailedEmployee && (
            <div style={{ padding: '16px 0', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Header with Avatar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                borderRadius: 12,
                marginBottom: 20,
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 24,
                }}>
                  {detailedEmployee.firstName?.[0]}{detailedEmployee.lastName?.[0]}
                </div>
                <div style={{ color: '#fff' }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {detailedEmployee.firstName} {detailedEmployee.lastName}
                  </div>
                  <div style={{ opacity: 0.9 }}>{detailedEmployee.user?.email}</div>
                  <div style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '4px 12px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                  }}>
                    {detailedEmployee.user?.role?.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Employee ID */}
              <div style={{
                padding: 12,
                background: '#f8fafc',
                borderRadius: 8,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Employee ID</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>{detailedEmployee.id}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(detailedEmployee.id, 'empId')}
                >
                  {copiedField === 'empId' ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                </Button>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Department</div>
                  <div style={{ fontWeight: 500 }}>{detailedEmployee.role?.name || '-'}</div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Status</div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 500,
                    background: detailedEmployee.user?.isActive ? '#dcfce7' : '#fee2e2',
                    color: detailedEmployee.user?.isActive ? '#166534' : '#991b1b',
                  }}>
                    {detailedEmployee.user?.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Salary</div>
                  <div style={{ fontWeight: 500 }}>
                    {detailedEmployee.salary ? `₹${detailedEmployee.salary.toLocaleString()}` : '-'}
                  </div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Join Date</div>
                  <div style={{ fontWeight: 500 }}>
                    {detailedEmployee.joinDate ? new Date(detailedEmployee.joinDate).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Phone</div>
                  <div style={{ fontWeight: 500 }}>{detailedEmployee.phone || '-'}</div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Gender</div>
                  <div style={{ fontWeight: 500 }}>{detailedEmployee.gender || '-'}</div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Date of Birth</div>
                  <div style={{ fontWeight: 500 }}>
                    {detailedEmployee.dateOfBirth ? new Date(detailedEmployee.dateOfBirth).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Reports To</div>
                  <div style={{ fontWeight: 500 }}>
                    {detailedEmployee.manager ? `${detailedEmployee.manager.firstName} ${detailedEmployee.manager.lastName}` : '-'}
                  </div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Address</div>
                  <div style={{ fontWeight: 500 }}>{detailedEmployee.address || '-'}</div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Last Login</div>
                  <div style={{ fontWeight: 500 }}>
                    {detailedEmployee.user?.lastLogin ? new Date(detailedEmployee.user.lastLogin).toLocaleString() : 'Never'}
                  </div>
                </div>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Employee Type</div>
                  <div style={{ fontWeight: 500 }}>{detailedEmployee.employeeType?.replace('_', ' ') || 'Full Time'}</div>
                </div>
              </div>

              {/* Team Members (if manager) */}
              {detailedEmployee.subordinates && detailedEmployee.subordinates.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                    Team Members ({detailedEmployee.subordinates.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {detailedEmployee.subordinates.map((sub: any) => (
                      <div
                        key={sub.id}
                        style={{
                          padding: '8px 12px',
                          background: '#e0e7ff',
                          borderRadius: 8,
                          fontSize: 13,
                          color: '#4338ca',
                        }}
                      >
                        {sub.firstName} {sub.lastName} - {sub.role?.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
            {detailedEmployee && canManageEmployees && (
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  const emp = employees.find(e => e.id === detailedEmployee.id);
                  if (emp) openEditModal(emp);
                }}
              >
                Edit Employee
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkImportModal} onOpenChange={closeBulkImportModal}>
        <DialogContent style={{ maxWidth: 700 }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet style={{ width: 24, height: 24, color: '#7c3aed' }} />
              Bulk Import Employees
            </DialogTitle>
          </DialogHeader>
          <div style={{ padding: '16px 0' }}>
            {!bulkImportResults ? (
              <>
                {/* Instructions */}
                <div style={{
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 12,
                  marginBottom: 20,
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                    How to use bulk import:
                  </h4>
                  <ol style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: 13, lineHeight: 1.8 }}>
                    <li>Download the Excel template using the button below</li>
                    <li>Fill in employee details in the template (required: Email, First Name, Last Name, User Role, Role Name, Salary)</li>
                    <li>Upload the completed Excel file</li>
                    <li>Review and confirm the import</li>
                  </ol>
                </div>

                {/* Download Template */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  border: '1px dashed #d1d5db',
                  borderRadius: 12,
                  marginBottom: 20,
                }}>
                  <div>
                    <div style={{ fontWeight: 500, color: '#374151' }}>Download Template</div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Get the Excel template with all required columns
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                    <Download style={{ width: 16, height: 16, marginRight: 8 }} />
                    Download Template
                  </Button>
                </div>

                {/* File Upload */}
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: 12,
                  padding: 32,
                  textAlign: 'center',
                  background: bulkImportFile ? '#f0fdf4' : '#fafafa',
                  transition: 'all 0.2s',
                }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="bulk-import-file"
                  />
                  <label
                    htmlFor="bulk-import-file"
                    style={{ cursor: 'pointer', display: 'block' }}
                  >
                    {bulkImportFile ? (
                      <>
                        <CheckCircle style={{ width: 48, height: 48, color: '#16a34a', margin: '0 auto 12px' }} />
                        <div style={{ fontWeight: 500, color: '#16a34a', marginBottom: 4 }}>
                          {bulkImportFile.name}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          Click to select a different file
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload style={{ width: 48, height: 48, color: '#9ca3af', margin: '0 auto 12px' }} />
                        <div style={{ fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                          Click to upload Excel file
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          Supports .xlsx files only
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </>
            ) : (
              /* Import Results */
              <div>
                {/* Summary */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16,
                  marginBottom: 20,
                }}>
                  <div style={{
                    padding: 16,
                    background: '#f8fafc',
                    borderRadius: 12,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#374151' }}>
                      {bulkImportResults.total}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Total Records</div>
                  </div>
                  <div style={{
                    padding: 16,
                    background: '#f0fdf4',
                    borderRadius: 12,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
                      {bulkImportResults.successful}
                    </div>
                    <div style={{ fontSize: 13, color: '#16a34a' }}>Successful</div>
                  </div>
                  <div style={{
                    padding: 16,
                    background: bulkImportResults.failed > 0 ? '#fef2f2' : '#f8fafc',
                    borderRadius: 12,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: bulkImportResults.failed > 0 ? '#dc2626' : '#6b7280' }}>
                      {bulkImportResults.failed}
                    </div>
                    <div style={{ fontSize: 13, color: bulkImportResults.failed > 0 ? '#dc2626' : '#6b7280' }}>Failed</div>
                  </div>
                </div>

                {/* Results List */}
                <div style={{
                  maxHeight: 300,
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                }}>
                  {bulkImportResults.results.map((result, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: index < bulkImportResults.results.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: result.status === 'success' ? '#fafff9' : '#fffafa',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {result.status === 'success' ? (
                          <CheckCircle style={{ width: 20, height: 20, color: '#16a34a' }} />
                        ) : (
                          <XCircle style={{ width: 20, height: 20, color: '#dc2626' }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>
                            {result.email}
                          </div>
                          {result.status === 'failed' && result.message && (
                            <div style={{ fontSize: 12, color: '#dc2626' }}>
                              {result.message}
                            </div>
                          )}
                          {result.status === 'success' && result.temporaryPassword && (
                            <div style={{ fontSize: 12, color: '#16a34a' }}>
                              Password: {result.temporaryPassword}
                            </div>
                          )}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        background: result.status === 'success' ? '#dcfce7' : '#fee2e2',
                        color: result.status === 'success' ? '#166534' : '#991b1b',
                      }}>
                        {result.status === 'success' ? 'Created' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Note about emails */}
                {bulkImportResults.successful > 0 && (
                  <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#f0fdf4',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}>
                    <AlertCircle style={{ width: 18, height: 18, color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: '#166534' }}>
                      Welcome emails with login credentials have been sent to all successfully imported employees.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkImportModal}>
              {bulkImportResults ? 'Close' : 'Cancel'}
            </Button>
            {!bulkImportResults && (
              <Button
                onClick={handleBulkImport}
                disabled={!bulkImportFile || bulkImporting}
                style={{
                  background: bulkImportFile && !bulkImporting
                    ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
                    : undefined,
                  color: bulkImportFile && !bulkImporting ? '#fff' : undefined,
                }}
              >
                {bulkImporting ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, marginRight: 8, animation: 'spin 1s linear infinite' }} />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload style={{ width: 16, height: 16, marginRight: 8 }} />
                    Import Employees
                  </>
                )}
              </Button>
            )}
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