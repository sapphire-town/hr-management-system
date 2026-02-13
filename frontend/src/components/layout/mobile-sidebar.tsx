'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { X, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { NAVIGATION_CONFIG, type NavSection } from '@/lib/constants';

function MobileSidebarItem({
  item,
  onClose,
}: {
  item: NavSection['items'][0];
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const isActive = item.href.includes('?') ? currentUrl === item.href : pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClose}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        margin: '0 8px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 500,
        color: isActive ? '#6d28d9' : '#4b5563',
        backgroundColor: isActive ? '#ede9fe' : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.2s',
      }}
    >
      <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
      {item.badge && (
        <span
          style={{
            marginLeft: 'auto',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: '#ede9fe',
            color: '#6d28d9',
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function MobileSidebar() {
  const { user } = useAuthStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  const navigation = user?.role ? NAVIGATION_CONFIG[user.role] || [] : [];

  React.useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  if (!mobileSidebarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 40,
        }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '288px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                height: '32px',
                width: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
              }}
            >
              <Building2 style={{ height: '20px', width: '20px', color: 'white' }} />
            </div>
            <span
              style={{
                fontWeight: 600,
                fontSize: '14px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              HR System
            </span>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              width: '40px',
              borderRadius: '12px',
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <X style={{ height: '20px', width: '20px' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navigation.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '24px' }}>
              {section.title && (
                <h3
                  style={{
                    padding: '0 16px',
                    marginBottom: '8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {section.title}
                </h3>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {section.items.map((item) => (
                  <MobileSidebarItem
                    key={item.href}
                    item={item}
                    onClose={() => setMobileSidebarOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User info */}
        {user?.employee && (
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  height: '36px',
                  width: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#ede9fe',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {user.employee.firstName[0]}
                {user.employee.lastName[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                    color: '#111827',
                  }}
                >
                  {user.employee.firstName} {user.employee.lastName}
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}
                >
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
