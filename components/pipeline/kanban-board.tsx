'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { pipelineStages } from '@/lib/mock-data';
import type { PipelineStage, Contact } from '@/types';

const STAGE_COLORS: Record<string, string> = {
  'New Leads': '#3b82f6',
  'Contacted': '#f59e0b',
  'Qualified': '#8b5cf6',
  'Booked': '#10b981',
  'Completed': '#6b7280',
};

export function KanbanBoard() {
  const [stages, setStages] = useState<PipelineStage[]>(pipelineStages);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  function findStageByContactId(contactId: string): PipelineStage | undefined {
    return stages.find((stage) =>
      stage.contacts.some((c) => c.id === contactId)
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const stage = findStageByContactId(active.id as string);
    if (stage) {
      const contact = stage.contacts.find((c) => c.id === active.id);
      if (contact) setActiveContact(contact);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveContact(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceStage = findStageByContactId(activeId);
    if (!sourceStage) return;

    // Check if dropped over a stage (column) directly
    const targetStage =
      stages.find((s) => s.id === overId) ?? findStageByContactId(overId);

    if (!targetStage) return;

    setStages((prev) => {
      const newStages = prev.map((stage) => ({
        ...stage,
        contacts: [...stage.contacts],
      }));

      const sourceIdx = newStages.findIndex((s) => s.id === sourceStage.id);
      const targetIdx = newStages.findIndex((s) => s.id === targetStage.id);

      if (sourceIdx === -1 || targetIdx === -1) return prev;

      // Same column: reorder
      if (sourceStage.id === targetStage.id) {
        const contactIds = newStages[sourceIdx].contacts.map((c) => c.id);
        const oldIndex = contactIds.indexOf(activeId);
        const newIndex = contactIds.indexOf(overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          newStages[sourceIdx].contacts = arrayMove(
            newStages[sourceIdx].contacts,
            oldIndex,
            newIndex
          );
        }
        return newStages;
      }

      // Different column: move contact
      const contactIndex = newStages[sourceIdx].contacts.findIndex(
        (c) => c.id === activeId
      );
      if (contactIndex === -1) return prev;

      const [movedContact] = newStages[sourceIdx].contacts.splice(
        contactIndex,
        1
      );

      // Update the contact status to match the target stage
      const statusMap: Record<string, Contact['status']> = {
        'New Leads': 'new',
        'Contacted': 'contacted',
        'Qualified': 'qualified',
        'Booked': 'booked',
        'Completed': 'completed',
      };
      movedContact.status = statusMap[targetStage.title] ?? movedContact.status;

      // Find insert position
      const overContactIndex = newStages[targetIdx].contacts.findIndex(
        (c) => c.id === overId
      );
      if (overContactIndex !== -1) {
        newStages[targetIdx].contacts.splice(
          overContactIndex,
          0,
          movedContact
        );
      } else {
        newStages[targetIdx].contacts.push(movedContact);
      }

      return newStages;
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 ag-stagger-children">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            id={stage.id}
            title={stage.title}
            color={STAGE_COLORS[stage.title] ?? '#6b7280'}
            contacts={stage.contacts}
          />
        ))}
      </div>
      <DragOverlay>
        {activeContact ? (
          <div style={{ boxShadow: 'var(--shadow-float-xl)', transform: 'rotate(3deg) scale(1.05)' }}>
            <KanbanCard contact={activeContact} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
