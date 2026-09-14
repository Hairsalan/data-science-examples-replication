import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, X, Timer, Coffee, ChevronDown, ChevronUp } from 'lucide-react';
import { Task } from '../../types';
import { soundEffects } from '../../utils/audio';

interface PomodoroTimerProps {
  activeTask: Task | null;
  onClearActiveTask: () => void;
  onCompleteTask?: (task: Task) => void;
}

type Mode = 'work' | 'short_break' | 'long_break';

const MODE_DURATIONS: Record<Mode, number> = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  activeTask,
  onClearActiveTask,
  onCompleteTask,
}) => {
  const [mode, setMode] = useState<Mode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.work);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (activeTask) {
      // Whenever a new task is attached, start or reset focus
      setMode('work');
      setTimeLeft(MODE_DURATIONS.work);
      setIsRunning(true);
      setIsMinimized(false);
    }
  }, [activeTask?.id]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleIntervalComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  const handleIntervalComplete = () => {
    soundEffects.playFocusBell();
    if (mode === 'work') {
      setMode('short_break');
      setTimeLeft(MODE_DURATIONS.short_break);
    } else {
      setMode('work');
      setTimeLeft(MODE_DURATIONS.work);
    }
    setIsRunning(false);
  };

  const toggleRunning = () => {
    soundEffects.playTap();
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    soundEffects.playTap();
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[mode]);
  };

  const handleSkip = () => {
    soundEffects.playTap();
    setIsRunning(false);
    if (mode === 'work') {
      setMode('short_break');
      setTimeLeft(MODE_DURATIONS.short_break);
    } else {
      setMode('work');
      setTimeLeft(MODE_DURATIONS.work);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = MODE_DURATIONS[mode];
  const progressPercent = Math.round(((totalDuration - timeLeft) / totalDuration) * 100);

  // If no task attached and minimized/idle, we can show a small activator or float
  return (
    <aside aria-label="Pomodoro Focus Timer" className="fixed bottom-6 right-6 z-40 animate-slideIn">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden min-w-[280px] max-w-sm">
        {/* Top Header */}
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-ping' : 'bg-zinc-400'
              }`}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              {mode === 'work' ? <Timer className="w-3.5 h-3.5 text-amber-500" /> : <Coffee className="w-3.5 h-3.5 text-blue-500" />}
              {mode === 'work' ? 'Focus Session' : 'Break Time'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {activeTask && (
              <button
                onClick={onClearActiveTask}
                className="p-1 rounded text-zinc-400 hover:text-rose-500"
                title="Detach task"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Minimized compact banner */}
        {isMinimized ? (
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {formatTime(timeLeft)}
            </span>
            <button
              onClick={toggleRunning}
              className="p-1 rounded-md bg-brand-500 text-white"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          /* Full expanded view */
          <div className="p-4 space-y-3">
            {/* Active task title if present */}
            {activeTask && (
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between gap-2">
                <div className="truncate">
                  <p className="text-[10px] uppercase font-semibold text-zinc-400">Focusing on</p>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {activeTask.title}
                  </p>
                </div>
                {onCompleteTask && activeTask.status !== 'done' && (
                  <button
                    onClick={() => {
                      soundEffects.playComplete();
                      onCompleteTask(activeTask);
                    }}
                    className="text-[10px] font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 whitespace-nowrap"
                  >
                    Done
                  </button>
                )}
              </div>
            )}

            {/* Big Timer display */}
            <div className="text-center py-1">
              <span className="text-4xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-zinc-100">
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  mode === 'work' ? 'bg-brand-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Mode selector tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[11px] font-medium text-zinc-500">
              <button
                onClick={() => {
                  setMode('work');
                  setTimeLeft(MODE_DURATIONS.work);
                  setIsRunning(false);
                }}
                className={`py-1 rounded ${mode === 'work' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : ''}`}
              >
                25m Work
              </button>
              <button
                onClick={() => {
                  setMode('short_break');
                  setTimeLeft(MODE_DURATIONS.short_break);
                  setIsRunning(false);
                }}
                className={`py-1 rounded ${mode === 'short_break' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : ''}`}
              >
                5m Break
              </button>
              <button
                onClick={() => {
                  setMode('long_break');
                  setTimeLeft(MODE_DURATIONS.long_break);
                  setIsRunning(false);
                }}
                className={`py-1 rounded ${mode === 'long_break' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : ''}`}
              >
                15m Break
              </button>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                title="Reset session"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={toggleRunning}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
              </button>

              <button
                onClick={handleSkip}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                title="Skip to next interval"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
