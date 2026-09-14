import React, { useState } from 'react';
import { Task, Project, TaskStatus } from '../../types';
import { Plus, CheckSquare, Calendar, Pin, AlertCircle, Timer } from 'lucide-react';
import { soundEffects } from '../../utils/audio';
import confetti from 'canvas-confetti';

interface KanbanViewProps {
  tasks: Task[];
  projects: Project[];
  onEditTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onStartPomodoro: (task: Task) => void;
  onQuickAddTaskToStatus?: (status: TaskStatus) => void;
}

interface ColumnDef {
  id: TaskStatus;
  title: string;
  color: string;
  badgeBg: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'To Do', color: '#f59e0b', badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: 'in_progress', title: 'In Progress', color: '#3b82f6', badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'in_review', title: 'In Review', color: '#a855f7', badgeBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'done', title: 'Done', color: '#10b981', badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
];

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  projects,
  onEditTask,
  onUpdateTaskStatus,
  onStartPomodoro,
  onQuickAddTaskToStatus,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const projectMap = React.useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const sourceTaskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (!sourceTaskId) return;

    const task = tasks.find((t) => t.id === sourceTaskId);
    if (!task || task.status === targetStatus) return;

    if (targetStatus === 'done') {
      soundEffects.playComplete();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      soundEffects.playTap();
    }

    onUpdateTaskStatus(sourceTaskId, targetStatus);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-20 items-start">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        const isOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col rounded-2xl p-3 bg-zinc-100/70 dark:bg-zinc-900/40 border transition-all duration-150 min-h-[500px] ${
              isOver
                ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-500/5'
                : 'border-zinc-200/80 dark:border-zinc-800/80'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <h3 className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
                  {col.title}
                </h3>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md border ${col.badgeBg}`}>
                  {colTasks.length}
                </span>
              </div>

              {onQuickAddTaskToStatus && (
                <button
                  onClick={() => {
                    soundEffects.playTap();
                    onQuickAddTaskToStatus(col.id);
                  }}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
                  title={`Add task to ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Column Cards Container */}
            <div className="flex-1 space-y-2.5 overflow-y-auto">
              {colTasks.map((task) => {
                const project = projectMap.get(task.projectId);
                const completedSubs = task.subtasks.filter((s) => s.isCompleted).length;
                const today = new Date().toISOString().split('T')[0];
                const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onEditTask(task)}
                    className="group relative p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 hover:border-brand-500/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none"
                  >
                    {/* Top Row: Project & Pin */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {project ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                          {project.name}
                        </span>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-1">
                        {task.isPinned && (
                          <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEffects.playTap();
                            onStartPomodoro(task);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-amber-500 transition-opacity"
                          title="Focus on this task"
                        >
                          <Timer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Task Title */}
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5 line-clamp-2">
                      {task.title}
                    </h4>

                    {/* Snippet */}
                    {task.description && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2 font-mono">
                        {task.description.split('\n')[0]}
                      </p>
                    )}

                    {/* Bottom Metadata Badges */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-2">
                      <div className="flex items-center gap-1.5">
                        {/* Priority */}
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            task.priority === 'P1'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : task.priority === 'P2'
                              ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                              : task.priority === 'P3'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {task.priority}
                        </span>

                        {/* Checklist progress */}
                        {task.subtasks.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            <CheckSquare className="w-3 h-3" />
                            {completedSubs}/{task.subtasks.length}
                          </span>
                        )}
                      </div>

                      {/* Due date */}
                      {task.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                            isOverdue
                              ? 'text-rose-500 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                          {task.dueDate.slice(5)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {colTasks.length === 0 && (
                <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl text-zinc-400 dark:text-zinc-600 text-xs">
                  <span>Drop tasks here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
