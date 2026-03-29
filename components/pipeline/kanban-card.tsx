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
      className={`group rounded-xl border border-white/60 bg-white/80 backdrop-blur-sm p-3 transition-all duration-300 ${
        isDragging
          ? 'opacity-70 rotate-2 scale-105 ring-2 ring-flowmax-accent/30'
          : 'hover:-translate-y-1'
      }`}
      {...(isDragging
        ? {}
        : {
            style: {
              ...style,
              boxShadow: 'var(--shadow-float)',
            },
          })}
    >
      <div
        style={
          isDragging
            ? { ...style, boxShadow: 'var(--shadow-float-xl)' }
            : style
        }
      />
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 cursor-grab touch-none text-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 active:cursor-grabbing"
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
              className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-transform duration-200 hover:scale-105 ${urgency.className}`}
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
