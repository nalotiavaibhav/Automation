import type { Call } from '@/types';
import { formatDate, formatTime, formatPhoneNumber, formatDuration } from './utils';

export function exportCallsToCSV(calls: Call[], filename?: string): void {
  const headers = ['Date', 'Time', 'Phone', 'Caller', 'Duration', 'Summary', 'Outcome', 'Urgency', 'Cost'];
  const rows = calls.map((call) => [
    formatDate(call.createdAt),
    formatTime(call.createdAt),
    formatPhoneNumber(call.phone),
    call.contactName,
    call.duration > 0 ? formatDuration(call.duration) : '---',
    `"${(call.summary || '').replace(/"/g, '""')}"`,
    call.outcome,
    call.urgency,
    call.cost != null ? `$${call.cost.toFixed(2)}` : '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `call-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
