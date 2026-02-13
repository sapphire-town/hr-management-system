'use client';

import * as React from 'react';
import {
  UserCheck,
  FileText,
  Mail,
  Calendar,
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  TrendingUp,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  XCircle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { employeeAPI, roleAPI, notificationAPI } from '@/lib/api-client';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';

interface OnboardingNotification {
  id: string;
  subject: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    employeeId?: string;
    employeeName?: string;
    employeeEmail?: string;
    roleName?: string;
    joinDate?: string;
    documentsRequired?: string[];
  };
}

interface NewEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  joinDate: string;
  documentsRequired: string[];
  notificationId: string;
  isRead: boolean;
  createdAt: string;
}

interface RecentEmployee {
  id: string;
  firstName: string;
  lastName: string;
  joinDate: string;
  role?: { name: string };
  user?: { email: string };
}

interface Role {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  user: { role: string };
  role: { name: string };
}

const REQUIRED_DOCUMENTS = [
  { key: 'offer_letter', label: 'Offer Letter' },
  { key: 'employment_contract', label: 'Employment Contract' },
  { key: 'company_policy', label: 'Company Policy Document' },
  { key: 'id_card_form', label: 'ID Card Request Form' },
  { key: 'it_equipment_form', label: 'IT Equipment Allocation Form' },
];

const USER_ROLES = ['EMPLOYEE', 'MANAGER', 'HR_HEAD', 'DIRECTOR', 'INTERVIEWER', 'INTERN'];

export default function OnboardingPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [newEmployees, setNewEmployees] = React.useState<NewEmployee[]>([]);
  const [recentEmployees, setRecentEmployees] = React.useState<RecentEmployee[]>([]);
  const [expandedEmployee, setExpandedEmployee] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({
    pendingOnboarding: 0,
    completedThisMonth: 0,
    newJoinersThisMonth: 0,
  });

  // Roles & managers for add employee
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [managers, setManagers] = React.useState<Manager[]>([]);

  // Add Employee modal states
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = React.useState(false);
  const [credentials, setCredentials] = React.useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
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

  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

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

  const fetchData = React.useCallback(async () => {
    if (!isHR) return;

    try {
      setLoading(true);

      // Fetch notifications, employees, roles, managers in parallel
      const [notificationsRes, employeesRes, rolesRes, managersRes] = await Promise.all([
        notificationAPI.getMy(),
        employeeAPI.getAll({ limit: '100' }),
        roleAPI.getAll(),
        employeeAPI.getManagers(),
      ]);

      // Process onboarding notifications
      const onboardingNotifications = (notificationsRes.data || [])
        .filter((n: OnboardingNotification) => n.type === 'NEW_EMPLOYEE_ONBOARDING')
        .map((n: OnboardingNotification) => ({
          id: n.metadata?.employeeId || n.id,
          firstName: n.metadata?.employeeName?.split(' ')[0] || 'Unknown',
          lastName: n.metadata?.employeeName?.split(' ').slice(1).join(' ') || '',
          email: n.metadata?.employeeEmail || '',
          roleName: n.metadata?.roleName || 'Unknown',
          joinDate: n.metadata?.joinDate || n.createdAt,
          documentsRequired: n.metadata?.documentsRequired || REQUIRED_DOCUMENTS.map(d => d.label),
          notificationId: n.id,
          isRead: n.isRead,
          createdAt: n.createdAt,
        }));

      setNewEmployees(onboardingNotifications);

      // Recent employees (joined in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recent = (employeesRes.data?.data || [])
        .filter((emp: RecentEmployee) => new Date(emp.joinDate) >= thirtyDaysAgo)
        .sort((a: RecentEmployee, b: RecentEmployee) =>
          new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
        );

      setRecentEmployees(recent);
      setRoles(rolesRes.data || []);
      setManagers(managersRes.data || []);

      // Calculate stats
      const pendingCount = onboardingNotifications.filter((n: NewEmployee) => !n.isRead).length;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const newThisMonth = recent.filter((emp: RecentEmployee) =>
        new Date(emp.joinDate) >= thisMonth
      ).length;

      setStats({
        pendingOnboarding: pendingCount,
        completedThisMonth: onboardingNotifications.filter((n: NewEmployee) => n.isRead).length,
        newJoinersThisMonth: newThisMonth,
      });
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
    } finally {
      setLoading(false);
    }
  }, [isHR]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update roleId when roles are loaded
  React.useEffect(() => {
    if (roles.length > 0 && !formData.roleId) {
      setFormData(prev => ({ ...prev, roleId: roles[0].id }));
    }
  }, [roles, formData.roleId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNewEmployees(prev =>
        prev.map(emp =>
          emp.notificationId === notificationId
            ? { ...emp, isRead: true }
            : emp
        )
      );
      setStats(prev => ({
        ...prev,
        pendingOnboarding: prev.pendingOnboarding - 1,
        completedThisMonth: prev.completedThisMonth + 1,
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const goToReleaseDocument = (employeeId: string) => {
    router.push(`/dashboard/documents?release=true&employeeId=${employeeId}`);
  };

  const handleAddEmployee = async () => {
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
      if (error.response?.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorJson = JSON.parse(errorText);
          alert(errorJson.message || 'Failed to download template');
        } catch {
          alert('Failed to download template. Please ensure the backend server is running.');
        }
      } else {
        alert(error.response?.data?.message || error.message || 'Failed to download template.');
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
      fetchData();
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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  if (!isHR) {
    return (
      <DashboardLayout title="Onboarding" description="New employee onboarding management">
        <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
          <AlertCircle style={{ height: '48px', width: '48px', color: '#ef4444', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
            Access Denied
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            This page is only accessible to HR personnel.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Onboarding" description="New employee onboarding management">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  const getDaysAgo = (date: string) => {
    const days = differenceInDays(new Date(), parseISO(date));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <DashboardLayout
      title="Employee Onboarding"
      description="Manage onboarding documents for new employees"
      actions={
        <>
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
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            {
              label: 'Pending Onboarding',
              value: stats.pendingOnboarding,
              icon: <Clock />,
              color: '#f59e0b',
              bgColor: '#fffbeb',
            },
            {
              label: 'Completed This Month',
              value: stats.completedThisMonth,
              icon: <CheckCircle />,
              color: '#22c55e',
              bgColor: '#f0fdf4',
            },
            {
              label: 'New Joiners (30 days)',
              value: recentEmployees.length,
              icon: <Users />,
              color: '#3b82f6',
              bgColor: '#eff6ff',
            },
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
                  backgroundColor: stat.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                }}
              >
                {React.cloneElement(stat.icon as React.ReactElement, {
                  style: { height: '24px', width: '24px' },
                })}
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

        {/* Pending Onboarding Section */}
        <div style={cardStyle}>
          <div
            style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle style={{ height: '20px', width: '20px', color: '#f59e0b' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  Pending Onboarding Tasks
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  New employees requiring document release
                </p>
              </div>
            </div>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: stats.pendingOnboarding > 0 ? '#fef3c7' : '#f0fdf4',
                color: stats.pendingOnboarding > 0 ? '#92400e' : '#166534',
              }}
            >
              {stats.pendingOnboarding} pending
            </span>
          </div>

          <div style={{ padding: '0' }}>
            {newEmployees.filter(emp => !emp.isRead).length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <CheckCircle
                  style={{ height: '48px', width: '48px', color: '#22c55e', margin: '0 auto 16px' }}
                />
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
                  All Caught Up!
                </h4>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  No pending onboarding tasks at the moment.
                </p>
              </div>
            ) : (
              newEmployees
                .filter(emp => !emp.isRead)
                .map((employee, index) => (
                  <div
                    key={employee.notificationId}
                    style={{
                      borderBottom:
                        index < newEmployees.filter(e => !e.isRead).length - 1
                          ? '1px solid #f3f4f6'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor:
                          expandedEmployee === employee.notificationId ? '#f9fafb' : 'transparent',
                      }}
                      onClick={() =>
                        setExpandedEmployee(
                          expandedEmployee === employee.notificationId
                            ? null
                            : employee.notificationId
                        )
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '16px',
                          }}
                        >
                          {employee.firstName[0]}
                          {employee.lastName[0]}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                            {employee.firstName} {employee.lastName}
                          </h4>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              marginTop: '4px',
                            }}
                          >
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                color: '#6b7280',
                              }}
                            >
                              <Briefcase style={{ height: '12px', width: '12px' }} />
                              {employee.roleName}
                            </span>
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                color: '#6b7280',
                              }}
                            >
                              <Calendar style={{ height: '12px', width: '12px' }} />
                              Joined {getDaysAgo(employee.joinDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                          }}
                        >
                          {employee.documentsRequired.length} docs required
                        </span>
                        {expandedEmployee === employee.notificationId ? (
                          <ChevronUp style={{ height: '20px', width: '20px', color: '#6b7280' }} />
                        ) : (
                          <ChevronDown style={{ height: '20px', width: '20px', color: '#6b7280' }} />
                        )}
                      </div>
                    </div>

                    {expandedEmployee === employee.notificationId && (
                      <div
                        style={{
                          padding: '0 20px 20px 84px',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        <div style={{ marginBottom: '16px' }}>
                          <p
                            style={{
                              fontSize: '13px',
                              color: '#6b7280',
                              margin: '0 0 8px 0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Mail style={{ height: '14px', width: '14px' }} />
                            {employee.email}
                          </p>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <h5
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#374151',
                              margin: '0 0 8px 0',
                            }}
                          >
                            Documents to Release:
                          </h5>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {employee.documentsRequired.map((doc) => (
                              <span
                                key={doc}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e5e7eb',
                                  color: '#374151',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <FileText style={{ height: '12px', width: '12px' }} />
                                {doc}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              goToReleaseDocument(employee.id);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                              color: '#ffffff',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Send style={{ height: '14px', width: '14px' }} />
                            Release Documents
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(employee.notificationId);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              fontSize: '13px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            <CheckCircle style={{ height: '14px', width: '14px' }} />
                            Mark Complete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Recent Joiners */}
        <div style={cardStyle}>
          <div
            style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users style={{ height: '20px', width: '20px', color: '#3b82f6' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                Recent Joiners (Last 30 Days)
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                All employees who joined recently
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {recentEmployees.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Users style={{ height: '48px', width: '48px', color: '#9ca3af', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  No new employees in the last 30 days.
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {['Employee', 'Role', 'Email', 'Join Date', 'Actions'].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.map((employee, idx) => (
                    <tr
                      key={employee.id}
                      style={{
                        borderBottom:
                          idx < recentEmployees.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          {employee.firstName[0]}
                          {employee.lastName[0]}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                          {employee.firstName} {employee.lastName}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                        {employee.role?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                        {employee.user?.email || 'N/A'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            color: '#374151',
                          }}
                        >
                          {format(parseISO(employee.joinDate), 'MMM d, yyyy')}
                        </span>
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            color: '#9ca3af',
                          }}
                        >
                          ({getDaysAgo(employee.joinDate)})
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => goToReleaseDocument(employee.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            color: '#374151',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          <FileText style={{ height: '12px', width: '12px' }} />
                          Release Docs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Completed Onboarding */}
        {newEmployees.filter(emp => emp.isRead).length > 0 && (
          <div style={cardStyle}>
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle style={{ height: '20px', width: '20px', color: '#22c55e' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  Completed Onboarding
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  Recently completed onboarding tasks
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {newEmployees
                  .filter(emp => emp.isRead)
                  .slice(0, 10)
                  .map(employee => (
                    <div
                      key={employee.notificationId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <CheckCircle style={{ height: '14px', width: '14px', color: '#22c55e' }} />
                      <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>
                        {employee.firstName} {employee.lastName}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                        ({employee.roleName})
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
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
                    id="onboarding-bulk-import-file"
                  />
                  <label
                    htmlFor="onboarding-bulk-import-file"
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
    </DashboardLayout>
  );
}
