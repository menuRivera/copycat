'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_INTERVAL_MS = 5_000;

export function LiveRefresh({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
