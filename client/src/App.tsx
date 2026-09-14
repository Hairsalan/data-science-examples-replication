import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { Task, Project, Tag, ViewMode, SmartView, TaskFilters, TaskStatus, Priority, AnalyticsSummary } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ListView } from './components/views/ListView';
import { KanbanView } from './components/views/KanbanView';
import { CalendarView } from './components/views/CalendarView';
import { TaskModal } from './components/tasks/TaskModal';
import { BatchActionBar } from './components/tasks/BatchActionBar';
import { PomodoroTimer } from './components/pomodoro/PomodoroTimer';
import { CommandPalette } from './components/modals/CommandPalette';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { StatsModal } from './components/modals/StatsModal';
import { soundEffects } from './utils/audio';
import confetti from 'canvas-confetti';

export const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || true;
  });

  // Navigation & View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentSmartView, setCurrentSmartView] = useState<SmartView>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TaskFilters>({
    sortBy: 'orderIndex',
    sortOrder: 'asc',
  });

  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selection & Active task state
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [activePomodoroTask, setActivePomodoroTask] = useState<Task | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    soundEffects.playTap();
    setDarkMode(!darkMode);
  };

  // Data fetching
  const loadData = useCallback(async () => {
    try {
      const activeFilters: TaskFilters = {
        ...filters,
        search: searchQuery,
      };

      if (selectedProjectId) {
        activeFilters.projectId = selectedProjectId;
      } else if (selectedTagId) {
        activeFilters.tagId = selectedTagId;
      } else {
        activeFilters.smartView = currentSmartView;
      }

      const [tasksRes, projectsRes, tagsRes, analyticsRes] = await Promise.all([
        api.getTasks(activeFilters),
        api.getProjects(),
        api.getTags(),
        api.getAnalytics(),
      ]);

      setTasks(tasksRes);
      setProjects(projectsRes);
      setTags(tagsRes);
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery, selectedProjectId, selectedTagId, currentSmartView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Cmd+K or Ctrl+K opens Command Palette anywhere
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        soundEffects.playTap();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Escape closes modals or clears selections
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        else if (isShortcutsModalOpen) setIsShortcutsModalOpen(false);
        else if (isStatsModalOpen) setIsStatsModalOpen(false);
        else if (isTaskModalOpen) setIsTaskModalOpen(false);
        else if (selectedTaskIds.length > 0) setSelectedTaskIds([]);
        return;
      }

      // If user is currently typing in an input/textarea, ignore single-key shortcuts
      if (isInput) return;

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchEl = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchEl?.focus();
      } else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        soundEffects.playTap();
        setEditingTask(null);
        setIsTaskModalOpen(true);
      } else if (e.key === '1') {
        e.preventDefault();
        soundEffects.playTap();
        setViewMode('list');
      } else if (e.key === '2') {
        e.preventDefault();
        soundEffects.playTap();
        setViewMode('kanban');
      } else if (e.key === '3') {
        e.preventDefault();
        soundEffects.playTap();
        setViewMode('calendar');
      } else if (e.key === '?') {
        e.preventDefault();
        soundEffects.playTap();
        setIsShortcutsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isShortcutsModalOpen, isStatsModalOpen, isTaskModalOpen, selectedTaskIds]);

  // Task Operations
  const handleToggleCompleteTask = async (task: Task) => {
    const isNowDone = task.status !== 'done';
    const newStatus: TaskStatus = isNowDone ? 'done' : 'todo';

    if (isNowDone) {
      soundEffects.playComplete();
      if (task.priority === 'P1' || task.priority === 'P2') {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
        });
      }
    } else {
      soundEffects.playTap();
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await api.updateTask(task.id, { status: newStatus });
      const updatedAnalytics = await api.getAnalytics();
      setAnalytics(updatedAnalytics);
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  const handleTogglePinTask = async (task: Task) => {
    const nextPinned = !task.isPinned;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isPinned: nextPinned } : t))
    );
    try {
      await api.updateTask(task.id, { isPinned: nextPinned });
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  const handleEditTask = (task: Task) => {
    soundEffects.playTap();
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId));
    if (activePomodoroTask?.id === taskId) {
      setActivePomodoroTask(null);
    }
    try {
      await api.deleteTask(taskId);
      const updatedAnalytics = await api.getAnalytics();
      setAnalytics(updatedAnalytics);
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  const handleSaveTask = async (taskData: any) => {
    if (taskData.id) {
      // Update
      const updated = await api.updateTask(taskData.id, taskData);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      // Create
      const created = await api.createTask(taskData);
      setTasks((prev) => [created, ...prev]);
    }
    const updatedAnalytics = await api.getAnalytics();
    setAnalytics(updatedAnalytics);
  };

  const handleReorderTasks = async (orderedIds: string[], targetStatus?: TaskStatus) => {
    // Optimistic local order
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const nextTasks: Task[] = [];
    orderedIds.forEach((id) => {
      const t = taskMap.get(id);
      if (t) {
        if (targetStatus && t.status !== targetStatus) {
          nextTasks.push({ ...t, status: targetStatus });
        } else {
          nextTasks.push(t);
        }
      }
    });
    tasks.forEach((t) => {
      if (!orderedIds.includes(t.id)) nextTasks.push(t);
    });

    setTasks(nextTasks);
    await api.reorderTasks(orderedIds, targetStatus);
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.updateTask(taskId, { status: newStatus });
      const updatedAnalytics = await api.getAnalytics();
      setAnalytics(updatedAnalytics);
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  // Selection toggle
  const handleToggleSelectTask = (taskId: string, _e?: React.MouseEvent) => {
    soundEffects.playTap();
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Batch operations
  const handleBatchUpdateStatus = async (status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (selectedTaskIds.includes(t.id) ? { ...t, status } : t))
    );
    await api.batchUpdate(selectedTaskIds, { status });
    setSelectedTaskIds([]);
    const updatedAnalytics = await api.getAnalytics();
    setAnalytics(updatedAnalytics);
  };

  const handleBatchUpdatePriority = async (priority: Priority) => {
    setTasks((prev) =>
      prev.map((t) => (selectedTaskIds.includes(t.id) ? { ...t, priority } : t))
    );
    await api.batchUpdate(selectedTaskIds, { priority });
    setSelectedTaskIds([]);
  };

  const handleBatchDelete = async () => {
    setTasks((prev) => prev.filter((t) => !selectedTaskIds.includes(t.id)));
    await api.batchDelete(selectedTaskIds);
    setSelectedTaskIds([]);
    const updatedAnalytics = await api.getAnalytics();
    setAnalytics(updatedAnalytics);
  };

  // Projects & Tags CRUD
  const handleCreateProject = async (name: string, color: string, icon?: string) => {
    const created = await api.createProject(name, color, icon);
    setProjects((prev) => [...prev, created]);
    setSelectedProjectId(created.id);
  };

  const handleCreateTag = async (name: string, color: string) => {
    const created = await api.createTag(name, color);
    setTags((prev) => [...prev, created]);
  };

  const handleResetDemo = async () => {
    soundEffects.playTap();
    await api.resetToDemo();
    await loadData();
    confetti({ particleCount: 80, spread: 80 });
  };

  // Subtasks API bridges
  const handleAddSubtask = async (taskId: string, title: string) => {
    return await api.addSubtask(taskId, title);
  };

  const handleUpdateSubtask = async (id: string, updates: any) => {
    await api.updateSubtask(id, updates);
  };

  const handleDeleteSubtask = async (id: string) => {
    await api.deleteSubtask(id);
  };

  // Compute title for the header
  const getHeaderTitle = () => {
    if (selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      return proj ? proj.name : 'Project';
    }
    if (selectedTagId) {
      const tag = tags.find((t) => t.id === selectedTagId);
      return tag ? `#${tag.name}` : 'Tag';
    }
    switch (currentSmartView) {
      case 'today':
        return 'Today';
      case 'upcoming':
        return 'Upcoming';
      case 'important':
        return 'Important Tasks';
      case 'completed':
        return 'Completed Tasks';
      default:
        return 'All Tasks';
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const completedTodayCount = todayTasks.filter((t) => t.status === 'done').length;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentSmartView={currentSmartView}
        selectedProjectId={selectedProjectId}
        selectedTagId={selectedTagId}
        projects={projects}
        tags={tags}
        onSelectSmartView={(sv) => {
          setSelectedProjectId(null);
          setSelectedTagId(null);
          setCurrentSmartView(sv);
        }}
        onSelectProject={(pId) => {
          setSelectedTagId(null);
          setSelectedProjectId(pId);
        }}
        onSelectTag={(tId) => {
          setSelectedProjectId(null);
          setSelectedTagId(tId);
        }}
        onCreateProject={handleCreateProject}
        onCreateTag={handleCreateTag}
        onResetDemo={handleResetDemo}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        streak={analytics?.currentStreak || 3}
        completedTodayCount={completedTodayCount}
        totalTodayCount={todayTasks.length}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Header
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNewTaskModal={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          onOpenStatsModal={() => setIsStatsModalOpen(true)}
          filters={filters}
          onUpdateFilters={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
          title={getHeaderTitle()}
          taskCount={tasks.length}
        />

        {/* Content View Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl w-full mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading tasks...</span>
            </div>
          ) : viewMode === 'list' ? (
            <ListView
              tasks={tasks}
              projects={projects}
              selectedTaskIds={selectedTaskIds}
              onToggleSelectTask={handleToggleSelectTask}
              onToggleCompleteTask={handleToggleCompleteTask}
              onTogglePinTask={handleTogglePinTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onStartPomodoro={setActivePomodoroTask}
              onReorderTasks={handleReorderTasks}
              onQuickAddTask={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
            />
          ) : viewMode === 'kanban' ? (
            <KanbanView
              tasks={tasks}
              projects={projects}
              onEditTask={handleEditTask}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onStartPomodoro={setActivePomodoroTask}
              onQuickAddTaskToStatus={(status) => {
                setEditingTask({
                  id: '',
                  title: '',
                  description: '',
                  status,
                  priority: 'P3',
                  dueDate: null,
                  projectId: selectedProjectId || projects[0]?.id || '',
                  orderIndex: 0,
                  isPinned: false,
                  createdAt: '',
                  updatedAt: '',
                  completedAt: null,
                  tags: [],
                  subtasks: [],
                });
                setIsTaskModalOpen(true);
              }}
            />
          ) : (
            <CalendarView
              tasks={tasks}
              projects={projects}
              selectedTaskIds={selectedTaskIds}
              onToggleSelectTask={handleToggleSelectTask}
              onToggleCompleteTask={handleToggleCompleteTask}
              onTogglePinTask={handleTogglePinTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onStartPomodoro={setActivePomodoroTask}
            />
          )}
        </main>
      </div>

      {/* Floating Batch Actions Bar */}
      <BatchActionBar
        selectedCount={selectedTaskIds.length}
        onClearSelection={() => setSelectedTaskIds([])}
        onBatchUpdateStatus={handleBatchUpdateStatus}
        onBatchUpdatePriority={handleBatchUpdatePriority}
        onBatchDelete={handleBatchDelete}
      />

      {/* Docked / Floating Pomodoro Timer */}
      <PomodoroTimer
        activeTask={activePomodoroTask}
        onClearActiveTask={() => setActivePomodoroTask(null)}
        onCompleteTask={handleToggleCompleteTask}
      />

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={editingTask}
        projects={projects}
        tags={tags}
        onSaveTask={handleSaveTask}
        onAddSubtask={handleAddSubtask}
        onUpdateSubtask={handleUpdateSubtask}
        onDeleteSubtask={handleDeleteSubtask}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tasks={tasks}
        onSelectTask={handleEditTask}
        onNewTask={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        onChangeView={setViewMode}
        onSelectSmartView={(sv) => {
          setSelectedProjectId(null);
          setSelectedTagId(null);
          setCurrentSmartView(sv);
        }}
        onToggleTheme={toggleDarkMode}
        darkMode={darkMode}
      />

      {/* Keyboard Shortcuts Cheatsheet (?) */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Productivity Stats Dashboard */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        analytics={analytics}
        tasks={tasks}
      />
    </div>
  );
};

export default App;
