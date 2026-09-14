import React from 'react';
import {
  X,
  BarChart3,
  Flame,
  CheckCircle2,
  AlertCircle,
  Download,
  Activity,
} from 'lucide-react';
import { AnalyticsSummary, Task } from '../../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: AnalyticsSummary | null;
  tasks: Task[];
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  analytics,
  tasks,
}) => {
  if (!isOpen || !analytics) return null;

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tasks-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Status', 'Priority', 'DueDate', 'Project', 'CompletedAt'];
    const rows = tasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.dueDate || '',
      t.projectId,
      t.completedAt || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `tasks-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Productivity & Velocity Analytics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Completion Rate
              </span>
              <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
                {analytics.completionRate}%
              </div>
              <span className="text-[10px] text-zinc-400">
                {analytics.completedTasks} of {analytics.totalTasks} tasks
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Current Streak
              </span>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {analytics.currentStreak} Days
              </div>
              <span className="text-[10px] text-amber-500/80">Active consistency</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Done Today
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {analytics.completedToday}
              </div>
              <span className="text-[10px] text-emerald-500/80">Finished today</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Overdue
              </span>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {analytics.overdueTasks}
              </div>
              <span className="text-[10px] text-rose-500/80">Needs attention</span>
            </div>
          </div>

          {/* Priority Distribution */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3">
              Tasks By Priority
            </h4>
            <div className="space-y-2">
              {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => {
                const count = analytics.priorityCounts[p] || 0;
                const pct = analytics.totalTasks > 0 ? Math.round((count / analytics.totalTasks) * 100) : 0;
                const colors = {
                  P1: 'bg-rose-500',
                  P2: 'bg-orange-500',
                  P3: 'bg-amber-500',
                  P4: 'bg-zinc-500',
                };
                const labels = {
                  P1: 'P1 Urgent',
                  P2: 'P2 High',
                  P3: 'P3 Medium',
                  P4: 'P4 Low',
                };

                return (
                  <div key={p} className="flex items-center gap-3 text-xs">
                    <span className="w-20 font-medium text-zinc-600 dark:text-zinc-400 font-mono">
                      {labels[p]}
                    </span>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${colors[p]} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-zinc-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity Log */}
          {analytics.recentActivity && analytics.recentActivity.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-brand-500" /> Recent Activity Timeline
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {analytics.recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-xs border border-zinc-100 dark:border-zinc-800"
                  >
                    <div className="truncate flex-1 mr-2">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {log.taskTitle}
                      </span>
                      <span className="text-zinc-500 ml-2 text-[11px]">{log.details}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono flex-shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Controls */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Export & Backup</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
