import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Sparkles, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n';

export interface SystemNotification {
  id: string;
  type: 'quest_complete' | 'focus_start' | 'focus_complete' | 'level_up' | 'achievement_unlocked' | 'general';
  title: string;
  subtitle?: string;
  badge?: string;
  xpReward?: number;
  goldReward?: number;
}

interface SystemNotificationBannerProps {
  notification: SystemNotification | null;
  onDismiss: () => void;
}

export const SystemNotificationBanner: React.FC<SystemNotificationBannerProps> = ({
  notification,
  onDismiss,
}) => {
  const { isRTL } = useI18n();

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'quest_complete':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'focus_start':
      case 'focus_complete':
        return <Clock className="w-5 h-5 text-cyan-400 shrink-0" />;
      case 'level_up':
        return <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'achievement_unlocked':
        return <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />;
      default:
        return <Shield className="w-5 h-5 text-purple-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'quest_complete':
        return 'border-emerald-500/50 shadow-emerald-950/60';
      case 'focus_start':
      case 'focus_complete':
        return 'border-cyan-500/50 shadow-cyan-950/60';
      case 'level_up':
        return 'border-purple-500/60 shadow-purple-950/80';
      case 'achievement_unlocked':
        return 'border-amber-500/50 shadow-amber-950/60';
      default:
        return 'border-purple-500/40 shadow-purple-950/60';
    }
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-md px-4">
      <AnimatePresence>
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, y: -25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
          onClick={onDismiss}
          className={`pointer-events-auto cursor-pointer relative rounded-2xl bg-[#0d0b14]/95 backdrop-blur-2xl border ${getBorderColor()} p-4 shadow-2xl overflow-hidden`}
        >
          {/* Top HUD Light Strip */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-amber-400 animate-pulse" />

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              {getIcon()}
            </div>

            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 font-orbitron">
                  [ SYSTEM ]
                </span>
                {notification.badge && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-[9px] font-bold text-purple-300 font-orbitron border border-purple-500/30">
                    {notification.badge}
                  </span>
                )}
              </div>

              <h4 className="text-xs sm:text-sm font-black text-white font-cinzel tracking-wider uppercase truncate mt-0.5">
                {notification.title}
              </h4>

              {notification.subtitle && (
                <p className="text-[11px] text-white/60 font-rajdhani truncate mt-0.5">
                  {notification.subtitle}
                </p>
              )}
            </div>

            {/* Optional XP Badge */}
            {notification.xpReward && (
              <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-yellow-400 font-orbitron text-xs font-bold">
                <Zap className="w-3.5 h-3.5 fill-yellow-400" />
                <span>+{notification.xpReward} XP</span>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
