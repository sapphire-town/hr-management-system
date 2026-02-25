'use client';

import { useAuthStore } from '@/store/auth-store';
import { DashboardLayout } from '@/components/layout';
import {
  DirectorDashboard,
  HRDashboard,
  ManagerDashboard,
  EmployeeDashboard,
} from '@/components/dashboards';
import { ROLE_LABELS } from '@/lib/constants';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.employee
    ? user.employee.firstName
    : user?.email?.split('@')[0] || 'User';

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : '';

  const renderDashboard = () => {
    switch (user?.role) {
      case 'DIRECTOR':
        return <DirectorDashboard />;
      case 'HR_HEAD':
        return <HRDashboard />;
      case 'MANAGER':
        return <ManagerDashboard />;
      case 'EMPLOYEE':
      case 'INTERN':
        return <EmployeeDashboard />;
      case 'INTERVIEWER':
        return <EmployeeDashboard />;
      default:
        return <EmployeeDashboard />;
    }
  };

  return (
    <DashboardLayout
      title={`${getGreeting()}, ${userName}`}
      description={`Welcome to your ${roleLabel} dashboard`}
    >
      {renderDashboard()}
    </DashboardLayout>
  );
}
