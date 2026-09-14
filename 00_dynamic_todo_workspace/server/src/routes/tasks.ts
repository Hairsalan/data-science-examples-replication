import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { Priority, TaskFilters, TaskStatus } from '../types.js';

export const tasksRouter = Router();

// GET /api/tasks (with filters & smart views)
tasksRouter.get('/', (req: Request, res: Response) => {
  try {
    const filters: TaskFilters = {
      projectId: req.query.projectId as string,
      status: req.query.status as TaskStatus,
      priority: req.query.priority as Priority,
      tagId: req.query.tagId as string,
      search: req.query.search as string,
      smartView: req.query.smartView as TaskFilters['smartView'],
      sortBy: req.query.sortBy as TaskFilters['sortBy'],
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
    };

    const tasks = db.getTasks(filters);
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tasks/:id
tasksRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const task = db.getTask(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tasks (create task)
tasksRouter.post('/', (req: Request, res: Response) => {
  try {
    const { title, description, status, priority, dueDate, estimatedMinutes, projectId, isPinned, tagIds, subtasks } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Task title is required' });
    }

    const newTask = db.createTask({
      title,
      description,
      status,
      priority,
      dueDate,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      projectId,
      isPinned: Boolean(isPinned),
      tagIds,
      subtasks,
    });

    res.status(201).json({ success: true, data: newTask });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/tasks/:id (update task)
tasksRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = db.updateTask(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const success = db.deleteTask(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tasks/reorder
tasksRouter.post('/reorder', (req: Request, res: Response) => {
  try {
    const { orderedTaskIds, targetStatus } = req.body;
    if (!Array.isArray(orderedTaskIds)) {
      return res.status(400).json({ success: false, error: 'orderedTaskIds must be an array of IDs' });
    }
    db.reorderTasks(orderedTaskIds, targetStatus);
    res.json({ success: true, message: 'Tasks reordered successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tasks/batch
tasksRouter.post('/batch', (req: Request, res: Response) => {
  try {
    const { action, taskIds, updates } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, error: 'taskIds array is required' });
    }

    if (action === 'delete') {
      const count = db.batchDeleteTasks(taskIds);
      return res.json({ success: true, deletedCount: count });
    }

    if (action === 'update' && updates) {
      const updated = db.batchUpdateTasks(taskIds, updates);
      return res.json({ success: true, updatedCount: updated.length, data: updated });
    }

    res.status(400).json({ success: false, error: 'Invalid batch action' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
