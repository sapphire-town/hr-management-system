'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { NAVIGATION_CONFIG, type NavSection } from '@/lib/constants';

function SidebarItem({
  item,
  collapsed,
}: {
  item: NavSection['items'][0];
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: collapsed ? '10px 8px' : '10px 12px',
        margin: '0 8px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 500,
        color: isActive ? '#6d28d9' : '#4b5563',
        backgroundColor: isActive ? '#ede9fe' : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.2s',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      title={collapsed ? item.label : undefined}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = '#f5f3ff';
          e.currentTarget.style.color = '#7c3aed';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#4b5563';
        }
      }}
    >
      <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
      {!collapsed && (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </span>
      )}
      {!collapsed && item.badge && (
        <span style={{
          marginLeft: 'auto',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 500,
          backgroundColor: '#ede9fe',
          color: '#6d28d9',
        }}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const navigation = user?.role ? NAVIGATION_CONFIG[user.role] || [] : [];

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: sidebarCollapsed ? '64px' : '256px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        zIndex: 40,
        transition: 'width 0.3s',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
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
        {!sidebarCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                height: '32px',
                width: '32px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #6366f1 100%)',
              }}
            >
              <Building2 style={{ height: '16px', width: '16px', color: 'white' }} />
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: '14px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              HR System
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '36px',
            width: '36px',
            borderRadius: '12px',
            color: '#6b7280',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f3ff';
            e.currentTarget.style.color = '#7c3aed';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight style={{ height: '16px', width: '16px' }} />
          ) : (
            <ChevronLeft style={{ height: '16px', width: '16px' }} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 0' }}>
        {navigation.map((section, idx) => (
          <div key={idx} style={{ marginBottom: '24px' }}>
            {section.title && !sidebarCollapsed && (
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
                <SidebarItem
                  key={item.href}
                  item={item}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User info at bottom */}
      {!sidebarCollapsed && user?.employee && (
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
                borderRadius: '12px',
                backgroundColor: '#ede9fe',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {user.employee.firstName[0]}
              {user.employee.lastName[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111827',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  margin: 0,
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
  );
}
