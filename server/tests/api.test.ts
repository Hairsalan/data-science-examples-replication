import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { app } from '../src/app.js';
import http from 'node:http';

const server = http.createServer(app);
let baseUrl: string;

function request(method: string, path: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const postData = body ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = http.request(url, options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ status: res.statusCode || 200, body: parsed });
        } catch {
          resolve({ status: res.statusCode || 200, body: rawData });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

describe('Full-Stack Todo Backend API Tests', () => {
  before(() => {
    return new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(() => {
    return new Promise<void>((resolve) => {
      server.close(() => {
        server.closeAllConnections();
        resolve();
      });
    });
  });

  it('GET /api/health returns status ok', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  it('GET /api/projects returns seeded projects', async () => {
    const res = await request('GET', '/api/projects');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.length >= 3);
  });

  it('GET /api/tags returns seeded tags', async () => {
    const res = await request('GET', '/api/tags');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.length >= 4);
  });

  it('GET /api/tasks returns seeded tasks', async () => {
    const res = await request('GET', '/api/tasks');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.length > 0);
  });

  let createdTaskId = '';
  it('POST /api/tasks creates a new task with subtasks and tags', async () => {
    const payload = {
      title: 'Automated Test Task 1',
      description: 'This task is created via test suite',
      status: 'todo',
      priority: 'P1',
      dueDate: '2026-09-15',
      estimatedMinutes: 25,
      subtasks: ['Step 1: Setup', 'Step 2: Verify'],
    };

    const res = await request('POST', '/api/tasks', payload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, 'Automated Test Task 1');
    assert.strictEqual(res.body.data.priority, 'P1');
    assert.strictEqual(res.body.data.subtasks.length, 2);
    createdTaskId = res.body.data.id;
  });

  it('PATCH /api/tasks/:id updates task status and priority', async () => {
    const res = await request('PATCH', `/api/tasks/${createdTaskId}`, {
      status: 'in_progress',
      priority: 'P2',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'in_progress');
    assert.strictEqual(res.body.data.priority, 'P2');
  });

  it('POST /api/tasks/:taskId/subtasks adds a subtask', async () => {
    const res = await request('POST', `/api/tasks/${createdTaskId}/subtasks`, {
      title: 'Step 3: Deploy',
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.title, 'Step 3: Deploy');
  });

  it('POST /api/tasks/batch performs batch status update', async () => {
    const res = await request('POST', '/api/tasks/batch', {
      action: 'update',
      taskIds: [createdTaskId],
      updates: { status: 'done' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.updatedCount, 1);
  });

  it('GET /api/analytics returns correct summary metrics', async () => {
    const res = await request('GET', '/api/analytics');
    assert.strictEqual(res.status, 200);
    assert(typeof res.body.data.totalTasks === 'number');
    assert(typeof res.body.data.completedTasks === 'number');
    assert(typeof res.body.data.completionRate === 'number');
  });

  it('DELETE /api/tasks/:id removes the task', async () => {
    const res = await request('DELETE', `/api/tasks/${createdTaskId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const check = await request('GET', `/api/tasks/${createdTaskId}`);
    assert.strictEqual(check.status, 404);
  });
});
