import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Sparkles, Trophy, Zap, AlertTriangle, Info } from 'lucide-react';
import { SystemLog, SoundEvent } from '../types';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SystemLog[];
  onClearLogs: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose, logs, onClearLogs }) => {
  const { t, isRTL } = useI18n();

  if (!isOpen) return null;

  const getLogIcon = (type: SystemLog['type']) => {
    switch (type) {
      case 'level_up':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      case 'quest_complete':
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      case 'rank_up':
        return <Trophy className="w-3.5 h-3.5 text-purple-400" />;
      case 'penalty':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-purple-300" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
            onClose();
          }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Hologram System Log Dialog */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-lg bg-[#0d0b14]/95 border border-purple-500/30 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/80 overflow-hidden"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h2 className="text-base font-bold text-white font-cinzel tracking-wider">
                  {t('systemLogs')}
                </h2>
                <p className="text-[11px] text-white/40 font-rajdhani">
                  {t('chronologicalRecord')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                onClose();
              }}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Logs Stream */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8 font-rajdhani">{t('noEventsLogged')}</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3 hover:bg-white/10 transition-colors"
                >
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                    {getLogIcon(log.type)}
                  </div>
                  <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-purple-400 font-orbitron">
                        [{log.type.replace('_', ' ')}]
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-white/90 mt-0.5 font-rajdhani font-semibold">
                      {log.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer actions */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                onClearLogs();
              }}
              className="text-xs text-white/40 hover:text-red-400 font-rajdhani cursor-pointer"
            >
              {t('clearLogHistory')}
            </button>

            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-orbitron uppercase tracking-wider shadow-md shadow-purple-600/30 transition-colors cursor-pointer"
            >
              {t('closeWindow')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
