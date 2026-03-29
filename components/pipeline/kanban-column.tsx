'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './kanban-card';
import type { Contact } from '@/types';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  contacts: Contact[];
}

export function KanbanColumn({ id, title, color, contacts }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl ag-glass overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{
          background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
          borderBottom: `1px solid ${color}20`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}40`,
            }}
          />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white transition-transform duration-300"
          style={{
            backgroundColor: color,
            boxShadow: `0 2px 8px ${color}40`,
          }}
        >
          {contacts.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 p-2 transition-all duration-300 ${
          isOver ? 'bg-flowmax-accent/5 ring-2 ring-inset ring-flowmax-accent/20' : ''
        }`}
        style={{ minHeight: '120px' }}
      >
        <SortableContext
          items={contacts.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {contacts.map((contact) => (
            <KanbanCard key={contact.id} contact={contact} />
          ))}
        </SortableContext>
        {contacts.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-8">
            <p className="text-xs text-muted-foreground">Drop contacts here</p>
          </div>
        )}
      </div>
    </div>
  );
}
