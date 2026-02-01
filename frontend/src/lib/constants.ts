import {
  LayoutDashboard,
  Users,
  Building2,
  Award,
  FileText,
  UserPlus,
  Settings,
  Calendar,
  ClipboardCheck,
  DollarSign,
  Package,
  Receipt,
  UserMinus,
  Search,
  TrendingUp,
  Folder,
  MessageSquare,
  User,
  Video,
  ClipboardList,
  Briefcase,
  Ticket,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAVIGATION_CONFIG: Record<string, NavSection[]> = {
  DIRECTOR: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Employees', href: '/dashboard/employees', icon: Users },
        { label: 'Roles', href: '/dashboard/roles', icon: Briefcase },
        { label: 'Departments', href: '/dashboard/departments', icon: Building2 },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: "Director's List", href: '/dashboard/directors-list', icon: Award },
        { label: 'Reports', href: '/dashboard/reports', icon: FileText },
        { label: 'Hiring Requests', href: '/dashboard/hiring', icon: UserPlus },
        { label: 'Resignations', href: '/dashboard/resignation/manage', icon: UserMinus },
        { label: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
      ],
    },
    {
      title: 'Insights',
      items: [
        { label: 'Feedback Reports', href: '/dashboard/feedback/reports', icon: BarChart3 },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ],
  HR_HEAD: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Employees', href: '/dashboard/employees', icon: Users },
      ],
    },
    {
      title: 'HR Operations',
      items: [
        { label: 'Leave Management', href: '/dashboard/leaves', icon: Calendar },
        { label: 'Attendance', href: '/dashboard/attendance', icon: ClipboardCheck },
        { label: 'Documents', href: '/dashboard/documents', icon: FileText },
        { label: 'Payroll', href: '/dashboard/payroll', icon: DollarSign },
        { label: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
      ],
    },
    {
      title: 'Requests',
      items: [
        { label: 'Assets', href: '/dashboard/assets', icon: Package },
        { label: 'Reimbursements', href: '/dashboard/reimbursements', icon: Receipt },
        { label: 'Resignations', href: '/dashboard/resignation/manage', icon: UserMinus },
      ],
    },
    {
      title: 'Recruitment',
      items: [
        { label: 'Recruitment', href: '/dashboard/recruitment', icon: Search },
      ],
    },
    {
      title: 'Insights',
      items: [
        { label: 'Feedback Reports', href: '/dashboard/feedback/reports', icon: BarChart3 },
      ],
    },
  ],
  MANAGER: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'My Team', href: '/dashboard/team', icon: Users },
      ],
    },
    {
      title: 'Approvals',
      items: [
        { label: 'Leave Approvals', href: '/dashboard/leaves/approvals', icon: Calendar },
        { label: 'Daily Reports', href: '/dashboard/reports/daily', icon: FileText },
        { label: 'Resignations', href: '/dashboard/resignation/manage', icon: UserMinus },
      ],
    },
    {
      title: 'Monitoring',
      items: [
        { label: 'Attendance', href: '/dashboard/attendance', icon: ClipboardCheck },
        { label: 'Performance', href: '/dashboard/performance', icon: TrendingUp },
        { label: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
      ],
    },
  ],
  EMPLOYEE: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'My Work',
      items: [
        { label: 'My Attendance', href: '/dashboard/attendance', icon: ClipboardCheck },
        { label: 'Leave Management', href: '/dashboard/leaves', icon: Calendar },
        { label: 'Daily Reports', href: '/dashboard/reports/daily', icon: FileText },
      ],
    },
    {
      title: 'Documents & Pay',
      items: [
        { label: 'My Documents', href: '/dashboard/documents', icon: Folder },
        { label: 'Payslips', href: '/dashboard/payslips', icon: DollarSign },
      ],
    },
    {
      title: 'Requests',
      items: [
        { label: 'Asset Requests', href: '/dashboard/assets', icon: Package },
        { label: 'Reimbursements', href: '/dashboard/reimbursements', icon: Receipt },
        { label: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
        { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Profile', href: '/dashboard/profile', icon: User },
        { label: 'Resignation', href: '/dashboard/resignation', icon: UserMinus },
      ],
    },
  ],
  INTERVIEWER: [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Interviews',
      items: [
        { label: 'My Drives', href: '/dashboard/my-drives', icon: Building2 },
      ],
    },
    {
      title: 'My Work',
      items: [
        { label: 'My Attendance', href: '/dashboard/attendance', icon: ClipboardCheck },
        { label: 'Leave Management', href: '/dashboard/leaves', icon: Calendar },
        { label: 'Daily Reports', href: '/dashboard/reports/daily', icon: FileText },
      ],
    },
    {
      title: 'Documents & Pay',
      items: [
        { label: 'My Documents', href: '/dashboard/documents', icon: Folder },
        { label: 'Payslips', href: '/dashboard/payslips', icon: DollarSign },
      ],
    },
    {
      title: 'Requests',
      items: [
        { label: 'Asset Requests', href: '/dashboard/assets', icon: Package },
        { label: 'Reimbursements', href: '/dashboard/reimbursements', icon: Receipt },
        { label: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
        { label: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Profile', href: '/dashboard/profile', icon: User },
        { label: 'Resignation', href: '/dashboard/resignation', icon: UserMinus },
      ],
    },
  ],
};

export const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: 'Director',
  HR_HEAD: 'HR Head',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  INTERVIEWER: 'Interviewer',
};

export const STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  active: 'success',
  inactive: 'default',
  present: 'success',
  absent: 'destructive',
  half_day: 'warning',
  on_leave: 'primary',
} as const;
