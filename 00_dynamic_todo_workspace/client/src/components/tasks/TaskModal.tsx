import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Pin,
  Check,
} from 'lucide-react';
import { Task, Project, Tag, Priority, TaskStatus, Subtask } from '../../types';
import { soundEffects } from '../../utils/audio';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null; // If null, create mode
  projects: Project[];
  tags: Tag[];
  onSaveTask: (taskData: {
    id?: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    dueDate: string | null;
    estimatedMinutes: number | null;
    projectId: string;
    isPinned: boolean;
    tagIds: string[];
    subtasks?: string[];
  }) => Promise<void>;
  onAddSubtask?: (taskId: string, title: string) => Promise<Subtask | null>;
  onUpdateSubtask?: (id: string, updates: Partial<Subtask>) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  projects,
  tags,
  onSaveTask,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>('P3');
  const [dueDate, setDueDate] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');
  const [projectId, setProjectId] = useState<string>('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  // Local subtasks state
  const [localSubtasks, setLocalSubtasks] = useState<Array<{ id: string; title: string; isCompleted: boolean }>>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate || '');
      setEstimatedMinutes(task.estimatedMinutes ?? '');
      setProjectId(task.projectId);
      setIsPinned(task.isPinned);
      setSelectedTagIds(task.tags ? task.tags.map((t) => t.id) : []);
      setLocalSubtasks(task.subtasks || []);
    } else {
      // Defaults for new task
      const defaultProj = projects.find((p) => p.isDefault) || projects[0];
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('P3');
      setDueDate('');
      setEstimatedMinutes('');
      setProjectId(defaultProj ? defaultProj.id : '');
      setIsPinned(false);
      setSelectedTagIds([]);
      setLocalSubtasks([]);
    }
  }, [task, projects, isOpen]);

  if (!isOpen) return null;

  const handleToggleTag = (tagId: string) => {
    soundEffects.playTap();
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskInput.trim()) return;
    const subTitle = newSubtaskInput.trim();
    setNewSubtaskInput('');

    if (task && onAddSubtask) {
      const created = await onAddSubtask(task.id, subTitle);
      if (created) {
        setLocalSubtasks((prev) => [...prev, created]);
      }
    } else {
      // In create mode, append to local list
      setLocalSubtasks((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, title: subTitle, isCompleted: false },
      ]);
    }
    soundEffects.playTap();
  };

  const handleToggleSubtask = async (sub: { id: string; isCompleted: boolean }) => {
    const nextCompleted = !sub.isCompleted;
    if (nextCompleted) {
      soundEffects.playComplete();
    } else {
      soundEffects.playTap();
    }

    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, isCompleted: nextCompleted } : s))
    );

    if (task && onUpdateSubtask && !sub.id.startsWith('temp-')) {
      await onUpdateSubtask(sub.id, { isCompleted: nextCompleted });
    }
  };

  const handleDeleteSubtask = async (subId: string) => {
    setLocalSubtasks((prev) => prev.filter((s) => s.id !== subId));
    if (task && onDeleteSubtask && !subId.startsWith('temp-')) {
      await onDeleteSubtask(subId);
    }
    soundEffects.playTap();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await onSaveTask({
        id: task ? task.id : undefined,
        title: title.trim(),
        description,
        status,
        priority,
        dueDate: dueDate || null,
        estimatedMinutes: estimatedMinutes === '' ? null : Number(estimatedMinutes),
        projectId: projectId || (projects[0] ? projects[0].id : ''),
        isPinned,
        tagIds: selectedTagIds,
        subtasks: !task ? localSubtasks.map((s) => s.title) : undefined,
      });
      soundEffects.playTap();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const completedSubCount = localSubtasks.filter((s) => s.isCompleted).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {task ? 'Edit Task' : 'Create Task'}
            </span>
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1 rounded-md transition-colors ${
                isPinned ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
              title={isPinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title Input */}
          <div>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg font-semibold bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
              autoFocus
              required
            />
          </div>

          {/* Description Textarea */}
          <div>
            <textarea
              rows={4}
              placeholder="Add details, markdown notes, context or links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs font-normal bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-brand-500 transition-all font-mono"
            />
          </div>

          {/* Property Selectors Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Status */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="P1">P1 Urgent</option>
                <option value="P2">P2 High</option>
                <option value="P3">P3 Medium</option>
                <option value="P4">P4 Low</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer"
              />
            </div>

            {/* Project */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtasks Checklist */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Checklist & Subtasks
              </span>
              {localSubtasks.length > 0 && (
                <span className="text-xs font-mono text-zinc-400">
                  {completedSubCount} of {localSubtasks.length} completed
                </span>
              )}
            </div>

            {/* Subtask progress bar */}
            {localSubtasks.length > 0 && (
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(completedSubCount / localSubtasks.length) * 100}%` }}
                />
              </div>
            )}

            {/* Subtask items */}
            <div className="space-y-1.5 mb-2.5">
              {localSubtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(sub)}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                        sub.isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'border border-zinc-400 dark:border-zinc-600'
                      }`}
                    >
                      {sub.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span
                      className={`text-xs truncate ${
                        sub.isCompleted
                          ? 'line-through text-zinc-400 dark:text-zinc-500'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {sub.title}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask and press Enter..."
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Tags assignment */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Save & Cancel Buttons */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              Tip: Press <kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">Esc</kbd> to cancel
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="px-5 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
