import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { tasksRouter } from './routes/tasks.js';
import { subtasksRouter } from './routes/subtasks.js';
import { projectsRouter } from './routes/projects.js';
import { tagsRouter } from './routes/tags.js';
import { analyticsRouter } from './routes/analytics.js';

export const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/tasks', tasksRouter);
app.use('/api', subtasksRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/analytics', analyticsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

export default app;
