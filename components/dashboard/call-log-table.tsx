'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Play,
  Eye,
  Phone as PhoneIcon,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CallDetailSheet } from './call-detail-sheet';
import { formatDuration, formatPhoneNumber, formatRelativeDate } from '@/lib/utils';
import type { Call, CallOutcome } from '@/types';

const outcomeConfig: Record<CallOutcome, { label: string; icon: React.ElementType; className: string }> = {
  booked: { label: 'Booked', icon: CheckCircle, className: 'bg-green-50 text-green-700 border-green-200' },
  info: { label: 'Info', icon: Info, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  missed: { label: 'Missed', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  follow_up: { label: 'Follow-up', icon: AlertCircle, className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

type SortField = 'createdAt' | 'contactName' | 'duration' | 'outcome' | 'urgency';
type SortDirection = 'asc' | 'desc';

interface CallLogTableProps {
  calls: Call[];
  search: string;
  outcomeFilter: CallOutcome | 'all';
  urgencyFilter: string;
}

export function CallLogTable({ calls, search, outcomeFilter, urgencyFilter }: CallLogTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = calls;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.contactName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.summary || '').toLowerCase().includes(q)
      );
    }

    if (outcomeFilter !== 'all') {
      result = result.filter((c) => c.outcome === outcomeFilter);
    }

    if (urgencyFilter !== 'all') {
      result = result.filter((c) => c.urgency === urgencyFilter);
    }

    return result;
  }, [calls, search, outcomeFilter, urgencyFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'contactName':
          cmp = a.contactName.localeCompare(b.contactName);
          break;
        case 'duration':
          cmp = a.duration - b.duration;
          break;
        case 'outcome': {
          const order: CallOutcome[] = ['booked', 'info', 'follow_up', 'missed'];
          cmp = order.indexOf(a.outcome) - order.indexOf(b.outcome);
          break;
        }
        case 'urgency': {
          const uOrder = ['emergency', 'urgent', 'routine'];
          cmp = uOrder.indexOf(a.urgency) - uOrder.indexOf(b.urgency);
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
    }
  }

  function openDetail(call: Call) {
    setSelectedCall(call);
    setSheetOpen(true);
  }

  function SortableHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <TableHead>
        <button
          className="inline-flex items-center gap-1 hover:text-flowmax-accent transition-all duration-200"
          onClick={() => handleSort(field)}
        >
          {children}
          <ArrowUpDown className="h-3 w-3" />
        </button>
      </TableHead>
    );
  }

  return (
    <>
      <div className="rounded-xl ag-glass ag-float-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/40 backdrop-blur-sm border-b border-white/20">
              <SortableHeader field="createdAt">Date/Time</SortableHeader>
              <TableHead>Phone</TableHead>
              <SortableHeader field="contactName">Caller</SortableHeader>
              <SortableHeader field="duration">Duration</SortableHeader>
              <TableHead className="hidden lg:table-cell">Summary</TableHead>
              <SortableHeader field="outcome">Outcome</SortableHeader>
              <SortableHeader field="urgency">Urgency</SortableHeader>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((call) => {
              const outcome = outcomeConfig[call.outcome];
              const OutcomeIcon = outcome.icon;
              return (
                <TableRow
                  key={call.id}
                  className={`transition-all duration-300 hover:bg-white/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] cursor-pointer ${
                    call.urgency === 'emergency' ? 'border-l-2 border-l-red-400' : ''
                  }`}
                  onClick={() => openDetail(call)}
                >
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatRelativeDate(call.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {formatPhoneNumber(call.phone)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {call.contactName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {call.duration > 0 ? formatDuration(call.duration) : '---'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[300px] truncate">
                    {call.summary || '---'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${outcome.className}`}>
                      <OutcomeIcon className="h-3 w-3" />
                      {outcome.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`h-2 w-2 rounded-full ${
                        call.urgency === 'emergency' ? 'bg-red-500' :
                        call.urgency === 'urgent' ? 'bg-amber-500' : 'bg-gray-400'
                      }`} />
                      {call.urgency.charAt(0).toUpperCase() + call.urgency.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {(call.recordingUrl || call.stereoRecordingUrl) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Play recording"
                          onClick={() => openDetail(call)}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="View details"
                        onClick={() => openDetail(call)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  {calls.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <PhoneIcon className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">No calls yet</p>
                      <p className="text-sm text-muted-foreground/60">
                        Once your AI receptionist starts taking calls, they&apos;ll appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No calls match your filters.</p>
                      <p className="text-sm text-muted-foreground/60">
                        Try adjusting your search or filter criteria.
                      </p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CallDetailSheet
        call={selectedCall}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
