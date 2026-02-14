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
  Calendar,
  FileText,
  ClipboardList,
  CreditCard,
  Phone,
  Building2,
  Star,
  TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { employeeAPI, roleAPI, performanceAPI, documentAPI } from '@/lib/api-client';
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

const USER_ROLES = ['EMPLOYEE', 'MANAGER', 'HR_HEAD', 'DIRECTOR', 'INTERVIEWER', 'INTERN'];

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
  const [detailsTab, setDetailsTab] = React.useState<'overview' | 'attendance' | 'reports' | 'documents' | 'leave' | 'bank' | 'performance'>('overview');
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [detailedEmployee, setDetailedEmployee] = React.useState<any>(null);
  const [employeePerformance, setEmployeePerformance] = React.useState<any>(null);
  const [loadingPerformance, setLoadingPerformance] = React.useState(false);
  const [credentials, setCredentials] = React.useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [searchById, setSearchById] = React.useState('');
  const [searchingById, setSearchingById] = React.useState(false);


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

  // Document verification states
  const [showVerifyDocModal, setShowVerifyDocModal] = React.useState(false);
  const [selectedVerifyDoc, setSelectedVerifyDoc] = React.useState<any>(null);
  const [verifyDocData, setVerifyDocData] = React.useState({ status: 'VERIFIED' as 'VERIFIED' | 'REJECTED', rejectionReason: '' });
  const [verifyingDoc, setVerifyingDoc] = React.useState(false);

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
  employeeType: 'FULL_TIME',
  internType: '',
  contractEndDate: '',
  internshipDuration: '',
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

  // Fetch performance data when performance tab is selected
  React.useEffect(() => {
    const fetchPerformance = async () => {
      if (detailsTab === 'performance' && detailedEmployee && canManageEmployees) {
        try {
          setLoadingPerformance(true);
          const [perfRes, historyRes] = await Promise.all([
            performanceAPI.getEmployeePerformance(detailedEmployee.id),
            performanceAPI.getEmployeeHistory(detailedEmployee.id, 6),
          ]);
          setEmployeePerformance({
            ...perfRes.data,
            history: historyRes.data,
          });
        } catch (error) {
          console.error('Error fetching performance:', error);
          setEmployeePerformance(null);
        } finally {
          setLoadingPerformance(false);
        }
      }
    };
    fetchPerformance();
  }, [detailsTab, detailedEmployee, canManageEmployees]);

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
    employeeType: 'FULL_TIME',
    internType: '',
    contractEndDate: '',
    internshipDuration: '',
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
      alert('Please select a role');
      return;
    }
    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      alert('Please enter a valid salary');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      roleId: formData.roleId,
      salary: parseFloat(formData.salary),
      employeeType: formData.employeeType,
      joinDate: formData.joinDate || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      managerId: formData.managerId || undefined,
    };

    // Add intern-specific fields if employee type is INTERN
    if (formData.employeeType === 'INTERN') {
      payload.internType = formData.internType || undefined;
      payload.contractEndDate = formData.contractEndDate || undefined;
      payload.internshipDuration = formData.internshipDuration || undefined;
    }

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
        ...(promoteData.newRoleId && { newRoleId: promoteData.newRoleId }),
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

  // Document verification handlers
  const handleViewVerificationDoc = async (docId: string) => {
    try {
      const response = await documentAPI.viewVerificationDocument(docId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      alert('Failed to view document');
    }
  };

  const openVerifyDocModal = (doc: any) => {
    setSelectedVerifyDoc(doc);
    setVerifyDocData({ status: 'VERIFIED', rejectionReason: '' });
    setShowVerifyDocModal(true);
  };

  const handleVerifyDocument = async () => {
    if (!selectedVerifyDoc) return;
    try {
      setVerifyingDoc(true);
      if (verifyDocData.status === 'VERIFIED') {
        await documentAPI.verify(selectedVerifyDoc.id);
      } else {
        await documentAPI.reject(selectedVerifyDoc.id, verifyDocData.rejectionReason);
      }
      // Refresh employee details to get updated verification status
      if (detailedEmployee) {
        const response = await employeeAPI.getComprehensive(detailedEmployee.id);
        setDetailedEmployee(response.data);
      }
      setShowVerifyDocModal(false);
      setSelectedVerifyDoc(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to verify document');
    } finally {
      setVerifyingDoc(false);
    }
  };

  // Search employee by ID
  const handleSearchById = async () => {
    if (!searchById.trim()) {
      alert('Please enter an Employee ID');
      return;
    }
    try {
      setSearchingById(true);
      // Use comprehensive endpoint for Director/HR to get full details
      const response = canManageEmployees
        ? await employeeAPI.getComprehensive(searchById.trim())
        : await employeeAPI.getById(searchById.trim());
      setDetailedEmployee(response.data);
      setDetailsTab('overview');
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
      // Use comprehensive endpoint for Director/HR to get full details
      const response = canManageEmployees
        ? await employeeAPI.getComprehensive(emp.id)
        : await employeeAPI.getById(emp.id);
      setDetailedEmployee(response.data);
      setDetailsTab('overview');
      setShowDetailsModal(true);
      setActionMenuOpen(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to load employee details');
    }
  };

  const openEditModal = (emp: Employee & { employeeType?: string; internType?: string; contractEndDate?: string; internshipDuration?: string }) => {
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
      employeeType: emp.employeeType || 'FULL_TIME',
      internType: emp.internType || '',
      contractEndDate: emp.contractEndDate?.split('T')[0] || '',
      internshipDuration: emp.internshipDuration || '',
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
                              {canManageEmployees && (
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
              <Label>Role *</Label>
              {roles.length > 0 ? (
                <Select value={formData.roleId} onValueChange={(v) => setFormData({ ...formData, roleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div style={{ padding: '8px', background: '#fef3cd', borderRadius: 4, fontSize: 13, color: '#856404' }}>
                  No roles available. Please create roles first in Role Management.
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
              <Label>Employee Type *</Label>
              <Select value={formData.employeeType} onValueChange={(v) => setFormData({ ...formData, employeeType: v, internType: '', contractEndDate: '', internshipDuration: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="INTERN">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.employeeType === 'INTERN' && (
              <>
                <div>
                  <Label>Intern Type</Label>
                  <Select value={formData.internType || 'none'} onValueChange={(v) => setFormData({ ...formData, internType: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select intern type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="SUMMER">Summer Intern</SelectItem>
                      <SelectItem value="WINTER">Winter Intern</SelectItem>
                      <SelectItem value="CUSTOM">Custom Duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contract End Date</Label>
                  <Input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
                    min={formData.joinDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <Label>Internship Duration</Label>
                  <Select value={formData.internshipDuration || 'none'} onValueChange={(v) => setFormData({ ...formData, internshipDuration: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="1 month">1 Month</SelectItem>
                      <SelectItem value="2 months">2 Months</SelectItem>
                      <SelectItem value="3 months">3 Months</SelectItem>
                      <SelectItem value="4 months">4 Months</SelectItem>
                      <SelectItem value="6 months">6 Months</SelectItem>
                      <SelectItem value="12 months">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
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
                  <Select value={promoteData.newUserRole} onValueChange={(v) => {
                    // Auto-match designation role based on access level name
                    const roleName = v.charAt(0) + v.slice(1).toLowerCase().replace('_', ' ');
                    const matchedRole = roles.find(r => r.name.toLowerCase().includes(roleName.toLowerCase()));
                    setPromoteData({
                      ...promoteData,
                      newUserRole: v,
                      newRoleId: matchedRole ? matchedRole.id : promoteData.newRoleId,
                    });
                  }}>
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
            <Button onClick={handlePromote} disabled={submitting || !promoteData.newUserRole}>
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
        <DialogContent style={{ maxWidth: 900, maxHeight: '90vh' }}>
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {detailedEmployee && (
            <div style={{ padding: '16px 0' }}>
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
                <div style={{ color: '#fff', flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {detailedEmployee.firstName} {detailedEmployee.lastName}
                  </div>
                  <div style={{ opacity: 0.9 }}>{detailedEmployee.user?.email}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <span style={{
                      padding: '4px 12px',
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                    }}>
                      {detailedEmployee.user?.role?.replace('_', ' ')}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      background: detailedEmployee.user?.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                    }}>
                      {detailedEmployee.user?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {/* Recognition Stats for Director/HR */}
                {canManageEmployees && detailedEmployee.recognitionStats && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{detailedEmployee.recognitionStats.directorsListCount}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>Director's List</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{detailedEmployee.recognitionStats.rewardsCount}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>Rewards</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs for Director/HR */}
              {canManageEmployees && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                  {[
                    { id: 'overview', label: 'Overview', icon: Eye },
                    { id: 'performance', label: 'Performance', icon: TrendingUp },
                    { id: 'attendance', label: 'Attendance', icon: Calendar },
                    { id: 'reports', label: 'Reports', icon: ClipboardList },
                    { id: 'leave', label: 'Leave', icon: Calendar },
                    { id: 'documents', label: 'Documents', icon: FileText },
                    { id: 'bank', label: 'Bank & Emergency', icon: CreditCard },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailsTab(tab.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        background: detailsTab === tab.id ? '#7c3aed' : 'transparent',
                        color: detailsTab === tab.id ? '#fff' : '#64748b',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'all 0.15s',
                      }}
                    >
                      <tab.icon style={{ width: 14, height: 14 }} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {/* Overview Tab */}
                {detailsTab === 'overview' && (
                  <>
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
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Employee Type</div>
                        <div style={{ fontWeight: 500 }}>{detailedEmployee.employeeType?.replace('_', ' ') || 'Full Time'}</div>
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
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Account Created</div>
                        <div style={{ fontWeight: 500 }}>
                          {detailedEmployee.user?.createdAt ? new Date(detailedEmployee.user.createdAt).toLocaleDateString() : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Leave Balances for Director/HR */}
                    {canManageEmployees && detailedEmployee.leaveBalances && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>Leave Balances</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                          <div style={{ padding: 12, background: '#dcfce7', borderRadius: 8, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{detailedEmployee.leaveBalances.sick}</div>
                            <div style={{ fontSize: 12, color: '#166534' }}>Sick Leave</div>
                          </div>
                          <div style={{ padding: 12, background: '#dbeafe', borderRadius: 8, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>{detailedEmployee.leaveBalances.casual}</div>
                            <div style={{ fontSize: 12, color: '#1e40af' }}>Casual Leave</div>
                          </div>
                          <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#92400e' }}>{detailedEmployee.leaveBalances.earned}</div>
                            <div style={{ fontSize: 12, color: '#92400e' }}>Earned Leave</div>
                          </div>
                        </div>
                      </div>
                    )}

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
                                background: sub.user?.isActive ? '#e0e7ff' : '#fee2e2',
                                borderRadius: 8,
                                fontSize: 13,
                                color: sub.user?.isActive ? '#4338ca' : '#991b1b',
                              }}
                            >
                              {sub.firstName} {sub.lastName} - {sub.role?.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Attendance Tab */}
                {detailsTab === 'attendance' && canManageEmployees && (
                  <>
                    {/* Attendance Summary */}
                    {detailedEmployee.attendanceSummary && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                        <div style={{ padding: 16, background: '#dcfce7', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#166534' }}>{detailedEmployee.attendanceSummary.present}</div>
                          <div style={{ fontSize: 12, color: '#166534' }}>Present</div>
                        </div>
                        <div style={{ padding: 16, background: '#fee2e2', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#991b1b' }}>{detailedEmployee.attendanceSummary.absent}</div>
                          <div style={{ fontSize: 12, color: '#991b1b' }}>Absent</div>
                        </div>
                        <div style={{ padding: 16, background: '#fef3c7', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>{detailedEmployee.attendanceSummary.halfDay}</div>
                          <div style={{ fontSize: 12, color: '#92400e' }}>Half Day</div>
                        </div>
                        <div style={{ padding: 16, background: '#dbeafe', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>{detailedEmployee.attendanceSummary.paidLeave}</div>
                          <div style={{ fontSize: 12, color: '#1e40af' }}>Paid Leave</div>
                        </div>
                      </div>
                    )}

                    {/* Attendance List */}
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>Recent Attendance (Last 30 Days)</div>
                    {detailedEmployee.recentAttendance?.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Check In</th>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Check Out</th>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedEmployee.recentAttendance.map((att: any) => (
                            <tr key={att.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: 10 }}>{new Date(att.date).toLocaleDateString()}</td>
                              <td style={{ padding: 10 }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background: att.status === 'PRESENT' ? '#dcfce7' : att.status === 'ABSENT' ? '#fee2e2' : '#fef3c7',
                                  color: att.status === 'PRESENT' ? '#166534' : att.status === 'ABSENT' ? '#991b1b' : '#92400e',
                                }}>
                                  {att.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ padding: 10 }}>{att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : '-'}</td>
                              <td style={{ padding: 10 }}>{att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString() : '-'}</td>
                              <td style={{ padding: 10 }}>{att.workingHours ? `${att.workingHours.toFixed(1)}h` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No attendance records found</div>
                    )}
                  </>
                )}

                {/* Reports Tab */}
                {detailsTab === 'reports' && canManageEmployees && (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>Recent Daily Reports (Last 30 Days)</div>
                    {detailedEmployee.recentDailyReports?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {detailedEmployee.recentDailyReports.map((report: any) => (
                          <div key={report.id} style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <div style={{ fontWeight: 600 }}>{new Date(report.reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                background: report.isVerified ? '#dcfce7' : '#fef3c7',
                                color: report.isVerified ? '#166534' : '#92400e',
                              }}>
                                {report.isVerified ? 'Verified' : 'Pending'}
                              </span>
                            </div>
                            {report.reportData && typeof report.reportData === 'object' && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {Object.entries(report.reportData).slice(0, 6).map(([key, val]: [string, any]) => (
                                  <div key={key} style={{ padding: 8, background: '#fff', borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                                    <div style={{ fontWeight: 600 }}>{typeof val === 'object' ? val?.value || '-' : val}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {report.managerComment && (
                              <div style={{ marginTop: 12, padding: 10, background: '#e0e7ff', borderRadius: 6 }}>
                                <div style={{ fontSize: 11, color: '#4338ca', marginBottom: 4 }}>Manager Comment</div>
                                <div style={{ fontSize: 13 }}>{report.managerComment}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No daily reports found</div>
                    )}
                  </>
                )}

                {/* Leave Tab */}
                {detailsTab === 'leave' && canManageEmployees && (
                  <>
                    {/* Leave Summary */}
                    {detailedEmployee.leaveSummary && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                        <div style={{ padding: 16, background: '#dcfce7', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#166534' }}>{detailedEmployee.leaveSummary.approved}</div>
                          <div style={{ fontSize: 12, color: '#166534' }}>Approved</div>
                        </div>
                        <div style={{ padding: 16, background: '#fef3c7', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#92400e' }}>{detailedEmployee.leaveSummary.pending}</div>
                          <div style={{ fontSize: 12, color: '#92400e' }}>Pending</div>
                        </div>
                        <div style={{ padding: 16, background: '#fee2e2', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#991b1b' }}>{detailedEmployee.leaveSummary.rejected}</div>
                          <div style={{ fontSize: 12, color: '#991b1b' }}>Rejected</div>
                        </div>
                        <div style={{ padding: 16, background: '#dbeafe', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>{detailedEmployee.leaveSummary.totalDays}</div>
                          <div style={{ fontSize: 12, color: '#1e40af' }}>Days Taken</div>
                        </div>
                      </div>
                    )}

                    {/* Leave List */}
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>Leave Requests (This Year)</div>
                    {detailedEmployee.leaves?.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>From</th>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>To</th>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Days</th>
                            <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedEmployee.leaves.map((leave: any) => (
                            <tr key={leave.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: 10 }}>{leave.leaveType}</td>
                              <td style={{ padding: 10 }}>{new Date(leave.startDate).toLocaleDateString()}</td>
                              <td style={{ padding: 10 }}>{new Date(leave.endDate).toLocaleDateString()}</td>
                              <td style={{ padding: 10 }}>{leave.numberOfDays}</td>
                              <td style={{ padding: 10 }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  background: leave.status === 'APPROVED' ? '#dcfce7' : leave.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                                  color: leave.status === 'APPROVED' ? '#166534' : leave.status === 'REJECTED' ? '#991b1b' : '#92400e',
                                }}>
                                  {leave.status.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No leave requests found</div>
                    )}
                  </>
                )}

                {/* Documents Tab */}
                {detailsTab === 'documents' && canManageEmployees && (
                  <>
                    {/* Verification Status Summary */}
                    {detailedEmployee.documentVerifications?.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                        <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>
                            {detailedEmployee.documentVerifications.filter((d: any) => d.status === 'VERIFIED').length}
                          </div>
                          <div style={{ fontSize: 11, color: '#166534' }}>Verified</div>
                        </div>
                        <div style={{ padding: 16, background: '#fef3c7', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#92400e' }}>
                            {detailedEmployee.documentVerifications.filter((d: any) => d.status === 'UPLOADED' || d.status === 'UNDER_REVIEW').length}
                          </div>
                          <div style={{ fontSize: 11, color: '#92400e' }}>Pending</div>
                        </div>
                        <div style={{ padding: 16, background: '#fee2e2', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#991b1b' }}>
                            {detailedEmployee.documentVerifications.filter((d: any) => d.status === 'REJECTED').length}
                          </div>
                          <div style={{ fontSize: 11, color: '#991b1b' }}>Rejected</div>
                        </div>
                        <div style={{ padding: 16, background: '#dbeafe', borderRadius: 12, textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>
                            {detailedEmployee.documentVerifications.length}
                          </div>
                          <div style={{ fontSize: 11, color: '#1e40af' }}>Total</div>
                        </div>
                      </div>
                    )}

                    {/* Background Verification Documents */}
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle style={{ width: 16, height: 16 }} /> Background Verification Documents
                    </div>
                    {detailedEmployee.documentVerifications?.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
                        {detailedEmployee.documentVerifications.map((doc: any) => (
                          <div key={doc.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: 14,
                            background: doc.status === 'VERIFIED' ? '#f0fdf4' : doc.status === 'REJECTED' ? '#fef2f2' : '#fffbeb',
                            borderRadius: 10,
                            border: `1px solid ${doc.status === 'VERIFIED' ? '#bbf7d0' : doc.status === 'REJECTED' ? '#fecaca' : '#fde68a'}`,
                          }}>
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              background: doc.status === 'VERIFIED' ? '#dcfce7' : doc.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {doc.status === 'VERIFIED' ? (
                                <CheckCircle style={{ width: 20, height: 20, color: '#16a34a' }} />
                              ) : doc.status === 'REJECTED' ? (
                                <XCircle style={{ width: 20, height: 20, color: '#dc2626' }} />
                              ) : (
                                <AlertCircle style={{ width: 20, height: 20, color: '#d97706' }} />
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                                {doc.documentType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{doc.fileName}</div>
                              {doc.status === 'REJECTED' && doc.rejectionReason && (
                                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                                  Reason: {doc.rejectionReason}
                                </div>
                              )}
                              {doc.verifiedAt && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                  {doc.status === 'VERIFIED' ? 'Verified' : 'Reviewed'} on {new Date(doc.verifiedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                onClick={() => handleViewVerificationDoc(doc.id)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  border: '1px solid #e5e7eb',
                                  background: '#fff',
                                  color: '#374151',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Eye style={{ width: 14, height: 14 }} /> View
                              </button>
                              {(doc.status === 'UPLOADED' || doc.status === 'UNDER_REVIEW') && (
                                <button
                                  onClick={() => openVerifyDocModal(doc)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#7c3aed',
                                    color: '#fff',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Check style={{ width: 14, height: 14 }} /> Review
                                </button>
                              )}
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                background: doc.status === 'VERIFIED' ? '#dcfce7' : doc.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                                color: doc.status === 'VERIFIED' ? '#166534' : doc.status === 'REJECTED' ? '#991b1b' : '#92400e',
                              }}>
                                {doc.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af', background: '#f8fafc', borderRadius: 10, marginBottom: 24 }}>
                        <AlertCircle style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.5 }} />
                        <p style={{ margin: 0 }}>No documents uploaded for verification</p>
                      </div>
                    )}

                    {/* Released Documents */}
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText style={{ width: 16, height: 16 }} /> Released Documents
                    </div>
                    {detailedEmployee.documents?.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {detailedEmployee.documents.map((doc: any) => (
                          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                            <FileText style={{ width: 20, height: 20, color: '#7c3aed' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500 }}>{doc.documentType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{doc.fileName}</div>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              {doc.releasedAt ? new Date(doc.releasedAt).toLocaleDateString() : 'Not released'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No documents released</div>
                    )}
                  </>
                )}

                {/* Bank & Emergency Tab */}
                {detailsTab === 'bank' && canManageEmployees && (
                  <>
                    {/* Bank Details */}
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CreditCard style={{ width: 16, height: 16 }} /> Bank Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Account Holder</div>
                        <div style={{ fontWeight: 500 }}>{detailedEmployee.bankDetails?.accountHolder || '-'}</div>
                      </div>
                      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Account Number</div>
                        <div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{detailedEmployee.bankDetails?.accountNumber || '-'}</div>
                      </div>
                      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>IFSC Code</div>
                        <div style={{ fontWeight: 500, fontFamily: 'monospace' }}>{detailedEmployee.bankDetails?.ifsc || '-'}</div>
                      </div>
                      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Bank Name</div>
                        <div style={{ fontWeight: 500 }}>{detailedEmployee.bankDetails?.bankName || '-'}</div>
                      </div>
                      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, gridColumn: 'span 2' }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Branch</div>
                        <div style={{ fontWeight: 500 }}>{detailedEmployee.bankDetails?.branch || '-'}</div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Phone style={{ width: 16, height: 16 }} /> Emergency Contact
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>Contact Name</div>
                        <div style={{ fontWeight: 500 }}>{detailedEmployee.emergencyContact?.name || '-'}</div>
                      </div>
                      <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>Relationship</div>
                        <div style={{ fontWeight: 500 }}>{detailedEmployee.emergencyContact?.relation || '-'}</div>
                      </div>
                      <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>Phone</div>
                        <div style={{ fontWeight: 500 }}>{detailedEmployee.emergencyContact?.phone || '-'}</div>
                      </div>
                      <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>Email</div>
                        <div style={{ fontWeight: 500 }}>{detailedEmployee.emergencyContact?.email || '-'}</div>
                      </div>
                    </div>

                    {/* Rewards & Recognition */}
                    {detailedEmployee.rewards?.length > 0 && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 24, marginBottom: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Star style={{ width: 16, height: 16 }} /> Rewards & Recognition
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {detailedEmployee.rewards.map((reward: any) => (
                            <div key={reward.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#faf5ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
                              <Award style={{ width: 20, height: 20, color: '#7c3aed' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{reward.badgeName || reward.reason}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(reward.awardDate).toLocaleDateString()}</div>
                              </div>
                              {reward.amount && (
                                <div style={{ fontWeight: 600, color: '#059669' }}>₹{reward.amount.toLocaleString()}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Performance Tab */}
                {detailsTab === 'performance' && canManageEmployees && (
                  <>
                    {loadingPerformance ? (
                      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading performance data...</div>
                    ) : employeePerformance ? (
                      <>
                        {/* Performance Score Overview */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                          <div style={{
                            padding: 20,
                            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                            borderRadius: 16,
                            color: '#fff',
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: 32, fontWeight: 700 }}>{employeePerformance.overallScore || 0}%</div>
                            <div style={{ fontSize: 12, opacity: 0.9 }}>Overall Score</div>
                          </div>
                          <div style={{ padding: 16, background: '#dcfce7', borderRadius: 12, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{employeePerformance.attendanceScore || 0}%</div>
                            <div style={{ fontSize: 11, color: '#166534' }}>Attendance</div>
                          </div>
                          <div style={{ padding: 16, background: '#dbeafe', borderRadius: 12, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>{employeePerformance.leaveScore || 0}%</div>
                            <div style={{ fontSize: 11, color: '#1e40af' }}>Leave Score</div>
                          </div>
                          <div style={{ padding: 16, background: '#fef3c7', borderRadius: 12, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#92400e' }}>{employeePerformance.taskCompletionScore || 0}%</div>
                            <div style={{ fontSize: 11, color: '#92400e' }}>Task Completion</div>
                          </div>
                        </div>

                        {/* Attendance Stats */}
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>Attendance Breakdown</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                          <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 600, color: '#166534' }}>{employeePerformance.daysPresent || 0}</div>
                            <div style={{ fontSize: 11, color: '#166534' }}>Days Present</div>
                          </div>
                          <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 600, color: '#991b1b' }}>{employeePerformance.daysAbsent || 0}</div>
                            <div style={{ fontSize: 11, color: '#991b1b' }}>Days Absent</div>
                          </div>
                          <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 600, color: '#92400e' }}>{employeePerformance.halfDays || 0}</div>
                            <div style={{ fontSize: 11, color: '#92400e' }}>Half Days</div>
                          </div>
                          <div style={{ padding: 12, background: '#ede9fe', borderRadius: 8, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 600, color: '#7c3aed' }}>{employeePerformance.leaveDays || 0}</div>
                            <div style={{ fontSize: 11, color: '#7c3aed' }}>Leave Days</div>
                          </div>
                        </div>

                        {/* Performance Trend */}
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TrendingUp style={{ width: 16, height: 16 }} /> Performance Trend
                          {employeePerformance.trend && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 500,
                              background: employeePerformance.trend === 'up' ? '#dcfce7' : employeePerformance.trend === 'down' ? '#fee2e2' : '#f3f4f6',
                              color: employeePerformance.trend === 'up' ? '#166534' : employeePerformance.trend === 'down' ? '#991b1b' : '#6b7280',
                            }}>
                              {employeePerformance.trend === 'up' ? '↑ Improving' : employeePerformance.trend === 'down' ? '↓ Declining' : '→ Stable'}
                            </span>
                          )}
                        </div>

                        {/* Performance History */}
                        {employeePerformance.history && employeePerformance.history.length > 0 && (
                          <div style={{ marginBottom: 20 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                  <th style={{ padding: 10, textAlign: 'left', fontWeight: 600 }}>Month</th>
                                  <th style={{ padding: 10, textAlign: 'center', fontWeight: 600 }}>Score</th>
                                  <th style={{ padding: 10, textAlign: 'center', fontWeight: 600 }}>Attendance Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employeePerformance.history.map((item: any, idx: number) => (
                                  <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: 10 }}>{new Date(item.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                                    <td style={{ padding: 10, textAlign: 'center' }}>
                                      <span style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background: item.score >= 80 ? '#dcfce7' : item.score >= 60 ? '#fef3c7' : '#fee2e2',
                                        color: item.score >= 80 ? '#166534' : item.score >= 60 ? '#92400e' : '#991b1b',
                                      }}>
                                        {item.score}%
                                      </span>
                                    </td>
                                    <td style={{ padding: 10, textAlign: 'center' }}>{item.attendanceRate}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Working Days Info */}
                        <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 12, color: '#0369a1', marginBottom: 4 }}>Total Working Days (This Period)</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#0369a1' }}>{employeePerformance.totalWorkingDays || 0}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: '#0369a1', marginBottom: 4 }}>Previous Score</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#0369a1' }}>{employeePerformance.previousScore || 0}%</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                        <TrendingUp style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.5 }} />
                        <p style={{ margin: 0 }}>No performance data available</p>
                        <p style={{ margin: '8px 0 0 0', fontSize: 13 }}>Performance metrics will appear once attendance and reports are recorded.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
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

      {/* Document Verification Modal */}
      <Dialog open={showVerifyDocModal} onOpenChange={setShowVerifyDocModal}>
        <DialogContent style={{ maxWidth: 500 }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle style={{ width: 24, height: 24, color: '#7c3aed' }} />
              Review Document
            </DialogTitle>
          </DialogHeader>
          {selectedVerifyDoc && (
            <div style={{ padding: '16px 0' }}>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, marginBottom: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
                  {selectedVerifyDoc.documentType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>{selectedVerifyDoc.fileName}</p>
                <button
                  onClick={() => handleViewVerificationDoc(selectedVerifyDoc.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #7c3aed',
                    backgroundColor: '#f5f3ff',
                    color: '#7c3aed',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginTop: 12,
                  }}
                >
                  <Eye style={{ height: 14, width: 14 }} />
                  View Document
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Label style={{ display: 'block', marginBottom: 8 }}>Decision</Label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setVerifyDocData({ ...verifyDocData, status: 'VERIFIED' })}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 10,
                      border: verifyDocData.status === 'VERIFIED' ? '2px solid #22c55e' : '1px solid #e5e7eb',
                      backgroundColor: verifyDocData.status === 'VERIFIED' ? '#f0fdf4' : '#fff',
                      color: verifyDocData.status === 'VERIFIED' ? '#22c55e' : '#6b7280',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle style={{ height: 18, width: 18 }} />
                    Verify
                  </button>
                  <button
                    onClick={() => setVerifyDocData({ ...verifyDocData, status: 'REJECTED' })}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 10,
                      border: verifyDocData.status === 'REJECTED' ? '2px solid #ef4444' : '1px solid #e5e7eb',
                      backgroundColor: verifyDocData.status === 'REJECTED' ? '#fef2f2' : '#fff',
                      color: verifyDocData.status === 'REJECTED' ? '#ef4444' : '#6b7280',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <XCircle style={{ height: 18, width: 18 }} />
                    Reject
                  </button>
                </div>
              </div>

              {verifyDocData.status === 'REJECTED' && (
                <div style={{ marginBottom: 16 }}>
                  <Label style={{ display: 'block', marginBottom: 8 }}>Rejection Reason *</Label>
                  <textarea
                    value={verifyDocData.rejectionReason}
                    onChange={(e) => setVerifyDocData({ ...verifyDocData, rejectionReason: e.target.value })}
                    placeholder="Please provide a reason for rejection..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDocModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyDocument}
              disabled={verifyingDoc || (verifyDocData.status === 'REJECTED' && !verifyDocData.rejectionReason)}
              style={{
                background: verifyDocData.status === 'VERIFIED' ? '#22c55e' : '#ef4444',
              }}
            >
              {verifyingDoc ? 'Processing...' : verifyDocData.status === 'VERIFIED' ? 'Verify Document' : 'Reject Document'}
            </Button>
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