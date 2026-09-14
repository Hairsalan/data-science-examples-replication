import {
  Task,
  Project,
  Tag,
  Subtask,
  TaskFilters,
  AnalyticsSummary,
  Priority,
  TaskStatus,
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Tasks
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.tagId) params.append('tagId', filters.tagId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.smartView) params.append('smartView', filters.smartView);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchJson<{ success: boolean; data: Task[] }>(`${API_BASE}/tasks${query}`);
    return res.data;
  },

  async getTask(id: string): Promise<Task> {
    const res = await fetchJson<{ success: boolean; data: Task }>(`${API_BASE}/tasks/${id}`);
    return res.data;
  },

  async createTask(data: {
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
  }): Promise<Task> {
    const res = await fetchJson<{ success: boolean; data: Task }>(`${API_BASE}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateTask(
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
  ): Promise<Task> {
    const res = await fetchJson<{ success: boolean; data: Task }>(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  async deleteTask(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async reorderTasks(orderedTaskIds: string[], targetStatus?: TaskStatus): Promise<void> {
    await fetchJson<{ success: boolean }>(`${API_BASE}/tasks/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orderedTaskIds, targetStatus }),
    });
  },

  async batchUpdate(
    taskIds: string[],
    updates: { status?: TaskStatus; priority?: Priority; projectId?: string }
  ): Promise<Task[]> {
    const res = await fetchJson<{ success: boolean; data: Task[] }>(`${API_BASE}/tasks/batch`, {
      method: 'POST',
      body: JSON.stringify({ action: 'update', taskIds, updates }),
    });
    return res.data;
  },

  async batchDelete(taskIds: string[]): Promise<number> {
    const res = await fetchJson<{ success: boolean; deletedCount: number }>(`${API_BASE}/tasks/batch`, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', taskIds }),
    });
    return res.deletedCount;
  },

  // Subtasks
  async addSubtask(taskId: string, title: string): Promise<Subtask> {
    const res = await fetchJson<{ success: boolean; data: Subtask }>(`${API_BASE}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return res.data;
  },

  async updateSubtask(
    id: string,
    updates: Partial<{ title: string; isCompleted: boolean; orderIndex: number }>
  ): Promise<Subtask> {
    const res = await fetchJson<{ success: boolean; data: Subtask }>(`${API_BASE}/subtasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  async deleteSubtask(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`${API_BASE}/subtasks/${id}`, {
      method: 'DELETE',
    });
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetchJson<{ success: boolean; data: Project[] }>(`${API_BASE}/projects`);
    return res.data;
  },

  async createProject(name: string, color: string, icon?: string): Promise<Project> {
    const res = await fetchJson<{ success: boolean; data: Project }>(`${API_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify({ name, color, icon }),
    });
    return res.data;
  },

  async deleteProject(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
  },

  // Tags
  async getTags(): Promise<Tag[]> {
    const res = await fetchJson<{ success: boolean; data: Tag[] }>(`${API_BASE}/tags`);
    return res.data;
  },

  async createTag(name: string, color: string): Promise<Tag> {
    const res = await fetchJson<{ success: boolean; data: Tag }>(`${API_BASE}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    return res.data;
  },

  async deleteTag(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`${API_BASE}/tags/${id}`, {
      method: 'DELETE',
    });
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsSummary> {
    const res = await fetchJson<{ success: boolean; data: AnalyticsSummary }>(`${API_BASE}/analytics`);
    return res.data;
  },

  async resetToDemo(): Promise<void> {
    await fetchJson<{ success: boolean }>(`${API_BASE}/analytics/reset-demo`, {
      method: 'POST',
    });
  },
};
