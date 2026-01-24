'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: LucideIcon;
  iconColor?: string;
  loading?: boolean;
  className?: string;
}

export function StatsCard({
  title,
  value,
  trend,
  icon: Icon,
  loading = false,
}: StatsCardProps) {
  if (loading) {
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: '16px', width: '96px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '12px' }} />
            <div style={{ height: '32px', width: '80px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '12px' }} />
            <div style={{ height: '12px', width: '128px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
          </div>
          <div style={{ height: '48px', width: '48px', backgroundColor: '#e5e7eb', borderRadius: '12px', flexShrink: 0 }} />
        </div>
      </div>
    );
  }

  const isPositive = trend && trend.value >= 0;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        padding: '24px',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', margin: 0 }}>{title}</p>
          <p style={{ fontSize: '30px', fontWeight: 700, color: '#111827', margin: '8px 0 0 0' }}>{value}</p>
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
              {isPositive ? (
                <TrendingUp style={{ height: '16px', width: '16px', color: '#16a34a' }} />
              ) : (
                <TrendingDown style={{ height: '16px', width: '16px', color: '#dc2626' }} />
              )}
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isPositive ? '#16a34a' : '#dc2626',
                }}
              >
                {isPositive ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && (
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            style={{
              height: '48px',
              width: '48px',
              minWidth: '48px',
              flexShrink: 0,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
            }}
          >
            <Icon style={{ height: '24px', width: '24px' }} />
          </div>
        )}
      </div>
    </div>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  const [isMediumScreen, setIsMediumScreen] = React.useState(false);
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMediumScreen(window.innerWidth >= 768);
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  let gridColumns = 1;
  if (isLargeScreen && columns === 4) {
    gridColumns = 4;
  } else if (isMediumScreen) {
    gridColumns = Math.min(columns, 2);
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: '16px',
      }}
    >
      {children}
    </div>
  );
}
