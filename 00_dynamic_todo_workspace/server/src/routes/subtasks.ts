import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const subtasksRouter = Router();

// POST /api/tasks/:taskId/subtasks
subtasksRouter.post('/tasks/:taskId/subtasks', (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Subtask title is required' });
    }

    const taskId = req.params.taskId as string;
    const subtask = db.createSubtask(taskId, title);
    if (!subtask) {
      return res.status(404).json({ success: false, error: 'Parent task not found' });
    }

    res.status(201).json({ success: true, data: subtask });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/subtasks/:id
subtasksRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = db.updateSubtask(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Subtask not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/subtasks/:id
subtasksRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const success = db.deleteSubtask(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Subtask not found' });
    }
    res.json({ success: true, message: 'Subtask deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
