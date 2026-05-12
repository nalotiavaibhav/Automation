'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Call } from '@/types';

interface UseCallsReturn {
  calls: Call[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCalls(pollIntervalMs = 30_000): UseCallsReturn {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCalls = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/calls');
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to fetch calls' }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: Call[] = await res.json();
      setCalls(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls(true);
    intervalRef.current = setInterval(() => fetchCalls(false), pollIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCalls, pollIntervalMs]);

  return { calls, loading, error, refresh: () => fetchCalls(true) };
}
