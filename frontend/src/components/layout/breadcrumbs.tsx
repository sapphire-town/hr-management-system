'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  leaves: 'Leave Management',
  attendance: 'Attendance',
  documents: 'Documents',
  payroll: 'Payroll',
  assets: 'Assets',
  reimbursements: 'Reimbursements',
  resignations: 'Resignations',
  recruitment: 'Recruitment',
  team: 'My Team',
  reports: 'Reports',
  daily: 'Daily Reports',
  approvals: 'Approvals',
  performance: 'Performance',
  settings: 'Settings',
  profile: 'Profile',
  departments: 'Departments',
  'directors-list': "Director's List",
  hiring: 'Hiring Requests',
  payslips: 'Payslips',
  feedback: 'Feedback',
  interviews: 'Interviews',
  drives: 'Placement Drives',
  evaluations: 'Evaluations',
};

function BreadcrumbLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Link
      href={href}
      style={{
        color: isHovered ? '#111827' : '#6b7280',
        textDecoration: 'none',
        transition: 'color 0.2s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </Link>
  );
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname();

  const breadcrumbs = React.useMemo(() => {
    if (items) return items;

    const segments = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [];

    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      crumbs.push({ label, href: index < segments.length - 1 ? href : undefined });
    });

    return crumbs;
  }, [pathname, items]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: '14px',
        marginBottom: '16px',
      }}
      aria-label="Breadcrumb"
    >
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        <li>
          <BreadcrumbLink href="/dashboard">
            <Home style={{ height: '16px', width: '16px' }} />
          </BreadcrumbLink>
        </li>
        {breadcrumbs.slice(1).map((crumb) => (
          <React.Fragment key={crumb.label}>
            <li>
              <ChevronRight style={{ height: '16px', width: '16px', color: '#9ca3af' }} />
            </li>
            <li>
              {crumb.href ? (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              ) : (
                <span style={{ color: '#111827', fontWeight: 500 }}>{crumb.label}</span>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}
