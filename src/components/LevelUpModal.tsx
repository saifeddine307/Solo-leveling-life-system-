import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, ArrowRight, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { PlayerStats, SoundEvent } from '../types';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerStats;
  onOpenStatsModal: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  player,
  onOpenStatsModal,
}) => {
  const { t, isRTL } = useI18n();

  useEffect(() => {
    if (isOpen) {
      soundManager.playSound(SoundEvent.LEVEL_UP);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#c084fc', '#fbbf24', '#38bdf8'],
      });
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Hologram System Dialog */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-md bg-[#0d0b14]/98 border border-purple-500/30 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/90 overflow-hidden text-center"
          >
            <div className="hud-corner-tl" />
            <div className="hud-corner-tr" />
            <div className="hud-corner-bl" />
            <div className="hud-corner-br" />

            {/* Top Center System Badge */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-1 bg-purple-600 text-[10px] font-black uppercase tracking-widest rounded-b-xl shadow-lg shadow-purple-500/20 text-white font-orbitron z-10">
              {t('systemAscension')}
            </div>

            {/* Glowing top beacon */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-400 to-yellow-400 animate-pulse" />

            {/* System Header Alert */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-bold font-orbitron tracking-widest uppercase mb-4 mt-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              [{t('systemNotification')}]
            </div>

            {/* Main Title */}
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-white to-purple-200 font-cinzel tracking-wider">
              {t('leveledUpTitle')}
            </h2>
            <p className="text-xs text-white/60 font-rajdhani mt-1 uppercase tracking-widest">
              {t('leveledUpSubtitle')}
            </p>

            {/* Level Ascension Display */}
            <div className="my-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-6">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-white/40 font-orbitron block">{t('previous')}</span>
                <span className="text-xl font-bold text-white/40 font-orbitron">
                  {t('level')}. {player.level - 1}
                </span>
              </div>

              <div className="p-2.5 rounded-full bg-purple-500/20 text-purple-300">
                {isRTL ? <ArrowLeft className="w-5 h-5 text-purple-400" /> : <ArrowRight className="w-5 h-5 text-purple-400" />}
              </div>

              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-purple-400 font-orbitron block">{t('current')}</span>
                <span className="text-2xl font-black text-white font-orbitron">
                  {t('level')}. {player.level}
                </span>
              </div>
            </div>

            {/* Rewards Breakdown */}
            <div className="space-y-2 text-left mb-6 font-rajdhani text-sm">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/80 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" /> {t('statPointsAcquired')}
                </span>
                <strong className="text-yellow-400 font-orbitron font-bold">+5 {t('sp')}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-white/80 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-400" /> {t('currentRank')}:
                </span>
                <strong className="text-purple-300 font-orbitron font-bold">{player.rank}-Rank ({player.title})</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                  onClose();
                  onOpenStatsModal();
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-600/40 border border-purple-400/40 transition-all cursor-pointer flex items-center justify-center gap-2 font-orbitron uppercase tracking-wider"
              >
                <ShieldCheck className="w-4 h-4" />
                {t('allocateStatPoints')}
              </button>

              <button
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                  onClose();
                }}
                className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-semibold text-sm border border-white/10 transition-colors cursor-pointer font-orbitron uppercase tracking-wider"
              >
                {t('dismiss')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
