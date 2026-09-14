import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', desc: 'Create new task' },
    { key: '/', desc: 'Focus global search' },
    { key: '⌘K / Ctrl+K', desc: 'Open Command Palette' },
    { key: '1', desc: 'Switch to List view' },
    { key: '2', desc: 'Switch to Kanban Board view' },
    { key: '3', desc: 'Switch to Calendar Timeline' },
    { key: 'Esc', desc: 'Close dialogs or clear selection' },
    { key: '?', desc: 'Show this keyboard shortcuts guide' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Keyboard className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold text-sm">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
            >
              <span className="text-zinc-600 dark:text-zinc-400">{s.desc}</span>
              <kbd className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <span className="text-[11px] text-zinc-400">
            Apex Flow is built keyboard-first for maximum productivity.
          </span>
        </div>
      </div>
    </div>
  );
};
