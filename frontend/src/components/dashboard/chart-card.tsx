'use client';

import * as React from 'react';
import { Download, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  onExport?: (format: 'png' | 'pdf') => void;
  actions?: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  loading = false,
  onExport,
  actions,
}: ChartCardProps) {
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ height: '20px', width: '128px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '8px' }} />
            <div style={{ height: '12px', width: '192px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
          </div>
        </div>
        <div style={{ height: '256px', width: '100%', backgroundColor: '#f3f4f6', borderRadius: '8px' }} />
      </div>
    );
  }

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, color: '#111827' }}>{title}</h3>
          {subtitle && (
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', margin: '4px 0 0 0' }}>{subtitle}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {actions}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '32px',
                    width: '32px',
                    borderRadius: '8px',
                    color: '#6b7280',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <MoreHorizontal style={{ height: '16px', width: '16px' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport('png')}>
                  <Download style={{ marginRight: '8px', height: '16px', width: '16px' }} />
                  Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('pdf')}>
                  <Download style={{ marginRight: '8px', height: '16px', width: '16px' }} />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div style={{ height: '256px' }}>{children}</div>
    </div>
  );
}
