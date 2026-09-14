import React, { useRef } from 'react';
import {
  Search,
  List,
  Kanban,
  CalendarDays,
  Plus,
  Command,
  HelpCircle,
  BarChart3,
  X,
} from 'lucide-react';
import { ViewMode, Priority, TaskFilters } from '../../types';
import { soundEffects } from '../../utils/audio';

interface HeaderProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewTaskModal: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcutsModal: () => void;
  onOpenStatsModal: () => void;
  filters: TaskFilters;
  onUpdateFilters: (updates: Partial<TaskFilters>) => void;
  title: string;
  taskCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onChangeViewMode,
  searchQuery,
  onSearchChange,
  onOpenNewTaskModal,
  onOpenCommandPalette,
  onOpenShortcutsModal,
  onOpenStatsModal,
  filters,
  onUpdateFilters,
  title,
  taskCount,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const viewModes: Array<{ id: ViewMode; label: string; icon: React.ReactNode; shortcut: string }> = [
    { id: 'list', label: 'List', icon: <List className="w-4 h-4" />, shortcut: '1' },
    { id: 'kanban', label: 'Board', icon: <Kanban className="w-4 h-4" />, shortcut: '2' },
    { id: 'calendar', label: 'Timeline', icon: <CalendarDays className="w-4 h-4" />, shortcut: '3' },
  ];

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Title & Task count */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {title}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 font-medium">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Center: Search & View Switcher */}
      <div className="flex items-center gap-4 flex-1 max-w-xl mx-4">
        {/* Search input with keyboard indicator */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tasks, descriptions, or tags... (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-12 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] px-1.5 py-0.5 font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded border border-zinc-300 dark:border-zinc-700">
              /
            </kbd>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {viewModes.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                soundEffects.playTap();
                onChangeViewMode(v.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === v.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title={`Switch to ${v.label} (Press '${v.shortcut}')`}
            >
              {v.icon}
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions, Filters, Stats & New Task */}
      <div className="flex items-center gap-2">
        {/* Priority Filter */}
        <select
          value={filters.priority || ''}
          onChange={(e) => onUpdateFilters({ priority: (e.target.value as Priority) || undefined })}
          className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="P1">P1 Urgent</option>
          <option value="P2">P2 High</option>
          <option value="P3">P3 Medium</option>
          <option value="P4">P4 Low</option>
        </select>

        {/* Sort selector */}
        <select
          value={`${filters.sortBy || 'orderIndex'}-${filters.sortOrder || 'asc'}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [TaskFilters['sortBy'], 'asc' | 'desc'];
            onUpdateFilters({ sortBy, sortOrder });
          }}
          className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer"
        >
          <option value="orderIndex-asc">Custom Order</option>
          <option value="dueDate-asc">Due Date (Earliest)</option>
          <option value="priority-asc">Priority (Highest)</option>
          <option value="createdAt-desc">Recently Created</option>
          <option value="title-asc">Title (A-Z)</option>
        </select>

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors text-xs"
          title="Open Command Palette (Ctrl+K)"
        >
          <Command className="w-3.5 h-3.5" />
          <kbd className="text-[10px] font-mono">⌘K</kbd>
        </button>

        {/* Analytics button */}
        <button
          onClick={onOpenStatsModal}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
          title="View Productivity Analytics"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        {/* Shortcuts button */}
        <button
          onClick={onOpenShortcutsModal}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Primary "+ New Task" button */}
        <button
          onClick={() => {
            soundEffects.playTap();
            onOpenNewTaskModal();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm hover:shadow transition-all group"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span>New Task</span>
          <kbd className="hidden lg:inline text-[9px] px-1 py-0.5 rounded bg-brand-700/50 text-brand-200 font-mono">
            N
          </kbd>
        </button>
      </div>
    </header>
  );
};
