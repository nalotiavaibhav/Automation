'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Phone, Globe, Users, PhoneMissed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { pipelineStages } from '@/lib/mock-data';
import { formatPhoneNumber, formatDate } from '@/lib/utils';
import type { Contact } from '@/types';

const statusConfig: Record<
  Contact['status'],
  { label: string; className: string }
> = {
  new: { label: 'New', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  contacted: {
    label: 'Contacted',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  qualified: {
    label: 'Qualified',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  booked: {
    label: 'Booked',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

const urgencyConfig: Record<
  Contact['urgency'],
  { label: string; className: string }
> = {
  emergency: {
    label: 'Emergency',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  routine: {
    label: 'Routine',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

const sourceIcons: Record<Contact['source'], React.ReactNode> = {
  inbound_call: <Phone className="h-3.5 w-3.5" />,
  missed_call: <PhoneMissed className="h-3.5 w-3.5" />,
  website: <Globe className="h-3.5 w-3.5" />,
  referral: <Users className="h-3.5 w-3.5" />,
};

const sourceLabels: Record<Contact['source'], string> = {
  inbound_call: 'Call',
  missed_call: 'Missed',
  website: 'Website',
  referral: 'Referral',
};

type SortField = 'name' | 'status' | 'urgency' | 'lastContactAt';
type SortDirection = 'asc' | 'desc';

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastContactAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const allContacts = useMemo(
    () => pipelineStages.flatMap((stage) => stage.contacts),
    []
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return allContacts;
    return allContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.service.toLowerCase().includes(query)
    );
  }, [allContacts, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'status': {
          const order = ['new', 'contacted', 'qualified', 'booked', 'completed'];
          cmp = order.indexOf(a.status) - order.indexOf(b.status);
          break;
        }
        case 'urgency': {
          const uOrder = ['emergency', 'urgent', 'routine'];
          cmp = uOrder.indexOf(a.urgency) - uOrder.indexOf(b.urgency);
          break;
        }
        case 'lastContactAt':
          cmp =
            new Date(a.lastContactAt).getTime() -
            new Date(b.lastContactAt).getTime();
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
      setSortDirection('asc');
    }
  }

  function SortableHeader({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) {
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="ag-enter">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="text-gray-500 mt-1">
          All contacts across your pipeline ({allContacts.length} total)
        </p>
      </div>

      <div className="group relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-300 group-focus-within:text-flowmax-accent" />
        <Input
          placeholder="Search by name, phone, or service..."
          className="pl-9 bg-white/50 transition-all duration-300 border-white/40 focus-visible:shadow-[0_0_20px_rgba(245,158,11,0.12)] focus-visible:border-flowmax-accent/40"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl ag-glass ag-float-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/40 backdrop-blur-sm border-b border-white/20">
              <SortableHeader field="name">Name</SortableHeader>
              <TableHead>Phone</TableHead>
              <TableHead>Service</TableHead>
              <SortableHeader field="status">Status</SortableHeader>
              <SortableHeader field="urgency">Urgency</SortableHeader>
              <TableHead>Source</TableHead>
              <SortableHeader field="lastContactAt">Last Contact</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((contact) => {
              const status = statusConfig[contact.status];
              const urgency = urgencyConfig[contact.urgency];
              return (
                <TableRow key={contact.id} className="transition-all duration-300 hover:bg-white/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatPhoneNumber(contact.phone)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {contact.service}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${urgency.className}`}
                    >
                      {urgency.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      {sourceIcons[contact.source]}
                      <span className="text-xs">{sourceLabels[contact.source]}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(contact.lastContactAt)}
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No contacts found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
