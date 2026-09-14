# Apex Flow — Modern End-to-End Dynamic Todo Application

Apex Flow is a production-grade, full-stack productivity orchestrator designed for high-performance workflows. Built with an industry-best UX inspired by **Linear**, **Things 3**, and **Todoist**, it combines keyboard-first speed, fluid animations, audio-tactile feedback, multi-view task management, an integrated Pomodoro focus timer, and a robust persistent backend.

---

## ✨ Features & UX Delights

### 🖥️ Multi-View Dynamic Workspaces
- **List View**: Grouped collapsible sections (*In Progress*, *To Do*, *In Review*, *Completed*) with drag-and-drop reordering, inline completion, priority badges, project indicators, due date alerts, and subtask progress indicators.
- **Kanban Board View**: 4 interactive columns with fluid drag-and-drop state syncing, column task counters, and celebratory confetti bursts when moving tasks to "Done".
- **Calendar & Timeline View**: Smart agenda organizing tasks by *Overdue*, *Scheduled For Today*, *Tomorrow*, *Later This Week*, and *Upcoming*.

### ⚡ Keyboard-First Speed & Command Palette
- **Command Palette (`Ctrl+K` / `Cmd+K`)**: Instant modal to search tasks, jump across projects, filter smart views, create tasks, and switch themes without touching the mouse.
- **Keyboard Shortcuts**:
  - `N` or `C`: Quick-create new task
  - `/`: Focus search bar
  - `1`: Switch to List View
  - `2`: Switch to Kanban Board
  - `3`: Switch to Calendar Timeline
  - `?`: Open keyboard shortcuts cheat sheet
  - `Esc`: Close modals or deselect tasks

### ⏱️ Integrated Pomodoro Focus Engine
- Docked/floating focus timer supporting **25m Work**, **5m Short Break**, and **15m Long Break** intervals.
- Connect any task directly to the timer to stay in flow.
- Features synthesized gentle bell tones via the Web Audio API on session completion.

### 🎨 Audio-Tactile Feedback & Visual Polish
- **Harmonic Chimes**: Subtle, pleasant harmonic chime when checking off tasks (synthesized directly in-browser using Web Audio API; zero external audio dependencies).
- **Celebratory Confetti**: Particle bursts on checking off high-priority tasks (P1/P2) or dropping cards into Done.
- **Dark & Light Mode**: Deep zinc dark mode (`zinc-950`/`zinc-900`) and clean crisp light mode.
- **Sound Toggle**: Quick one-click mute/unmute control in the sidebar.

### 📦 Batch Operations & Smart Views
- **Floating Batch Bar**: Multi-select tasks using checkboxes to batch complete, move status, change priority, or delete.
- **Smart Views**: Inbox, Today, Upcoming, Important (P1/P2), and Completed.
- **Custom Projects & Tags**: Color-coded project spaces and tag filters.
- **Productivity Dashboard**: Streak tracking (🔥), velocity rate, priority distribution chart, recent activity timeline, and JSON/CSV data backup & export.

---

## 🛠️ Architecture & Tech Stack

```
fullstack-test/
├── client/                     # Frontend (SPA)
│   ├── src/
│   │   ├── components/         # Sidebar, Header, ListView, KanbanView, CalendarView, Modals
│   │   ├── services/api.ts     # Typed REST API client
│   │   ├── utils/audio.ts      # Web Audio API synthesizer
│   │   ├── types/index.ts      # Shared TypeScript interfaces
│   │   ├── App.tsx             # State orchestrator & keyboard listeners
│   │   └── index.css           # Tailwind styles & theme variables
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── server/                     # Backend REST API
│   ├── src/
│   │   ├── db/database.ts      # Relational DB manager & seed data
│   │   ├── routes/             # Tasks, Subtasks, Projects, Tags, Analytics
│   │   ├── app.ts              # Express application setup & middleware
│   │   └── index.ts            # Server entrypoint (Port 5000)
│   ├── tests/api.test.ts       # Automated integration test suite
│   ├── data/todo-db.json       # Persistent database file
│   └── package.json
└── package.json                # Workspace root orchestrator
```

### Stack Details
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Canvas Confetti, Vite.
- **Backend**: Node.js (v24), Express 4, TypeScript (`tsx`), CORS.
- **Database**: Relational SQLite-compatible persistent storage with automatic seeding, atomic writes, and cascading integrity.
- **Testing**: Node.js native test runner (`node:test`) with end-to-end API coverage.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# In the root folder (fullstack-test):
npm run install:all
```

### 2. Start Development Servers
Run both backend and frontend concurrently with a single command:
```bash
npm run dev
```
- Frontend will be available at: **http://localhost:5173**
- Backend API will run at: **http://localhost:5000** (proxied automatically through Vite)

### 3. Run Automated Tests
```bash
npm test
```
Executes the comprehensive backend test suite verifying CRUD, filtering, reordering, batching, subtasks, and analytics.

### 4. Build for Production
```bash
npm run build
```
Typechecks and compiles both `client/` and `server/`.
