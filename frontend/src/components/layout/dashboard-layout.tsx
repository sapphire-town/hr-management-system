'use client';

import * as React from 'react';
import { useUIStore } from '@/store/ui-store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileSidebar } from './mobile-sidebar';
import { Breadcrumbs } from './breadcrumbs';
import { Toaster } from '@/components/ui/toaster';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({
  children,
  title,
  description,
  actions,
}: DashboardLayoutProps) {
  const { sidebarCollapsed } = useUIStore();
  const [isLargeScreen, setIsLargeScreen] = React.useState(true);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const mainPaddingLeft = isLargeScreen
    ? (sidebarCollapsed ? '64px' : '256px')
    : '0px';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 50%, #fae8ff 100%)',
      }}
    >
      {/* Sidebar - Desktop only */}
      {isLargeScreen && <Sidebar />}

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          transition: 'padding-left 0.3s',
          paddingLeft: mainPaddingLeft,
        }}
      >
        <div style={{ padding: '24px' }}>
          {/* Breadcrumbs */}
          <Breadcrumbs className="mb-4" />

          {/* Page Header */}
          {(title || actions) && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                {title && (
                  <h1
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      letterSpacing: '-0.025em',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      margin: 0,
                    }}
                  >
                    {title}
                  </h1>
                )}
                {description && (
                  <p style={{ color: '#6b7280', marginTop: '4px', margin: 0 }}>{description}</p>
                )}
              </div>
              {actions && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {actions}
                </div>
              )}
            </div>
          )}

          {/* Page Content */}
          {children}
        </div>
      </main>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}
