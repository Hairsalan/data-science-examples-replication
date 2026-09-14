export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type ViewMode = 'list' | 'kanban' | 'calendar';
export type SmartView = 'all' | 'today' | 'upcoming' | 'important' | 'completed' | 'overdue';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  taskTitle: string;
  action: 'created' | 'updated' | 'completed' | 'uncompleted' | 'deleted' | 'status_changed' | 'priority_changed';
  details: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  estimatedMinutes?: number | null;
  projectId: string;
  orderIndex: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  tags: Tag[];
  subtasks: Subtask[];
}

export interface TaskFilters {
  projectId?: string;
  status?: TaskStatus;
  priority?: Priority;
  tagId?: string;
  search?: string;
  smartView?: SmartView;
  sortBy?: 'orderIndex' | 'dueDate' | 'priority' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completedToday: number;
  overdueTasks: number;
  completionRate: number;
  currentStreak: number;
  priorityCounts: Record<Priority, number>;
  statusCounts: Record<TaskStatus, number>;
  projectCounts: Record<string, number>;
  recentActivity: ActivityLog[];
}
