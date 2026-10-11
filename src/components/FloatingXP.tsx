import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Coins, Sparkles } from 'lucide-react';

export interface FloatingReward {
  id: string;
  xp: number;
  gold: number;
  statPoints?: number;
  x: number;
  y: number;
}

interface FloatingXPProps {
  rewards: FloatingReward[];
}

export const FloatingXP: React.FC<FloatingXPProps> = ({ rewards }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {rewards.map((reward) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -45, scale: 1.15 }}
            exit={{ opacity: 0, y: -80, scale: 0.9 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            style={{ left: `${reward.x}px`, top: `${reward.y}px` }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 font-orbitron font-black text-sm drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]"
          >
            <span className="flex items-center gap-1 text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded-full border border-cyan-400/60 shadow-lg">
              <Zap className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300" />
              +{reward.xp} XP
            </span>
            <span className="flex items-center gap-1 text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded-full border border-amber-400/60 shadow-lg text-xs">
              <Coins className="w-3 h-3 text-amber-300" />
              +{reward.gold} G
            </span>
            {reward.statPoints ? (
              <span className="flex items-center gap-1 text-purple-300 bg-slate-950/80 px-2 py-0.5 rounded-full border border-purple-400/60 shadow-lg text-xs">
                <Sparkles className="w-3 h-3 text-purple-300" />
                +{reward.statPoints} SP
              </span>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
