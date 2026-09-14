import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const tagsRouter = Router();

// GET /api/tags
tagsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const tags = db.getTags();
    res.json({ success: true, count: tags.length, data: tags });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tags
tagsRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }
    const tag = db.createTag(name, color);
    res.status(201).json({ success: true, data: tag });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tags/:id
tagsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const success = db.deleteTag(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }
    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
