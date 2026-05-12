'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Phone, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCalls } from '@/hooks/use-calls';
import { formatPhoneNumber, formatRelativeDate } from '@/lib/utils';

interface ContactRow {
  phone: string;
  name: string;
  lastCallDate: string;
  totalCalls: number;
  lastOutcome: string;
  lastUrgency: string;
}

type SortField = 'name' | 'totalCalls' | 'lastCallDate';
type SortDirection = 'asc' | 'desc';

export default function ContactsPage() {
  const { calls, loading } = useCalls();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastCallDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const contacts = useMemo(() => {
    const map = new Map<string, ContactRow>();
    for (const call of calls) {
      const key = call.phone;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          phone: call.phone,
          name: call.contactName,
          lastCallDate: call.createdAt,
          totalCalls: 1,
          lastOutcome: call.outcome,
          lastUrgency: call.urgency,
        });
      } else {
        existing.totalCalls += 1;
        if (new Date(call.createdAt) > new Date(existing.lastCallDate)) {
          existing.lastCallDate = call.createdAt;
          existing.lastOutcome = call.outcome;
          existing.lastUrgency = call.urgency;
          if (call.contactName !== 'Unknown Caller') {
            existing.name = call.contactName;
          }
        }
      }
    }
    return Array.from(map.values());
  }, [calls]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [contacts, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'totalCalls':
          cmp = a.totalCalls - b.totalCalls;
          break;
        case 'lastCallDate':
          cmp = new Date(a.lastCallDate).getTime() - new Date(b.lastCallDate).getTime();
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'lastCallDate' ? 'desc' : 'asc');
    }
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

  const outcomeStyle: Record<string, string> = {
    booked: 'bg-green-50 text-green-700 border-green-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    missed: 'bg-red-50 text-red-700 border-red-200',
    follow_up: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const outcomeLabel: Record<string, string> = {
    booked: 'Booked',
    info: 'Info',
    missed: 'Missed',
    follow_up: 'Follow-up',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="text-gray-500 mt-1">
          {loading ? 'Loading...' : `${contacts.length} unique callers from ${calls.length} calls`}
        </p>
      </div>

      <div className="group relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-300 group-focus-within:text-flowmax-accent" />
        <Input
          placeholder="Search by name or phone..."
          className="pl-9 bg-white/50 transition-all duration-300 border-white/40 focus-visible:shadow-[0_0_20px_rgba(245,158,11,0.12)] focus-visible:border-flowmax-accent/40"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl ag-glass ag-float-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-white/40 backdrop-blur-sm border-b border-white/20">
                <SortableHeader field="name">Name</SortableHeader>
                <TableHead>Phone</TableHead>
                <SortableHeader field="totalCalls">Calls</SortableHeader>
                <TableHead>Last Outcome</TableHead>
                <TableHead>Urgency</TableHead>
                <SortableHeader field="lastCallDate">Last Contact</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((contact) => (
                <TableRow key={contact.phone} className="transition-all duration-300 hover:bg-white/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {formatPhoneNumber(contact.phone)}
                  </TableCell>
                  <TableCell className="text-center">{contact.totalCalls}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${outcomeStyle[contact.lastOutcome] || ''}`}>
                      {outcomeLabel[contact.lastOutcome] || contact.lastOutcome}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`h-2 w-2 rounded-full ${
                        contact.lastUrgency === 'emergency' ? 'bg-red-500' :
                        contact.lastUrgency === 'urgent' ? 'bg-amber-500' : 'bg-gray-400'
                      }`} />
                      {contact.lastUrgency.charAt(0).toUpperCase() + contact.lastUrgency.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelativeDate(contact.lastCallDate)}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {contacts.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8">
                        <Phone className="h-8 w-8 text-muted-foreground/40" />
                        <p>No contacts yet. Contacts are created from incoming calls.</p>
                      </div>
                    ) : (
                      'No contacts match your search.'
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
