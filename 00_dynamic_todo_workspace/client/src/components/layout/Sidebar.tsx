import React, { useState } from 'react';
import {
  Inbox,
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  Folder,
  Plus,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Flame,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Palette,
  Rocket,
  User,
} from 'lucide-react';
import { Project, Tag, SmartView } from '../../types';
import { soundEffects } from '../../utils/audio';

interface SidebarProps {
  currentSmartView: SmartView;
  selectedProjectId: string | null;
  selectedTagId: string | null;
  projects: Project[];
  tags: Tag[];
  onSelectSmartView: (view: SmartView) => void;
  onSelectProject: (projectId: string | null) => void;
  onSelectTag: (tagId: string | null) => void;
  onCreateProject: (name: string, color: string, icon?: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<void>;
  onResetDemo: () => Promise<void>;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  streak: number;
  completedTodayCount: number;
  totalTodayCount: number;
}

const PROJECT_ICONS: Record<string, React.ReactNode> = {
  Inbox: <Inbox className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  Palette: <Palette className="w-4 h-4" />,
  Rocket: <Rocket className="w-4 h-4" />,
  User: <User className="w-4 h-4" />,
  Folder: <Folder className="w-4 h-4" />,
};

const COLOR_OPTIONS = ['#6366f1', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

export const Sidebar: React.FC<SidebarProps> = ({
  currentSmartView,
  selectedProjectId,
  selectedTagId,
  projects,
  tags,
  onSelectSmartView,
  onSelectProject,
  onSelectTag,
  onCreateProject,
  onCreateTag,
  onResetDemo,
  darkMode,
  onToggleDarkMode,
  streak,
  completedTodayCount,
  totalTodayCount,
}) => {
  const [isSoundMuted, setIsSoundMuted] = useState(soundEffects.isMuted());
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(COLOR_OPTIONS[0]);

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLOR_OPTIONS[2]);

  const handleToggleSound = () => {
    const isNowActive = soundEffects.toggleSound();
    setIsSoundMuted(!isNowActive);
    if (isNowActive) {
      soundEffects.playTap();
    }
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await onCreateProject(newProjectName.trim(), newProjectColor);
    setNewProjectName('');
    setIsAddingProject(false);
    soundEffects.playTap();
  };

  const handleCreateTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    await onCreateTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setIsAddingTag(false);
    soundEffects.playTap();
  };

  const smartViewItems: Array<{ id: SmartView; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Tasks', icon: <Layers className="w-4 h-4" /> },
    { id: 'today', label: 'Today', icon: <Calendar className="w-4 h-4" /> },
    { id: 'upcoming', label: 'Upcoming', icon: <Clock className="w-4 h-4" /> },
    { id: 'important', label: 'Important', icon: <Star className="w-4 h-4" /> },
    { id: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-72 h-screen flex flex-col border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/60 backdrop-blur-md select-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              Apex Flow
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/20">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Dynamic Task Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Smart Views */}
        <div>
          <div className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Smart Views
          </div>
          <nav className="space-y-0.5">
            {smartViewItems.map((item) => {
              const isActive = !selectedProjectId && !selectedTagId && currentSmartView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    soundEffects.playTap();
                    onSelectSmartView(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-brand-500' : 'text-zinc-400 dark:text-zinc-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'today' && totalTodayCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                      {completedTodayCount}/{totalTodayCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Projects / Spaces */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            <button
              onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
              className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              {isProjectsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>Projects</span>
            </button>
            <button
              onClick={() => setIsAddingProject(!isAddingProject)}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              title="Add Project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isProjectsExpanded && (
            <div className="space-y-0.5">
              {projects.map((p) => {
                const isActive = selectedProjectId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      soundEffects.playTap();
                      onSelectProject(p.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-zinc-400 dark:text-zinc-500" style={{ color: p.color }}>
                        {PROJECT_ICONS[p.icon] || <Folder className="w-4 h-4" />}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    {p.isDefault && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-600">default</span>
                    )}
                  </button>
                );
              })}

              {isAddingProject && (
                <form onSubmit={handleCreateProjectSubmit} className="mt-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2">
                  <input
                    type="text"
                    placeholder="Project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {COLOR_OPTIONS.slice(0, 5).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewProjectColor(color)}
                          className={`w-4 h-4 rounded-full transition-transform ${
                            newProjectColor === color ? 'scale-125 ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-zinc-900' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingProject(false)}
                        className="px-2 py-0.5 text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-0.5 text-[11px] bg-brand-500 hover:bg-brand-600 text-white rounded font-medium shadow-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            <button
              onClick={() => setIsTagsExpanded(!isTagsExpanded)}
              className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              {isTagsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>Tags</span>
            </button>
            <button
              onClick={() => setIsAddingTag(!isAddingTag)}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              title="Add Tag"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isTagsExpanded && (
            <div className="flex flex-wrap gap-1.5 px-2">
              {tags.map((tag) => {
                const isActive = selectedTagId === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      soundEffects.playTap();
                      onSelectTag(isActive ? null : tag.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                        : 'bg-zinc-200/70 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300/80 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    #{tag.name}
                  </button>
                );
              })}

              {isAddingTag && (
                <form onSubmit={handleCreateTagSubmit} className="w-full mt-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2">
                  <input
                    type="text"
                    placeholder="Tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-brand-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {COLOR_OPTIONS.slice(2, 7).map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`w-3.5 h-3.5 rounded-full transition-transform ${
                            newTagColor === color ? 'scale-125 ring-2 ring-brand-500' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="px-2 py-0.5 text-[11px] bg-brand-500 text-white rounded font-medium"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Streak & Focus Widget */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-bounce" />
              <span>{streak}-Day Streak!</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              {completedTodayCount} done
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${totalTodayCount > 0 ? Math.min(100, Math.round((completedTodayCount / Math.max(1, totalTodayCount)) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleSound}
            className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            title={isSoundMuted ? 'Unmute UI Audio' : 'Mute UI Audio'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-brand-500" />}
          </button>
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>
        </div>

        <button
          onClick={() => {
            if (confirm('Reset database to demo data?')) {
              onResetDemo();
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          title="Reset Demo Data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>
    </aside>
  );
};
