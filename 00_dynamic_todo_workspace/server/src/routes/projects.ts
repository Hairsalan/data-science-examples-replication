import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const projectsRouter = Router();

// GET /api/projects
projectsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const projects = db.getProjects();
    res.json({ success: true, count: projects.length, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/projects
projectsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }
    const project = db.createProject(name, color, icon);
    res.status(201).json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/projects/:id
projectsRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = db.updateProject(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/projects/:id
projectsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    db.deleteProject(id);
    res.json({ success: true, message: 'Project deleted and tasks moved to Inbox' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
