'use client';

import { Search, Download, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CallOutcome } from '@/types';

interface CallLogToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  outcomeFilter: CallOutcome | 'all';
  onOutcomeChange: (value: CallOutcome | 'all') => void;
  urgencyFilter: string;
  onUrgencyChange: (value: string) => void;
  onExport: () => void;
  onRefresh: () => void;
}

export function CallLogToolbar({
  search,
  onSearchChange,
  outcomeFilter,
  onOutcomeChange,
  urgencyFilter,
  onUrgencyChange,
  onExport,
  onRefresh,
}: CallLogToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="group relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-300 group-focus-within:text-flowmax-accent" />
        <Input
          placeholder="Search by phone or name..."
          className="pl-9 bg-white/50 transition-all duration-300 border-white/40 focus-visible:shadow-[0_0_20px_rgba(245,158,11,0.12)] focus-visible:border-flowmax-accent/40"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Select value={outcomeFilter} onValueChange={(v) => onOutcomeChange((v ?? 'all') as CallOutcome | 'all')}>
        <SelectTrigger className="w-[150px] bg-white/50 border-white/40">
          <SelectValue placeholder="Outcome" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Outcomes</SelectItem>
          <SelectItem value="booked">Booked</SelectItem>
          <SelectItem value="info">Info Provided</SelectItem>
          <SelectItem value="missed">Missed</SelectItem>
          <SelectItem value="follow_up">Needs Follow-up</SelectItem>
        </SelectContent>
      </Select>

      <Select value={urgencyFilter} onValueChange={(v) => onUrgencyChange(v ?? 'all')}>
        <SelectTrigger className="w-[150px] bg-white/50 border-white/40">
          <SelectValue placeholder="Urgency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Urgencies</SelectItem>
          <SelectItem value="emergency">Emergency</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="routine">Routine</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>
    </div>
  );
}
