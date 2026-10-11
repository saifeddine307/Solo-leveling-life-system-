import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Minimize2, Play, Pause, RotateCcw, Zap, Flame, Shield, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { SoundEvent } from '../types';
import { useI18n } from '../i18n';

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionComplete: (durationSeconds: number, xpEarned: number, mode: string, tag: string) => void;
  hunterName: string;
}

export const FocusMode: React.FC<FocusModeProps> = ({
  isOpen,
  onClose,
  onSessionComplete,
  hunterName,
}) => {
  const { t, isRTL } = useI18n();
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [initialSeconds, setInitialSeconds] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [activeTask, setActiveTask] = useState<string>('');

  const lastTickRef = useRef<number>(Date.now());
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && isRunning) {
      lastTickRef.current = Date.now();

      const tick = () => {
        const now = Date.now();
        const deltaSeconds = Math.max(0, Math.floor((now - lastTickRef.current) / 1000));
        if (deltaSeconds <= 0) return;
        lastTickRef.current = now;

        setElapsed((e) => e + deltaSeconds);
        setSecondsLeft((s) => {
          if (s <= deltaSeconds) {
            setTimeout(() => {
              handleComplete(initialSeconds);
            }, 0);
            return 0;
          }
          return s - deltaSeconds;
        });
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
  }, [isOpen, isRunning, initialSeconds]);

  if (!isOpen) return null;

  const handleStartPause = () => {
    if (!isRunning) {
      soundManager.playSound(SoundEvent.TIMER_START);
      lastTickRef.current = Date.now();
      setIsRunning(true);
    } else {
      soundManager.playSound(SoundEvent.TIMER_PAUSE);
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setIsRunning(false);
    setSecondsLeft(initialSeconds);
    setElapsed(0);
  };

  const handleComplete = (forcedDuration?: number) => {
    setIsRunning(false);
    soundManager.playSound(SoundEvent.TIMER_COMPLETE);
    const duration = forcedDuration !== undefined ? forcedDuration : Math.max(0, initialSeconds - secondsLeft);
    const mins = Math.floor(duration / 60);
    const xp = mins * 2;
    if (duration > 0) {
      onSessionComplete(duration, xp, 'deep_work', activeTask || 'Deep Focus');
    }
    onClose();
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const liveXp = Math.floor((elapsed / 60) * 2);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#0d0b14]/98 flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none backdrop-blur-2xl"
      >
        {/* Subtle Background Radial Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Top Status Header */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Shield className="w-5 h-5" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <span className="text-xs font-black text-purple-400 uppercase tracking-widest font-orbitron">
                {t('soloFocusChamber')}
              </span>
              <p className="text-[11px] text-white/40 font-rajdhani">
                {t('hunterAttributes')}: {hunterName} • {t('distractionSuppression')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold font-orbitron transition-all cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            <span>{t('exitFocusMode')}</span>
          </button>
        </div>

        {/* Center Hero Clock */}
        <div className="my-auto flex flex-col items-center justify-center text-center z-10">
          <div className="mb-4">
            <input
              type="text"
              value={activeTask}
              onChange={(e) => setActiveTask(e.target.value)}
              placeholder={t('objectivePlaceholder')}
              className="text-center text-lg sm:text-xl font-bold text-purple-200 placeholder:text-white/30 bg-transparent border-b border-purple-500/30 hover:border-purple-400 focus:border-purple-400 focus:outline-none pb-1 font-rajdhani transition-all max-w-md w-full"
            />
          </div>

          {/* Glowing Timer */}
          <div className="my-6">
            <span className="text-7xl sm:text-9xl font-black text-white font-orbitron tracking-tight drop-shadow-[0_0_35px_rgba(168,85,247,0.45)]">
              {formatTime(secondsLeft)}
            </span>
          </div>

          {/* Session Telemetry Pill */}
          <div className="flex items-center gap-6 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-orbitron">
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Zap className="w-4 h-4" />
              <span>+{liveXp} {t('accumulatingXP')}</span>
            </div>
            <div className="h-3 w-[1px] bg-white/10" />
            <div className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{t('deepFlowState')}</span>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Controls */}
        <div className="flex items-center justify-center gap-4 z-10 flex-wrap">
          <button
            onClick={handleStartPause}
            className={`px-8 py-3.5 rounded-2xl text-xs font-bold font-orbitron uppercase tracking-wider flex items-center gap-2 shadow-2xl transition-all cursor-pointer ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/40 border border-purple-400/40'
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
            onClick={handleComplete}
            className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-orbitron uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('concludeClaimXP')}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={t('resetTimer')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
