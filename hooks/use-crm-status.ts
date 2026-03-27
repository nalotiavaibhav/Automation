'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CrmProvider, CrmConnectionStatus } from '@/types/crm';

export function useCrmStatus(provider: CrmProvider) {
  const [status, setStatus] = useState<CrmConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/integrations/${provider}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus({ provider, ...data });
      } else {
        setStatus({ provider, connected: false });
      }
    } catch {
      setStatus({ provider, connected: false });
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { status, loading, refresh: checkStatus };
}
