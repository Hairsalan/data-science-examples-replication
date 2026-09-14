import React from 'react';
import { CheckCircle2, Trash2, Flag, X, ArrowRightCircle } from 'lucide-react';
import { Priority, TaskStatus } from '../../types';
import { soundEffects } from '../../utils/audio';

interface BatchActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchUpdateStatus: (status: TaskStatus) => void;
  onBatchUpdatePriority: (priority: Priority) => void;
  onBatchDelete: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBatchUpdateStatus,
  onBatchUpdatePriority,
  onBatchDelete,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slideIn">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-white shadow-2xl border border-zinc-700/80">
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-700">
          <span className="w-5 h-5 rounded-full bg-brand-500 text-[11px] font-bold flex items-center justify-center">
            {selectedCount}
          </span>
          <span className="text-xs font-medium">selected</span>
        </div>

        {/* Mark Done */}
        <button
          onClick={() => {
            soundEffects.playComplete();
            onBatchUpdateStatus('done');
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-zinc-700/60 transition-colors text-emerald-400"
          title="Mark selected tasks as completed"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Done</span>
        </button>

        {/* Move to In Progress */}
        <button
          onClick={() => {
            soundEffects.playTap();
            onBatchUpdateStatus('in_progress');
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-zinc-700/60 transition-colors text-blue-400"
          title="Mark selected as In Progress"
        >
          <ArrowRightCircle className="w-3.5 h-3.5" />
          <span>In Progress</span>
        </button>

        {/* Change Priority dropdown */}
        <div className="relative group">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-zinc-700/60 transition-colors text-amber-400"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Priority</span>
          </button>
          <div className="absolute bottom-full mb-2 left-0 hidden group-hover:flex flex-col bg-zinc-900 border border-zinc-700 rounded-lg py-1 shadow-xl min-w-[100px]">
            <button
              onClick={() => onBatchUpdatePriority('P1')}
              className="px-3 py-1 text-left text-xs hover:bg-zinc-800 text-rose-400 font-semibold"
            >
              P1 Urgent
            </button>
            <button
              onClick={() => onBatchUpdatePriority('P2')}
              className="px-3 py-1 text-left text-xs hover:bg-zinc-800 text-orange-400 font-medium"
            >
              P2 High
            </button>
            <button
              onClick={() => onBatchUpdatePriority('P3')}
              className="px-3 py-1 text-left text-xs hover:bg-zinc-800 text-amber-400"
            >
              P3 Medium
            </button>
            <button
              onClick={() => onBatchUpdatePriority('P4')}
              className="px-3 py-1 text-left text-xs hover:bg-zinc-800 text-zinc-400"
            >
              P4 Low
            </button>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => {
            if (confirm(`Delete ${selectedCount} selected tasks?`)) {
              soundEffects.playTap();
              onBatchDelete();
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
          title="Delete selected tasks"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        {/* Clear selection */}
        <button
          onClick={() => {
            soundEffects.playTap();
            onClearSelection();
          }}
          className="p-1 rounded-lg hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition-colors ml-1"
          title="Deselect all (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
