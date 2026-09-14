import React, { useState } from 'react';
import { Task, Project, TaskStatus } from '../../types';
import { TaskItem } from '../tasks/TaskItem';
import { ChevronDown, ChevronRight, CheckCircle2, Clock, Inbox, Plus } from 'lucide-react';
import { soundEffects } from '../../utils/audio';

interface ListViewProps {
  tasks: Task[];
  projects: Project[];
  selectedTaskIds: string[];
  onToggleSelectTask: (taskId: string, e: React.MouseEvent) => void;
  onToggleCompleteTask: (task: Task) => void;
  onTogglePinTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
  onReorderTasks: (orderedIds: string[], targetStatus?: TaskStatus) => void;
  onQuickAddTask?: () => void;
}

interface GroupConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  filter: (t: Task) => boolean;
  targetStatus?: TaskStatus;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  projects,
  selectedTaskIds,
  onToggleSelectTask,
  onToggleCompleteTask,
  onTogglePinTask,
  onEditTask,
  onDeleteTask,
  onStartPomodoro,
  onReorderTasks,
  onQuickAddTask,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const toggleGroup = (groupId: string) => {
    soundEffects.playTap();
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const projectMap = React.useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const groups: GroupConfig[] = [
    {
      id: 'in_progress',
      title: 'In Progress',
      icon: <Clock className="w-4 h-4 text-blue-500" />,
      filter: (t) => t.status === 'in_progress',
      targetStatus: 'in_progress',
    },
    {
      id: 'todo',
      title: 'To Do',
      icon: <Inbox className="w-4 h-4 text-amber-500" />,
      filter: (t) => t.status === 'todo',
      targetStatus: 'todo',
    },
    {
      id: 'in_review',
      title: 'In Review',
      icon: <Clock className="w-4 h-4 text-purple-500" />,
      filter: (t) => t.status === 'in_review',
      targetStatus: 'in_review',
    },
    {
      id: 'done',
      title: 'Completed',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      filter: (t) => t.status === 'done',
      targetStatus: 'done',
    },
  ];

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string, targetStatus?: TaskStatus) => {
    e.preventDefault();
    const sourceTaskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const currentOrder = tasks.map((t) => t.id);
    const sourceIndex = currentOrder.indexOf(sourceTaskId);
    const targetIndex = currentOrder.indexOf(targetTaskId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const nextOrder = [...currentOrder];
    const [moved] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);

    soundEffects.playTap();
    onReorderTasks(nextOrder, targetStatus);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4 shadow-inner">
          <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          No tasks found
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
          All tasks in this view have been completed or filter criteria returned zero results.
        </p>
        {onQuickAddTask && (
          <button
            onClick={onQuickAddTask}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Create a Task
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {groups.map((group) => {
        const groupTasks = tasks.filter(group.filter);
        if (groupTasks.length === 0) return null;
        const isCollapsed = collapsedGroups[group.id];

        return (
          <div key={group.id} className="space-y-2">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1 group"
            >
              <span className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200">
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
              <span className="flex items-center gap-1.5">
                {group.icon}
                <span>{group.title}</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {groupTasks.length}
              </span>
            </button>

            {/* Group Tasks List */}
            {!isCollapsed && (
              <div className="space-y-1.5 pl-2">
                {groupTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, task.id, group.targetStatus)}
                    className="transition-transform"
                  >
                    <TaskItem
                      task={task}
                      project={projectMap.get(task.projectId)}
                      isSelected={selectedTaskIds.includes(task.id)}
                      onToggleSelect={onToggleSelectTask}
                      onToggleComplete={onToggleCompleteTask}
                      onTogglePin={onTogglePinTask}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onStartPomodoro={onStartPomodoro}
                      isDragging={draggedTaskId === task.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
