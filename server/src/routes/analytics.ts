import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const analyticsRouter = Router();

// GET /api/analytics
analyticsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const summary = db.getAnalytics();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/analytics/reset-demo
analyticsRouter.post('/reset-demo', (_req: Request, res: Response) => {
  try {
    const reset = db.resetToDemo();
    res.json({ success: true, message: 'Database reset to demo state', data: reset });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
