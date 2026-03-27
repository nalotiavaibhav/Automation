'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Phone, Globe, AlertTriangle } from 'lucide-react';
import type { Contact } from '@/types';

interface KanbanCardProps {
  contact: Contact;
}

const urgencyConfig = {
  emergency: { label: 'Emergency', className: 'bg-red-50 text-red-700 border-red-200' },
  urgent: { label: 'Urgent', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  routine: { label: 'Routine', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const sourceIcons: Record<Contact['source'], React.ReactNode> = {
  inbound_call: <Phone className="h-3 w-3" />,
  missed_call: <Phone className="h-3 w-3" />,
  website: <Globe className="h-3 w-3" />,
  referral: <AlertTriangle className="h-3 w-3" />,
};

export function KanbanCard({ contact }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const urgency = urgencyConfig[contact.urgency];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        isDragging ? 'opacity-50 shadow-lg rotate-2' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {contact.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {contact.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {contact.service}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${urgency.className}`}
            >
              {urgency.label}
            </span>
            <span className="inline-flex items-center text-muted-foreground" title={contact.source}>
              {sourceIcons[contact.source]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
