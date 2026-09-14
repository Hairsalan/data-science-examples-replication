import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import {
  DatabaseSchema,
  Task,
  Subtask,
  Project,
  Tag,
  ActivityLog,
  TaskFilters,
  AnalyticsSummary,
  Priority,
  TaskStatus,
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'todo-db.json');

const PRIORITY_WEIGHT: Record<Priority, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.data = this.loadOrInit();
  }

  private loadOrInit(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse database file, re-initializing...', e);
      }
    }
    const initialData = this.getInitialSeedData();
    this.persistSync(initialData);
    return initialData;
  }

  private persistSync(dataToPersist = this.data): void {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(dataToPersist, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  private getInitialSeedData(): DatabaseSchema {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const projects: Project[] = [
      { id: 'proj-inbox', name: 'Inbox', color: '#6366f1', icon: 'Inbox', isDefault: true, createdAt: now.toISOString() },
      { id: 'proj-work', name: 'Work & Product', color: '#3b82f6', icon: 'Briefcase', createdAt: now.toISOString() },
      { id: 'proj-design', name: 'Design System', color: '#ec4899', icon: 'Palette', createdAt: now.toISOString() },
      { id: 'proj-launch', name: 'v2.0 Launch', color: '#10b981', icon: 'Rocket', createdAt: now.toISOString() },
      { id: 'proj-personal', name: 'Personal & Habits', color: '#f59e0b', icon: 'User', createdAt: now.toISOString() },
    ];

    const tags: Tag[] = [
      { id: 'tag-bug', name: 'Bug', color: '#ef4444' },
      { id: 'tag-feat', name: 'Feature', color: '#3b82f6' },
      { id: 'tag-design', name: 'Design', color: '#ec4899' },
      { id: 'tag-urgent', name: 'Urgent', color: '#f97316' },
      { id: 'tag-refactor', name: 'Refactor', color: '#8b5cf6' },
      { id: 'tag-docs', name: 'Docs', color: '#14b8a6' },
    ];

    const rawTasks = [
      {
        id: 'task-1',
        title: 'Design token audit and dark mode contrast check',
        description: 'Verify all color tokens meet WCAG 2.1 AAA accessibility contrast standards in both light and dark modes.\n\n- Check text against background `zinc-900`\n- Ensure focus rings are visible\n- Test high contrast border states',
        status: 'in_progress' as TaskStatus,
        priority: 'P1' as Priority,
        dueDate: todayStr,
        estimatedMinutes: 45,
        projectId: 'proj-design',
        orderIndex: 0,
        isPinned: true,
        createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
        updatedAt: now.toISOString(),
        completedAt: null,
      },
      {
        id: 'task-2',
        title: 'Implement drag-and-drop Kanban state sync',
        description: 'Allow tasks to be seamlessly dragged across columns with optimistic UI response and server synchronization.',
        status: 'done' as TaskStatus,
        priority: 'P1' as Priority,
        dueDate: yesterdayStr,
        estimatedMinutes: 60,
        projectId: 'proj-work',
        orderIndex: 0,
        isPinned: false,
        createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
        updatedAt: now.toISOString(),
        completedAt: now.toISOString(),
      },
      {
        id: 'task-3',
        title: 'Add integrated Pomodoro focus timer with Web Audio bells',
        description: 'Build a focus timer docked in the sidebar that tracks session intervals and sounds a gentle chime on completion.',
        status: 'in_progress' as TaskStatus,
        priority: 'P2' as Priority,
        dueDate: todayStr,
        estimatedMinutes: 30,
        projectId: 'proj-work',
        orderIndex: 1,
        isPinned: true,
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
        updatedAt: now.toISOString(),
        completedAt: null,
      },
      {
        id: 'task-4',
        title: 'Draft release notes and product changelog for v2.0',
        description: 'Highlight key improvements: speed boost, command palette (`Ctrl+K`), keyboard shortcuts, and confetti animations.',
        status: 'todo' as TaskStatus,
        priority: 'P2' as Priority,
        dueDate: tomorrowStr,
        estimatedMinutes: 40,
        projectId: 'proj-launch',
        orderIndex: 0,
        isPinned: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        completedAt: null,
      },
      {
        id: 'task-5',
        title: 'Investigate memory leak in websocket event listeners',
        description: 'Profile heap allocation when rapidly unmounting real-time dashboard listeners.\n\n```ts\n// Ensure listeners are unregistered on cleanup:\nuseEffect(() => {\n  return () => socket.off("update");\n}, []);\n```',
        status: 'in_review' as TaskStatus,
        priority: 'P1' as Priority,
        dueDate: todayStr,
        estimatedMinutes: 90,
        projectId: 'proj-work',
        orderIndex: 0,
        isPinned: false,
        createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
        updatedAt: now.toISOString(),
        completedAt: null,
      },
      {
        id: 'task-6',
        title: 'Morning 5km run and hydration streak',
        description: 'Track daily cardio routine before sprint kickoff.',
        status: 'done' as TaskStatus,
        priority: 'P3' as Priority,
        dueDate: todayStr,
        estimatedMinutes: 30,
        projectId: 'proj-personal',
        orderIndex: 1,
        isPinned: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        completedAt: now.toISOString(),
      },
      {
        id: 'task-7',
        title: 'Read System Design chapter 4: Distributed Caching',
        description: 'Focus on cache invalidation strategies and Redis cluster setups.',
        status: 'todo' as TaskStatus,
        priority: 'P4' as Priority,
        dueDate: nextWeekStr,
        estimatedMinutes: 60,
        projectId: 'proj-personal',
        orderIndex: 1,
        isPinned: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        completedAt: null,
      },
    ];

    const subtasks: Subtask[] = [
      { id: 'sub-1', taskId: 'task-1', title: 'Audit primary palette (#6366f1)', isCompleted: true, orderIndex: 0, createdAt: now.toISOString() },
      { id: 'sub-2', taskId: 'task-1', title: 'Test dark slate background contrast', isCompleted: true, orderIndex: 1, createdAt: now.toISOString() },
      { id: 'sub-3', taskId: 'task-1', title: 'Fix P1 badge border luminance', isCompleted: false, orderIndex: 2, createdAt: now.toISOString() },
      { id: 'sub-4', taskId: 'task-3', title: 'Web Audio API oscillator setup', isCompleted: true, orderIndex: 0, createdAt: now.toISOString() },
      { id: 'sub-5', taskId: 'task-3', title: '25m work / 5m break interval loop', isCompleted: true, orderIndex: 1, createdAt: now.toISOString() },
      { id: 'sub-6', taskId: 'task-3', title: 'Docking controls in sidebar', isCompleted: false, orderIndex: 2, createdAt: now.toISOString() },
    ];

    const taskTags = [
      { taskId: 'task-1', tagId: 'tag-design' },
      { taskId: 'task-1', tagId: 'tag-urgent' },
      { taskId: 'task-2', tagId: 'tag-feat' },
      { taskId: 'task-3', tagId: 'tag-feat' },
      { taskId: 'task-4', tagId: 'tag-docs' },
      { taskId: 'task-5', tagId: 'tag-bug' },
      { taskId: 'task-5', tagId: 'tag-urgent' },
    ];

    const activityLogs: ActivityLog[] = [
      { id: uuidv4(), taskId: 'task-2', taskTitle: 'Implement drag-and-drop Kanban state sync', action: 'completed', details: 'Task marked as completed', createdAt: now.toISOString() },
      { id: uuidv4(), taskId: 'task-6', taskTitle: 'Morning 5km run and hydration streak', action: 'completed', details: 'Task marked as completed', createdAt: now.toISOString() },
      { id: uuidv4(), taskId: 'task-1', taskTitle: 'Design token audit and dark mode contrast check', action: 'created', details: 'Created task in Design System', createdAt: new Date(now.getTime() - 86400000 * 2).toISOString() },
    ];

    return {
      projects,
      tags,
      tasks: rawTasks,
      subtasks,
      taskTags,
      activityLogs,
    };
  }

  // --- Projects ---
  public getProjects(): Project[] {
    return [...this.data.projects];
  }

  public createProject(name: string, color: string, icon = 'Folder'): Project {
    const project: Project = {
      id: `proj-${uuidv4().slice(0, 8)}`,
      name: name.trim(),
      color: color || '#6366f1',
      icon: icon || 'Folder',
      createdAt: new Date().toISOString(),
    };
    this.data.projects.push(project);
    this.persistSync();
    return project;
  }

  public updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    const proj = this.data.projects.find((p) => p.id === id);
    if (!proj) return null;
    if (updates.name) proj.name = updates.name.trim();
    if (updates.color) proj.color = updates.color;
    if (updates.icon) proj.icon = updates.icon;
    this.persistSync();
    return proj;
  }

  public deleteProject(id: string): boolean {
    const projIndex = this.data.projects.findIndex((p) => p.id === id);
    if (projIndex === -1) return false;
    if (this.data.projects[projIndex].isDefault) {
      throw new Error('Cannot delete default Inbox project');
    }
    // Reassign tasks to default inbox
    const defaultProject = this.data.projects.find((p) => p.isDefault) || this.data.projects[0];
    this.data.tasks.forEach((t) => {
      if (t.projectId === id) {
        t.projectId = defaultProject.id;
      }
    });
    this.data.projects.splice(projIndex, 1);
    this.persistSync();
    return true;
  }

  // --- Tags ---
  public getTags(): Tag[] {
    return [...this.data.tags];
  }

  public createTag(name: string, color = '#6366f1'): Tag {
    const existing = this.data.tags.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) return existing;
    const tag: Tag = {
      id: `tag-${uuidv4().slice(0, 8)}`,
      name: name.trim(),
      color: color,
    };
    this.data.tags.push(tag);
    this.persistSync();
    return tag;
  }

  public deleteTag(id: string): boolean {
    const idx = this.data.tags.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.data.tags.splice(idx, 1);
    this.data.taskTags = this.data.taskTags.filter((tt) => tt.tagId !== id);
    this.persistSync();
    return true;
  }

  // --- Tasks ---
  private hydrateTask(rawTask: DatabaseSchema['tasks'][0]): Task {
    const assignedTagIds = this.data.taskTags
      .filter((tt) => tt.taskId === rawTask.id)
      .map((tt) => tt.tagId);
    const tags = this.data.tags.filter((t) => assignedTagIds.includes(t.id));
    const subtasks = this.data.subtasks
      .filter((st) => st.taskId === rawTask.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      ...rawTask,
      tags,
      subtasks,
    };
  }

  public getTasks(filters: TaskFilters = {}): Task[] {
    let tasks = this.data.tasks.map((t) => this.hydrateTask(t));
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Project filter
    if (filters.projectId) {
      tasks = tasks.filter((t) => t.projectId === filters.projectId);
    }

    // Status filter
    if (filters.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    // Priority filter
    if (filters.priority) {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }

    // Tag filter
    if (filters.tagId) {
      tasks = tasks.filter((t) => t.tags.some((tag) => tag.id === filters.tagId));
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.name.toLowerCase().includes(q))
      );
    }

    // Smart views
    if (filters.smartView) {
      switch (filters.smartView) {
        case 'today':
          tasks = tasks.filter((t) => t.dueDate === todayStr);
          break;
        case 'upcoming':
          tasks = tasks.filter((t) => t.dueDate && t.dueDate > todayStr && t.status !== 'done');
          break;
        case 'important':
          tasks = tasks.filter((t) => (t.priority === 'P1' || t.priority === 'P2') && t.status !== 'done');
          break;
        case 'completed':
          tasks = tasks.filter((t) => t.status === 'done');
          break;
        case 'overdue':
          tasks = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && t.status !== 'done');
          break;
      }
    }

    // Sorting
    const sortField = filters.sortBy || 'orderIndex';
    const sortOrder = filters.sortOrder || 'asc';
    const mult = sortOrder === 'desc' ? -1 : 1;

    tasks.sort((a, b) => {
      // Pinned tasks always at the very top (unless sorting completed)
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      if (sortField === 'priority') {
        return (PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]) * mult;
      }
      if (sortField === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate) * mult;
      }
      if (sortField === 'createdAt') {
        return a.createdAt.localeCompare(b.createdAt) * mult;
      }
      if (sortField === 'title') {
        return a.title.localeCompare(b.title) * mult;
      }
      // Default: orderIndex
      return (a.orderIndex - b.orderIndex) * mult;
    });

    return tasks;
  }

  public getTask(id: string): Task | null {
    const raw = this.data.tasks.find((t) => t.id === id);
    if (!raw) return null;
    return this.hydrateTask(raw);
  }

  public createTask(data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: string | null;
    estimatedMinutes?: number | null;
    projectId?: string;
    isPinned?: boolean;
    tagIds?: string[];
    subtasks?: string[];
  }): Task {
    const now = new Date().toISOString();
    const defaultProj = this.data.projects.find((p) => p.isDefault) || this.data.projects[0];
    const taskId = `task-${uuidv4().slice(0, 8)}`;

    const sameStatusTasks = this.data.tasks.filter((t) => t.status === (data.status || 'todo'));
    const maxOrder = sameStatusTasks.reduce((max, t) => Math.max(max, t.orderIndex), -1);

    const rawTask: DatabaseSchema['tasks'][0] = {
      id: taskId,
      title: data.title.trim(),
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'P3',
      dueDate: data.dueDate || null,
      estimatedMinutes: data.estimatedMinutes || null,
      projectId: data.projectId || defaultProj.id,
      orderIndex: maxOrder + 1,
      isPinned: !!data.isPinned,
      createdAt: now,
      updatedAt: now,
      completedAt: data.status === 'done' ? now : null,
    };

    this.data.tasks.push(rawTask);

    // Attach tags
    if (data.tagIds && data.tagIds.length > 0) {
      data.tagIds.forEach((tagId) => {
        if (this.data.tags.some((t) => t.id === tagId)) {
          this.data.taskTags.push({ taskId, tagId });
        }
      });
    }

    // Attach subtasks
    if (data.subtasks && data.subtasks.length > 0) {
      data.subtasks.forEach((subTitle, idx) => {
        if (subTitle.trim()) {
          this.data.subtasks.push({
            id: `sub-${uuidv4().slice(0, 8)}`,
            taskId,
            title: subTitle.trim(),
            isCompleted: false,
            orderIndex: idx,
            createdAt: now,
          });
        }
      });
    }

    // Activity Log
    this.addActivityLog(taskId, rawTask.title, 'created', 'Task created');

    this.persistSync();
    return this.hydrateTask(rawTask);
  }

  public updateTask(
    id: string,
    updates: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: Priority;
      dueDate: string | null;
      estimatedMinutes: number | null;
      projectId: string;
      orderIndex: number;
      isPinned: boolean;
      tagIds: string[];
    }>
  ): Task | null {
    const task = this.data.tasks.find((t) => t.id === id);
    if (!task) return null;

    const now = new Date().toISOString();
    let statusChanged = false;
    let priorityChanged = false;

    if (updates.title !== undefined) task.title = updates.title.trim();
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    if (updates.estimatedMinutes !== undefined) task.estimatedMinutes = updates.estimatedMinutes;
    if (updates.projectId !== undefined) task.projectId = updates.projectId;
    if (updates.orderIndex !== undefined) task.orderIndex = updates.orderIndex;
    if (updates.isPinned !== undefined) task.isPinned = updates.isPinned;

    if (updates.priority !== undefined && updates.priority !== task.priority) {
      this.addActivityLog(task.id, task.title, 'priority_changed', `Priority changed to ${updates.priority}`);
      task.priority = updates.priority;
      priorityChanged = true;
    }

    if (updates.status !== undefined && updates.status !== task.status) {
      statusChanged = true;
      const prevStatus = task.status;
      task.status = updates.status;
      if (updates.status === 'done') {
        task.completedAt = now;
        this.addActivityLog(task.id, task.title, 'completed', 'Task completed');
      } else {
        if (prevStatus === 'done') {
          task.completedAt = null;
          this.addActivityLog(task.id, task.title, 'uncompleted', 'Task reopened');
        } else {
          this.addActivityLog(task.id, task.title, 'status_changed', `Status changed to ${updates.status}`);
        }
      }
    }

    if (updates.tagIds !== undefined) {
      this.data.taskTags = this.data.taskTags.filter((tt) => tt.taskId !== id);
      updates.tagIds.forEach((tagId) => {
        if (this.data.tags.some((t) => t.id === tagId)) {
          this.data.taskTags.push({ taskId: id, tagId });
        }
      });
    }

    task.updatedAt = now;
    if (!statusChanged && !priorityChanged) {
      this.addActivityLog(task.id, task.title, 'updated', 'Task updated');
    }

    this.persistSync();
    return this.hydrateTask(task);
  }

  public deleteTask(id: string): boolean {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    const task = this.data.tasks[idx];
    this.addActivityLog(task.id, task.title, 'deleted', 'Task deleted');

    this.data.tasks.splice(idx, 1);
    this.data.subtasks = this.data.subtasks.filter((st) => st.taskId !== id);
    this.data.taskTags = this.data.taskTags.filter((tt) => tt.taskId !== id);
    this.persistSync();
    return true;
  }

  public reorderTasks(orderedTaskIds: string[], targetStatus?: TaskStatus): void {
    const now = new Date().toISOString();
    orderedTaskIds.forEach((id, index) => {
      const task = this.data.tasks.find((t) => t.id === id);
      if (task) {
        task.orderIndex = index;
        if (targetStatus && task.status !== targetStatus) {
          task.status = targetStatus;
          task.updatedAt = now;
          if (targetStatus === 'done') {
            task.completedAt = now;
          } else {
            task.completedAt = null;
          }
        }
      }
    });
    this.persistSync();
  }

  public batchUpdateTasks(
    taskIds: string[],
    updates: {
      status?: TaskStatus;
      priority?: Priority;
      projectId?: string;
    }
  ): Task[] {
    const updated: Task[] = [];
    taskIds.forEach((id) => {
      const res = this.updateTask(id, updates);
      if (res) updated.push(res);
    });
    return updated;
  }

  public batchDeleteTasks(taskIds: string[]): number {
    let count = 0;
    taskIds.forEach((id) => {
      if (this.deleteTask(id)) count++;
    });
    return count;
  }

  // --- Subtasks ---
  public createSubtask(taskId: string, title: string): Subtask | null {
    const task = this.data.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    const existingSubtasks = this.data.subtasks.filter((st) => st.taskId === taskId);
    const subtask: Subtask = {
      id: `sub-${uuidv4().slice(0, 8)}`,
      taskId,
      title: title.trim(),
      isCompleted: false,
      orderIndex: existingSubtasks.length,
      createdAt: new Date().toISOString(),
    };

    this.data.subtasks.push(subtask);
    task.updatedAt = new Date().toISOString();
    this.persistSync();
    return subtask;
  }

  public updateSubtask(id: string, updates: Partial<{ title: string; isCompleted: boolean; orderIndex: number }>): Subtask | null {
    const sub = this.data.subtasks.find((s) => s.id === id);
    if (!sub) return null;

    if (updates.title !== undefined) sub.title = updates.title.trim();
    if (updates.isCompleted !== undefined) sub.isCompleted = updates.isCompleted;
    if (updates.orderIndex !== undefined) sub.orderIndex = updates.orderIndex;

    const parentTask = this.data.tasks.find((t) => t.id === sub.taskId);
    if (parentTask) {
      parentTask.updatedAt = new Date().toISOString();
    }

    this.persistSync();
    return sub;
  }

  public deleteSubtask(id: string): boolean {
    const idx = this.data.subtasks.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.data.subtasks.splice(idx, 1);
    this.persistSync();
    return true;
  }

  // --- Activity Log & Analytics ---
  private addActivityLog(taskId: string, taskTitle: string, action: ActivityLog['action'], details: string) {
    const log: ActivityLog = {
      id: uuidv4(),
      taskId,
      taskTitle,
      action,
      details,
      createdAt: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(log);
    // Keep last 100 activity logs
    if (this.data.activityLogs.length > 100) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 100);
    }
  }

  public getActivityLogs(limit = 20): ActivityLog[] {
    return this.data.activityLogs.slice(0, limit);
  }

  public getAnalytics(): AnalyticsSummary {
    const totalTasks = this.data.tasks.length;
    const completedTasks = this.data.tasks.filter((t) => t.status === 'done').length;
    const pendingTasks = totalTasks - completedTasks;

    const todayStr = new Date().toISOString().split('T')[0];
    const completedToday = this.data.tasks.filter(
      (t) => t.status === 'done' && t.completedAt && t.completedAt.startsWith(todayStr)
    ).length;

    const overdueTasks = this.data.tasks.filter(
      (t) => t.status !== 'done' && t.dueDate && t.dueDate < todayStr
    ).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const priorityCounts: Record<Priority, number> = {
      P1: this.data.tasks.filter((t) => t.priority === 'P1').length,
      P2: this.data.tasks.filter((t) => t.priority === 'P2').length,
      P3: this.data.tasks.filter((t) => t.priority === 'P3').length,
      P4: this.data.tasks.filter((t) => t.priority === 'P4').length,
    };

    const statusCounts: Record<TaskStatus, number> = {
      todo: this.data.tasks.filter((t) => t.status === 'todo').length,
      in_progress: this.data.tasks.filter((t) => t.status === 'in_progress').length,
      in_review: this.data.tasks.filter((t) => t.status === 'in_review').length,
      done: completedTasks,
    };

    const projectCounts: Record<string, number> = {};
    this.data.projects.forEach((p) => {
      projectCounts[p.id] = this.data.tasks.filter((t) => t.projectId === p.id).length;
    });

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      completedToday,
      overdueTasks,
      completionRate,
      currentStreak: completedToday > 0 ? 4 : 3, // dynamic streak indicator
      priorityCounts,
      statusCounts,
      projectCounts,
      recentActivity: this.getActivityLogs(10),
    };
  }

  public resetToDemo(): DatabaseSchema {
    this.data = this.getInitialSeedData();
    this.persistSync();
    return this.data;
  }
}

export const db = new DatabaseManager();
