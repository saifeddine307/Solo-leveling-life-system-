import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Plus, Shield, Zap, Eye, Heart, Brain, Dumbbell, Sparkles, Check } from 'lucide-react';
import { PlayerStats, SoundEvent } from '../types';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';
import { HunterAvatar } from './HunterAvatar';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerStats;
  onAllocateStat: (statKey: keyof PlayerStats['stats']) => void;
  onUpdateProfile: (name: string, title: string) => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  player,
  onAllocateStat,
  onUpdateProfile,
}) => {
  const { t, isRTL } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(player.name);
  const [tempTitle, setTempTitle] = useState(player.title);

  if (!isOpen) return null;

  const statItems = [
    {
      key: 'strength' as const,
      label: `${t('strength')} (STR)`,
      value: player.stats.strength,
      desc: t('strengthDesc'),
      icon: <Dumbbell className="w-4 h-4 text-rose-400" />,
      color: 'text-rose-400',
    },
    {
      key: 'agility' as const,
      label: `${t('agility')} (AGI)`,
      value: player.stats.agility,
      desc: t('agilityDesc'),
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      color: 'text-cyan-400',
    },
    {
      key: 'vitality' as const,
      label: `${t('vitality')} (VIT)`,
      value: player.stats.vitality,
      desc: t('vitalityDesc'),
      icon: <Heart className="w-4 h-4 text-emerald-400" />,
      color: 'text-emerald-400',
    },
    {
      key: 'intelligence' as const,
      label: `${t('intelligence')} (INT)`,
      value: player.stats.intelligence,
      desc: t('intelligenceDesc'),
      icon: <Brain className="w-4 h-4 text-purple-400" />,
      color: 'text-purple-400',
    },
    {
      key: 'perception' as const,
      label: `${t('perception')} (PER)`,
      value: player.stats.perception,
      desc: t('perceptionDesc'),
      icon: <Eye className="w-4 h-4 text-amber-400" />,
      color: 'text-amber-400',
    },
  ];

  const hp = player.stats.vitality * 100;
  const mp = player.stats.intelligence * 90;

  const handleSaveProfile = () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    onUpdateProfile(tempName.trim() || player.name, tempTitle.trim() || player.title);
    setIsEditing(false);
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

        {/* Status Hologram Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#0d0b14]/95 border border-purple-500/30 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/80"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Window Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Shield className="w-4 h-4" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h2 className="text-base sm:text-lg font-bold text-white font-cinzel tracking-wider">
                  {t('statusWindow')}
                </h2>
                <p className="text-[11px] text-white/40 font-orbitron">
                  System ID: 0x9F4B • {t('appTitle')}
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

          {/* Player Overview Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <HunterAvatar avatar={player.avatar} name={player.name} size="md" />
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-orbitron block">{t('hunterCodename')}</label>
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="w-full bg-white/5 border border-purple-500/40 rounded-xl px-3 py-1 text-sm text-white font-cinzel focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-orbitron block">{t('hunterTitle')}</label>
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          className="w-full bg-white/5 border border-purple-500/40 rounded-xl px-3 py-1 text-xs text-purple-300 font-rajdhani focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <button
                        onClick={handleSaveProfile}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer font-orbitron shadow-md shadow-purple-600/30"
                      >
                        <Check className="w-3 h-3" /> {t('save')}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white font-cinzel">{player.name}</h3>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-[10px] text-purple-400 hover:underline font-rajdhani"
                        >
                          [Edit]
                        </button>
                      </div>
                      <p className="text-xs text-purple-300 font-rajdhani font-semibold tracking-wider uppercase">
                        {player.title}
                      </p>
                      <p className="text-[11px] text-white/50 font-orbitron mt-0.5">
                        {t('rank')}: <strong className="text-purple-400 font-bold">{player.rank}-Rank</strong> • {t('level')}: <strong className="text-white">{player.level}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Health, Mana & Fatigue meters */}
              <div className="flex flex-col gap-1.5 sm:text-right min-w-[130px]">
                <div className="flex justify-between items-center text-xs font-orbitron">
                  <span className="text-emerald-400 font-bold">{t('hp')}:</span>
                  <span className="text-white/80">{hp} / {hp}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full w-full" />
                </div>

                <div className="flex justify-between items-center text-xs font-orbitron mt-0.5">
                  <span className="text-purple-400 font-bold">{t('mp')}:</span>
                  <span className="text-white/80">{mp} / {mp}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-purple-500 h-full w-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                </div>

                <div className="flex justify-between items-center text-[10px] font-orbitron text-white/40 mt-0.5">
                  <span>{t('fatigue')}:</span>
                  <span className="text-emerald-400 font-bold">0 ({t('refreshed')})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Points Available Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/50 to-white/5 border border-purple-500/30 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-xs font-bold text-white font-rajdhani uppercase tracking-wider">
                {t('availableStatPoints')}:
              </span>
            </div>
            <span className="text-sm font-black text-yellow-400 font-orbitron px-2.5 py-0.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              {player.statPoints} {t('sp')}
            </span>
          </div>

          {/* Attributes List */}
          <div className="space-y-2 mb-5">
            {statItems.map((stat) => (
              <div
                key={stat.key}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    {stat.icon}
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h4 className={`text-sm font-bold font-orbitron ${stat.color}`}>
                      {stat.label}
                    </h4>
                    <p className="text-[11px] text-white/40 font-rajdhani">{stat.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-white font-orbitron min-w-[36px] text-right">
                    {stat.value}
                  </span>
                  <button
                    disabled={player.statPoints <= 0}
                    onClick={() => {
                      soundManager.playSound(SoundEvent.XP_GAIN);
                      onAllocateStat(stat.key);
                    }}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      player.statPoints > 0
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 active:scale-95'
                        : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                    }`}
                    title="Add 1 Point"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-semibold text-xs border border-white/10 transition-colors cursor-pointer font-orbitron uppercase tracking-wider"
          >
            {t('closeWindow')}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
