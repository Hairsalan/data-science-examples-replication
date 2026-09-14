import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  List,
  Kanban,
  CalendarDays,
  Moon,
  Sun,
  Layers,
  Calendar,
  Clock,
  Star,
  Sparkles,
} from 'lucide-react';
import { Task, ViewMode, SmartView } from '../../types';
import { soundEffects } from '../../utils/audio';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onNewTask: () => void;
  onChangeView: (mode: ViewMode) => void;
  onSelectSmartView: (view: SmartView) => void;
  onToggleTheme: () => void;
  darkMode: boolean;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
  onNewTask,
  onChangeView,
  onSelectSmartView,
  onToggleTheme,
  darkMode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build static commands
  const baseCommands: CommandItem[] = [
    {
      id: 'cmd-new-task',
      title: 'Create New Task',
      category: 'Actions',
      icon: <Plus className="w-4 h-4 text-brand-500" />,
      action: () => {
        onNewTask();
        onClose();
      },
    },
    {
      id: 'cmd-view-list',
      title: 'Switch to List View',
      category: 'Navigation',
      icon: <List className="w-4 h-4 text-blue-500" />,
      action: () => {
        onChangeView('list');
        onClose();
      },
    },
    {
      id: 'cmd-view-board',
      title: 'Switch to Kanban Board',
      category: 'Navigation',
      icon: <Kanban className="w-4 h-4 text-amber-500" />,
      action: () => {
        onChangeView('kanban');
        onClose();
      },
    },
    {
      id: 'cmd-view-calendar',
      title: 'Switch to Calendar Timeline',
      category: 'Navigation',
      icon: <CalendarDays className="w-4 h-4 text-emerald-500" />,
      action: () => {
        onChangeView('calendar');
        onClose();
      },
    },
    {
      id: 'cmd-smart-all',
      title: 'View: All Tasks',
      category: 'Smart Views',
      icon: <Layers className="w-4 h-4" />,
      action: () => {
        onSelectSmartView('all');
        onClose();
      },
    },
    {
      id: 'cmd-smart-today',
      title: 'View: Today',
      category: 'Smart Views',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        onSelectSmartView('today');
        onClose();
      },
    },
    {
      id: 'cmd-smart-upcoming',
      title: 'View: Upcoming',
      category: 'Smart Views',
      icon: <Clock className="w-4 h-4" />,
      action: () => {
        onSelectSmartView('upcoming');
        onClose();
      },
    },
    {
      id: 'cmd-smart-important',
      title: 'View: Important (P1 / P2)',
      category: 'Smart Views',
      icon: <Star className="w-4 h-4" />,
      action: () => {
        onSelectSmartView('important');
        onClose();
      },
    },
    {
      id: 'cmd-toggle-theme',
      title: darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      category: 'Preferences',
      icon: darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />,
      action: () => {
        onToggleTheme();
        onClose();
      },
    },
  ];

  // Dynamic task search items
  const taskCommands: CommandItem[] = tasks.map((task) => ({
    id: `task-${task.id}`,
    title: task.title,
    category: 'Tasks',
    icon: (
      <span
        className={`w-2 h-2 rounded-full ${
          task.status === 'done'
            ? 'bg-emerald-500'
            : task.priority === 'P1'
            ? 'bg-rose-500'
            : task.priority === 'P2'
            ? 'bg-orange-500'
            : 'bg-zinc-400'
        }`}
      />
    ),
    action: () => {
      onSelectTask(task);
      onClose();
    },
  }));

  const allItems = [...baseCommands, ...taskCommands];
  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        soundEffects.playTap();
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search tasks..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No matching commands or tasks found
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundEffects.playTap();
                    item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                    isSelected
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-500" /> Apex Palette
          </span>
        </div>
      </div>
    </div>
  );
};
