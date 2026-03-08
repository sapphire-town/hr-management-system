'use client';

import * as React from 'react';

export function useRealtimeRefresh(
  refreshFn: () => Promise<void> | void,
  intervalMs = 30000,
) {
  const stableRefresh = React.useCallback(() => {
    const result = refreshFn();
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch((error) => {
        console.error('Realtime refresh failed:', error);
      });
    }
  }, [refreshFn]);

  React.useEffect(() => {
    stableRefresh();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        stableRefresh();
      }
    }, intervalMs);

    const onFocus = () => stableRefresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        stableRefresh();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, stableRefresh]);
}
