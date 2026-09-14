import React from 'react';
import { Task, Project } from '../../types';
import { TaskItem } from '../tasks/TaskItem';
import { AlertCircle, Calendar, CalendarCheck2, Clock, CalendarDays } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  selectedTaskIds: string[];
  onToggleSelectTask: (taskId: string, e: React.MouseEvent) => void;
  onToggleCompleteTask: (task: Task) => void;
  onTogglePinTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  projects,
  selectedTaskIds,
  onToggleSelectTask,
  onToggleCompleteTask,
  onTogglePinTask,
  onEditTask,
  onDeleteTask,
  onStartPomodoro,
}) => {
  const projectMap = React.useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

  // Group tasks into timeline buckets
  const overdueTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayStr);
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const tomorrowTasks = tasks.filter((t) => t.dueDate === tomorrowStr);
  const thisWeekTasks = tasks.filter((t) => t.dueDate && t.dueDate > tomorrowStr && t.dueDate <= endOfWeekStr);
  const laterTasks = tasks.filter((t) => t.dueDate && t.dueDate > endOfWeekStr);
  const unscheduledTasks = tasks.filter((t) => !t.dueDate);

  const sections = [
    {
      id: 'overdue',
      title: 'Overdue Needs Attention',
      tasks: overdueTasks,
      icon: <AlertCircle className="w-4 h-4 text-rose-500" />,
      badgeBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    },
    {
      id: 'today',
      title: 'Scheduled For Today',
      tasks: todayTasks,
      icon: <Calendar className="w-4 h-4 text-brand-500" />,
      badgeBg: 'bg-brand-500/10 text-brand-500 border-brand-500/20',
    },
    {
      id: 'tomorrow',
      title: 'Tomorrow',
      tasks: tomorrowTasks,
      icon: <Clock className="w-4 h-4 text-blue-500" />,
      badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    {
      id: 'this_week',
      title: 'Later This Week',
      tasks: thisWeekTasks,
      icon: <CalendarCheck2 className="w-4 h-4 text-purple-500" />,
      badgeBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    },
    {
      id: 'later',
      title: 'Upcoming & Next Week',
      tasks: laterTasks,
      icon: <CalendarDays className="w-4 h-4 text-emerald-500" />,
      badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    },
    {
      id: 'unscheduled',
      title: 'No Due Date',
      tasks: unscheduledTasks,
      icon: <Clock className="w-4 h-4 text-zinc-400" />,
      badgeBg: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {sections.map((sec) => {
        if (sec.tasks.length === 0) return null;

        return (
          <div key={sec.id} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 py-1">
              <span className="flex items-center gap-1.5">
                {sec.icon}
                <span>{sec.title}</span>
              </span>
              <span className={`text-[11px] font-mono px-2 py-0.2 rounded-full border ${sec.badgeBg}`}>
                {sec.tasks.length}
              </span>
            </div>

            <div className="space-y-1.5 pl-2">
              {sec.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  project={projectMap.get(task.projectId)}
                  isSelected={selectedTaskIds.includes(task.id)}
                  onToggleSelect={onToggleSelectTask}
                  onToggleComplete={onToggleCompleteTask}
                  onTogglePin={onTogglePinTask}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onStartPomodoro={onStartPomodoro}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
