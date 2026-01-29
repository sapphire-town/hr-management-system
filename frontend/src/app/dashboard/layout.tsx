'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, _hasHydrated, checkSessionTimeout } = useAuthStore();

  useEffect(() => {
    // Wait for hydration to complete before checking auth
    if (!_hasHydrated) return;

    // Check if session has timed out (5 hours)
    const sessionExpired = checkSessionTimeout();

    if (!isAuthenticated || sessionExpired) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, _hasHydrated, router, checkSessionTimeout]);

  // Show loading spinner while hydrating
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show loading if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
