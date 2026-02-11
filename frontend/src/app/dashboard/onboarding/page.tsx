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
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { useAuthStore } from '@/store/auth-store';
import { employeeAPI, notificationAPI } from '@/lib/api-client';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';

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

const REQUIRED_DOCUMENTS = [
  { key: 'offer_letter', label: 'Offer Letter' },
  { key: 'employment_contract', label: 'Employment Contract' },
  { key: 'company_policy', label: 'Company Policy Document' },
  { key: 'id_card_form', label: 'ID Card Request Form' },
  { key: 'it_equipment_form', label: 'IT Equipment Allocation Form' },
];

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

  const isHR = user?.role === 'HR_HEAD' || user?.role === 'DIRECTOR';

  const fetchData = React.useCallback(async () => {
    if (!isHR) return;

    try {
      setLoading(true);

      // Fetch notifications for new employee onboarding
      const notificationsRes = await notificationAPI.getMy();
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

      // Fetch recent employees (joined in last 30 days)
      const employeesRes = await employeeAPI.getAll({ limit: '100' });
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recent = (employeesRes.data?.data || [])
        .filter((emp: RecentEmployee) => new Date(emp.joinDate) >= thirtyDaysAgo)
        .sort((a: RecentEmployee, b: RecentEmployee) =>
          new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
        );

      setRecentEmployees(recent);

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
    </DashboardLayout>
  );
}
