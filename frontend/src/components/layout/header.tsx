'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, LogOut, User, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { ROLE_LABELS } from '@/lib/constants';
import { SearchInput } from '@/components/ui/search-input';
import { AvatarWithFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, setMobileSidebarOpen } = useUIStore();
  const [isLargeScreen, setIsLargeScreen] = React.useState(true);
  const [isMediumScreen, setIsMediumScreen] = React.useState(true);
  const [notifications] = React.useState([
    { id: 1, title: 'New leave request', time: '5m ago', read: false },
    { id: 2, title: 'Document approved', time: '1h ago', read: false },
    { id: 3, title: 'Team meeting at 3 PM', time: '2h ago', read: true },
  ]);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
      setIsMediumScreen(window.innerWidth >= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  const userName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email || 'User';

  const headerLeft = isLargeScreen
    ? (sidebarCollapsed ? '64px' : '256px')
    : '0px';

  const iconButtonStyle: React.CSSProperties = {
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
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: headerLeft,
        height: '64px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 30,
        transition: 'left 0.3s',
      }}
    >
      <div
        style={{
          height: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Mobile menu button */}
        {!isLargeScreen && (
          <button
            style={iconButtonStyle}
            onClick={() => setMobileSidebarOpen(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f3ff';
              e.currentTarget.style.color = '#7c3aed';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <Menu style={{ height: '20px', width: '20px' }} />
          </button>
        )}

        {/* Search - hidden on small screens */}
        {isMediumScreen && (
          <div style={{ flex: 1, maxWidth: '448px' }}>
            <SearchInput
              placeholder="Search employees, documents..."
              onSearch={handleSearch}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                style={{ ...iconButtonStyle, position: 'relative' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f3ff';
                  e.currentTarget.style.color = '#7c3aed';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <Bell style={{ height: '20px', width: '20px' }} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      height: '8px',
                      width: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                    }}
                  />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ width: '320px' }}>
              <DropdownMenuLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="primary">{unreadCount} new</Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: notification.read ? 400 : 500,
                        }}
                      >
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            height: '8px',
                            width: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#7c3aed',
                          }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {notification.time}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem style={{ justifyContent: 'center', color: '#7c3aed' }}>
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px',
                  borderRadius: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f3ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <AvatarWithFallback
                  fallback={userName}
                  size="sm"
                />
                {isMediumScreen && (
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>
                      {userName}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {user?.role ? ROLE_LABELS[user.role] : ''}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ width: '224px' }}>
              <DropdownMenuLabel>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{userName}</span>
                  <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280' }}>
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                <User style={{ marginRight: '8px', height: '16px', width: '16px' }} />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                <Settings style={{ marginRight: '8px', height: '16px', width: '16px' }} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                style={{ color: '#dc2626' }}
              >
                <LogOut style={{ marginRight: '8px', height: '16px', width: '16px' }} />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
