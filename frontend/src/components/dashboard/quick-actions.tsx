'use client';

import * as React from 'react';
import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  color?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function QuickActions({
  actions,
  title = 'Quick Actions',
  subtitle = 'Common tasks and shortcuts',
  columns = 4,
}: QuickActionsProps) {
  const [isMediumScreen, setIsMediumScreen] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMediumScreen(window.innerWidth >= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const gridColumns = isMediumScreen ? columns : 2;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '24px',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, color: '#111827' }}>{title}</h3>
        {subtitle && (
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', margin: '4px 0 0 0' }}>{subtitle}</p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: '16px',
        }}
      >
        {actions.map((action) => (
          <QuickActionCard key={action.href} action={action} />
        ))}
      </div>
    </div>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Link
      href={action.href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        borderRadius: '12px',
        border: isHovered ? '1px solid #c4b5fd' : '1px solid #e5e7eb',
        backgroundColor: isHovered ? '#f5f3ff' : '#ffffff',
        transition: 'all 0.2s',
        minHeight: '100px',
        textDecoration: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          height: '40px',
          width: '40px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          backgroundColor: isHovered ? '#7c3aed' : '#ede9fe',
          color: isHovered ? '#ffffff' : '#7c3aed',
          transition: 'all 0.2s',
        }}
      >
        <Icon style={{ height: '20px', width: '20px' }} />
      </div>
      <span style={{ fontSize: '14px', fontWeight: 500, textAlign: 'center', color: '#111827' }}>{action.label}</span>
      {action.description && (
        <span style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '4px' }}>
          {action.description}
        </span>
      )}
    </Link>
  );
}

// Compact version for smaller spaces
interface QuickActionButtonProps {
  action: QuickAction;
  className?: string;
}

export function QuickActionButton({ action }: QuickActionButtonProps) {
  const Icon = action.icon;
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Link
      href={action.href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        backgroundColor: isHovered ? '#f5f3ff' : '#ffffff',
        transition: 'all 0.2s',
        textDecoration: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Icon style={{ height: '16px', width: '16px', color: '#7c3aed' }} />
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{action.label}</span>
    </Link>
  );
}
