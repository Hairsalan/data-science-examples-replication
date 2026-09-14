import React from 'react';
import {
  Check,
  Calendar,
  CheckSquare,
  Pin,
  Timer,
  Trash2,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import { Task, Project } from '../../types';
import { soundEffects } from '../../utils/audio';

interface TaskItemProps {
  task: Task;
  project?: Project;
  isSelected: boolean;
  onToggleSelect: (taskId: string, e: React.MouseEvent) => void;
  onToggleComplete: (task: Task) => void;
  onTogglePin: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
  isDragging?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  project,
  isSelected,
  onToggleSelect,
  onToggleComplete,
  onTogglePin,
  onEdit,
  onDelete,
  onStartPomodoro,
}) => {
  const isDone = task.status === 'done';
  const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasks = task.subtasks.length;

  // Format due date relative to today
  const getDueBadge = () => {
    if (!task.dueDate) return null;
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.dueDate < today && !isDone;
    const isToday = task.dueDate === today;

    let label = task.dueDate;
    if (isToday) label = 'Today';
    else if (task.dueDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]) label = 'Tomorrow';

    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
          isOverdue
            ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20'
            : isToday
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
        }`}
      >
        {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
        {label}
      </span>
    );
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'P1':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">P1 Urgent</span>;
      case 'P2':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25">P2 High</span>;
      case 'P3':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">P3 Med</span>;
      case 'P4':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border border-zinc-500/25">P4 Low</span>;
    }
  };

  return (
    <div
      onClick={() => onEdit(task)}
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'bg-brand-500/5 border-brand-500/40 ring-1 ring-brand-500/30'
          : isDone
          ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/60 dark:border-zinc-800/40 opacity-75'
          : 'bg-white dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm hover:shadow'
      }`}
    >
      {/* Left controls: Drag handle, Select checkbox, Completion circle */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-3">
        {/* Grip handle for reordering */}
        <span className="text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 cursor-grab active:cursor-grabbing transition-colors">
          <GripVertical className="w-3.5 h-3.5" />
        </span>

        {/* Multi-select checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(task.id, e as any);
          }}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-zinc-300 dark:border-zinc-700 text-brand-600 focus:ring-brand-500/30 w-3.5 h-3.5 cursor-pointer"
        />

        {/* Status Checkbox Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
            isDone
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'border-2 border-zinc-300 dark:border-zinc-600 hover:border-brand-500 dark:hover:border-brand-400 bg-transparent'
          }`}
          title={isDone ? 'Mark as incomplete' : 'Mark as done'}
        >
          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Task Title & Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium tracking-tight truncate ${
                isDone
                  ? 'line-through text-zinc-400 dark:text-zinc-500'
                  : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {task.title}
            </span>
            {task.isPinned && (
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>

          {/* Description snippet preview if present */}
          {task.description && !isDone && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-md mt-0.5">
              {task.description.split('\n')[0]}
            </p>
          )}
        </div>
      </div>

      {/* Badges & Meta info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Project Pill */}
        {project && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
            {project.name}
          </span>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              >
                #{tag.name}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="text-[10px] text-zinc-400">+{task.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Subtasks Progress */}
        {totalSubtasks > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            <CheckSquare className="w-3 h-3 text-zinc-400" />
            {completedSubtasks}/{totalSubtasks}
          </span>
        )}

        {/* Due Date */}
        {getDueBadge()}

        {/* Priority */}
        {getPriorityBadge()}

        {/* Quick action buttons (Hover overlay) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEffects.playTap();
              onStartPomodoro(task);
            }}
            className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-amber-500 transition-colors"
            title="Focus on this task (Pomodoro)"
          >
            <Timer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEffects.playTap();
              onTogglePin(task);
            }}
            className={`p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${
              task.isPinned ? 'text-amber-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
            title={task.isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEffects.playTap();
              onDelete(task.id);
            }}
            className="p-1 rounded-md hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
