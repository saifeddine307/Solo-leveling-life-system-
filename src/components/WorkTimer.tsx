import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Maximize2, Zap, Flame, Clock, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { SoundEvent } from '../types';
import { useI18n } from '../i18n';

interface WorkTimerProps {
  onSessionComplete: (durationSeconds: number, xpEarned: number, mode: string, tag: string) => void;
  onEnterFocusMode: () => void;
  onTimerStarted?: (tag: string) => void;
  todayFocusMinutes: number;
  streak: number;
}

type TimerMode = 'pomodoro' | 'short_break' | 'deep_work' | 'stopwatch';

export const WorkTimer: React.FC<WorkTimerProps> = ({
  onSessionComplete,
  onEnterFocusMode,
  onTimerStarted,
  todayFocusMinutes,
  streak,
}) => {
  const { t, isRTL } = useI18n();

  const MODE_PRESETS: Record<TimerMode, { label: string; seconds: number; xpRate: number }> = {
    pomodoro: { label: t('modePomodoro'), seconds: 25 * 60, xpRate: 2 },
    deep_work: { label: t('modeDeepWork'), seconds: 50 * 60, xpRate: 2.5 },
    short_break: { label: t('modeShortBreak'), seconds: 5 * 60, xpRate: 0 },
    stopwatch: { label: t('modeStopwatch'), seconds: 0, xpRate: 2 },
  };

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_PRESETS.pomodoro.seconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [taskTag, setTaskTag] = useState<string>('');

  const lastTickRef = useRef<number>(Date.now());
  const intervalRef = useRef<number | null>(null);

  // Switch mode
  const handleSelectMode = (newMode: TimerMode) => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODE_PRESETS[newMode].seconds);
    setElapsedSeconds(0);
  };

  // Drift-safe Timer Tick with visibility change listener
  useEffect(() => {
    if (isRunning) {
      lastTickRef.current = Date.now();

      const tick = () => {
        const now = Date.now();
        const deltaSeconds = Math.max(0, Math.floor((now - lastTickRef.current) / 1000));
        if (deltaSeconds <= 0) return;
        lastTickRef.current = now;

        setElapsedSeconds((prev) => prev + deltaSeconds);

        if (mode === 'stopwatch') {
          setTimeLeft((prev) => prev + deltaSeconds);
        } else {
          setTimeLeft((prev) => {
            if (prev <= deltaSeconds) {
              setTimeout(() => {
                handleCompleteTimer(MODE_PRESETS[mode].seconds);
              }, 0);
              return 0;
            }
            return prev - deltaSeconds;
          });
        }
      };

      intervalRef.current = window.setInterval(tick, 1000);

      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && isRunning) {
          tick();
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [isRunning, mode]);

  const handleStartPause = () => {
    if (!isRunning) {
      soundManager.playSound(SoundEvent.TIMER_START);
      lastTickRef.current = Date.now();
      setIsRunning(true);
      if (onTimerStarted) {
        onTimerStarted(taskTag || 'Deep Focus');
      }
    } else {
      soundManager.playSound(SoundEvent.TIMER_PAUSE);
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setIsRunning(false);
    setTimeLeft(MODE_PRESETS[mode].seconds);
    setElapsedSeconds(0);
  };

  const handleCompleteTimer = (forcedDuration?: number) => {
    setIsRunning(false);
    soundManager.playSound(SoundEvent.TIMER_COMPLETE);
    const duration = forcedDuration !== undefined
      ? forcedDuration
      : (mode === 'stopwatch' ? elapsedSeconds : Math.max(0, MODE_PRESETS[mode].seconds - timeLeft));
    const minutes = Math.floor(duration / 60);
    const xpEarned = Math.floor(minutes * MODE_PRESETS[mode].xpRate);

    if (duration > 0) {
      onSessionComplete(duration, xpEarned, mode, taskTag || 'Deep Focus');
    }
    setTimeLeft(MODE_PRESETS[mode].seconds);
    setElapsedSeconds(0);
  };

  // Format Time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const potentialXp = Math.floor((elapsedSeconds / 60) * MODE_PRESETS[mode].xpRate);

  return (
    <div className="relative bg-white/5 rounded-3xl border border-white/10 p-6 sm:p-7 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between">
      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Clock className="w-4 h-4" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h3 className="text-xs sm:text-sm font-bold text-white font-cinzel tracking-wider">
              {t('systemFocusEngine')}
            </h3>
            <p className="text-[10px] text-white/40 font-orbitron">
              {t('manaAccumulator')}
            </p>
          </div>
        </div>

        {/* Focus Mode Expansion Trigger */}
        <button
          onClick={() => {
            soundManager.playSound(SoundEvent.SYSTEM_OPEN);
            onEnterFocusMode();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold font-orbitron transition-all cursor-pointer hover:shadow-md hover:shadow-purple-500/20"
          title="Enter Fullscreen Focus Chamber"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('focusMode')}</span>
        </button>
      </div>

      {/* Mode Presets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {(['pomodoro', 'deep_work', 'short_break', 'stopwatch'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleSelectMode(m)}
            className={`py-2 px-3 rounded-xl text-xs font-semibold font-orbitron transition-all cursor-pointer border truncate ${
              mode === m
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {MODE_PRESETS[m].label}
          </button>
        ))}
      </div>

      {/* Hero Digital Timer Display */}
      <div className="my-auto py-4 flex flex-col items-center justify-center text-center relative">
        {/* Subtle Ambient Pulse Ring */}
        <div
          className={`absolute w-48 h-48 rounded-full border transition-all duration-1000 pointer-events-none ${
            isRunning
              ? 'border-purple-500/30 scale-110 animate-pulse bg-purple-500/5'
              : 'border-white/5 scale-100'
          }`}
        />

        {/* Time Digits */}
        <div className="relative z-10">
          <span className="text-5xl sm:text-7xl font-black text-white font-orbitron tracking-tight drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]">
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Task Tag Input */}
        <div className="relative z-10 mt-3 max-w-xs w-full">
          <input
            type="text"
            value={taskTag}
            onChange={(e) => setTaskTag(e.target.value)}
            placeholder={t('objectivePlaceholder')}
            className="w-full text-center bg-white/5 border border-white/10 hover:border-purple-500/40 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-purple-200 placeholder:text-white/30 font-rajdhani focus:outline-none transition-all"
          />
        </div>

        {/* Live Potential XP Bar */}
        <div className="relative z-10 mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-xs font-orbitron">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-white/60">{t('yield')}</span>
          <span className="text-yellow-400 font-bold">+{potentialXp} {t('xp')}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Play / Pause / Reset Action Group */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleStartPause}
            className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl font-bold text-xs font-orbitron uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-purple-600/30 border border-purple-400/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-white" /> {t('pauseFocus')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> {t('startSession')}
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={t('resetTimer')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Daily Focus & Streak Metrics */}
        <div className="flex items-center gap-4 text-xs font-orbitron text-white/60">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('todayFocus')}</span>
            <strong className="text-white">{todayFocusMinutes}{t('mins')}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>{t('unbrokenStreak')}</span>
            <strong className="text-amber-300">{streak}{t('days').charAt(0)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
