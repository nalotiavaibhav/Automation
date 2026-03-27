import { KanbanBoard } from '@/components/pipeline/kanban-board';

export default function PipelinePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-gray-500 mt-1">Drag and drop contacts between stages</p>
      </div>
      <KanbanBoard />
    </div>
  );
}
