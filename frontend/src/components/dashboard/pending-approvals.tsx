'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export interface ApprovalItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  count: number;
  href: string;
  icon: LucideIcon;
  urgent?: boolean;
}

interface PendingApprovalsProps {
  items: ApprovalItem[];
  loading?: boolean;
  title?: string;
  className?: string;
}

export function PendingApprovals({
  items,
  loading = false,
  title = 'Pending Approvals',
}: PendingApprovalsProps) {
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '16px', margin: 0, color: '#111827' }}>{title}</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', margin: '4px 0 0 0' }}>
            {totalCount} items need your attention
          </p>
        </div>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: totalCount > 0 ? '#fef3c7' : '#f3f4f6',
            color: totalCount > 0 ? '#92400e' : '#6b7280',
          }}
        >
          {totalCount}
        </span>
      </div>

      <div>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none',
              }}
            >
              <div style={{ height: '40px', width: '40px', backgroundColor: '#e5e7eb', borderRadius: '8px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '16px', width: '128px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ height: '12px', width: '96px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
              </div>
              <div style={{ height: '24px', width: '32px', backgroundColor: '#e5e7eb', borderRadius: '9999px' }} />
            </div>
          ))
        ) : items.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
            No pending approvals
          </div>
        ) : (
          items.map((item, index) => (
            <ApprovalRow key={item.id} item={item} isLast={index === items.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}

function ApprovalRow({ item, isLast }: { item: ApprovalItem; isLast: boolean }) {
  const Icon = item.icon;
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Link
      href={item.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        textDecoration: 'none',
        backgroundColor: isHovered ? '#f5f3ff' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          height: '40px',
          width: '40px',
          minWidth: '40px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: item.urgent ? '#fef2f2' : '#ede9fe',
          color: item.urgent ? '#dc2626' : '#7c3aed',
        }}
      >
        <Icon style={{ height: '20px', width: '20px' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 500, margin: 0, color: '#111827' }}>{item.title}</p>
        {item.subtitle && (
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>{item.subtitle}</p>
        )}
      </div>
      <span
        style={{
          padding: '2px 10px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: item.count > 5 ? '#fef2f2' : item.count > 0 ? '#fef3c7' : '#f3f4f6',
          color: item.count > 5 ? '#dc2626' : item.count > 0 ? '#92400e' : '#6b7280',
        }}
      >
        {item.count}
      </span>
      <ArrowRight
        style={{
          height: '16px',
          width: '16px',
          color: isHovered ? '#111827' : '#9ca3af',
          transition: 'color 0.2s',
        }}
      />
    </Link>
  );
}
