'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { KpiStrip } from '@/components/dashboard/kpi-strip';
import { CallLogToolbar } from '@/components/dashboard/call-log-toolbar';
import { CallLogTable } from '@/components/dashboard/call-log-table';
import { CallsChart } from '@/components/dashboard/calls-chart';
import { useCalls } from '@/hooks/use-calls';
import { exportCallsToCSV } from '@/lib/export-csv';
import type { CallOutcome } from '@/types';

export default function DashboardPage() {
  const { calls, loading, error, refresh } = useCalls();
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<CallOutcome | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleExport() {
    // Apply same filters for export
    let filtered = calls;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.contactName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.summary || '').toLowerCase().includes(q)
      );
    }
    if (outcomeFilter !== 'all') filtered = filtered.filter((c) => c.outcome === outcomeFilter);
    if (urgencyFilter !== 'all') filtered = filtered.filter((c) => c.urgency === urgencyFilter);
    exportCallsToCSV(filtered);
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <p className="text-red-600 font-medium">Failed to load calls</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <button onClick={refresh} className="mt-3 text-sm text-flowmax-accent underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {loading ? 'Loading calls...' : `Your AI receptionist has handled ${calls.length} calls`}
        </p>
      </div>

      <KpiStrip calls={calls} loading={loading} />

      <CallLogToolbar
        search={search}
        onSearchChange={handleSearch}
        outcomeFilter={outcomeFilter}
        onOutcomeChange={setOutcomeFilter}
        urgencyFilter={urgencyFilter}
        onUrgencyChange={setUrgencyFilter}
        onExport={handleExport}
        onRefresh={refresh}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CallLogTable
          calls={calls}
          search={debouncedSearch}
          outcomeFilter={outcomeFilter}
          urgencyFilter={urgencyFilter}
        />
      )}

      {!loading && <CallsChart calls={calls} />}
    </div>
  );
}
