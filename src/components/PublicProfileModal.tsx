import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Share2, Check, Flame, Trophy, Sparkles, Lock } from 'lucide-react';
import { PlayerStats, Achievement, SkillNode, UserSettings, SoundEvent } from '../types';
import { HunterAvatar } from './HunterAvatar';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerStats;
  achievements: Achievement[];
  skills: SkillNode[];
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  isOpen,
  onClose,
  player,
  achievements,
  skills,
  settings,
  onUpdateSettings,
}) => {
  const { t, isRTL } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const shareUrl = `${window.location.origin}/?hunter=${encodeURIComponent(player.name.toLowerCase().replace(/\s+/g, '_'))}`;

  const handleCopyLink = () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const togglePublicProfile = () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    onUpdateSettings({ publicProfileEnabled: !settings.publicProfileEnabled });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 bg-[#0d0b14]/95 shadow-[0_0_50px_rgba(168,85,247,0.2)]"
        >
          {/* HUD Corner Accents */}
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="text-sm font-black tracking-wider text-white font-cinzel">
                  {t('publicLicenseTitle')}
                </h3>
                <p className="text-[10px] text-purple-300/60 font-orbitron">
                  {t('publicLicenseSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Privacy Toggle Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-cinzel">
                  {t('publicHunterProfile')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-orbitron font-bold ${
                    settings.publicProfileEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/10 text-white/40 border border-white/10'
                  }`}
                >
                  {settings.publicProfileEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-1 max-w-sm">
                {t('publicProfileDesc')}
              </p>
            </div>
            <button
              onClick={togglePublicProfile}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-orbitron cursor-pointer transition-all ${
                settings.publicProfileEnabled
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-white/70'
              }`}
            >
              {settings.publicProfileEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          {/* The Official Hunter License Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-b from-[#191428] to-[#0d0b14] border border-purple-500/40 shadow-2xl overflow-hidden mb-6">
            {/* Ambient Background Aura */}
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* License Top Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-orbitron font-black text-amber-300 tracking-widest uppercase">
                  ASSOCIATION HUNTER REGISTRY
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-orbitron font-bold">
                {t('systemSeal')}
              </span>
            </div>

            {/* Main Hunter Identity Block */}
            <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
              <HunterAvatar avatar={player.avatar} name={player.name} size="lg" glow />

              <div className={`flex-1 text-center sm:text-left ${isRTL ? 'sm:text-right' : 'sm:text-left'}`}>
                <div className={`flex flex-wrap items-center justify-center ${isRTL ? 'sm:justify-end' : 'sm:justify-start'} gap-2`}>
                  <h4 className="text-xl font-black text-white font-cinzel">
                    {player.name}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-[10px] font-orbitron font-black text-white shadow-md">
                    {player.rank}-RANK
                  </span>
                </div>
                <p className="text-xs text-purple-300/80 font-rajdhani mt-0.5">
                  {player.title}
                </p>

                <div className={`flex flex-wrap items-center justify-center ${isRTL ? 'sm:justify-end' : 'sm:justify-start'} gap-4 mt-3`}>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <span className="text-[9px] text-white/40 font-orbitron uppercase block">
                      {t('level')}
                    </span>
                    <span className="text-sm font-bold text-white font-orbitron">
                      {t('level')}. {player.level}
                    </span>
                  </div>

                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <span className="text-[9px] text-white/40 font-orbitron uppercase block">
                      {t('totalManaEarned')}
                    </span>
                    <span className="text-sm font-bold text-purple-300 font-orbitron">
                      {player.totalXPEarned.toLocaleString()} {t('xp')}
                    </span>
                  </div>

                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <span className="text-[9px] text-white/40 font-orbitron uppercase block">
                      {t('unbrokenStreak')}
                    </span>
                    <span className="text-sm font-bold text-amber-400 font-orbitron flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" /> {player.streak} {t('days')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Attributes Showcase */}
            <div className="grid grid-cols-5 gap-2 mt-6 pt-4 border-t border-white/10 relative z-10 text-center">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] text-white/40 font-orbitron block">STR</span>
                <span className="text-xs font-bold text-white font-orbitron">{player.stats.strength}</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] text-white/40 font-orbitron block">AGI</span>
                <span className="text-xs font-bold text-white font-orbitron">{player.stats.agility}</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] text-white/40 font-orbitron block">VIT</span>
                <span className="text-xs font-bold text-white font-orbitron">{player.stats.vitality}</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] text-white/40 font-orbitron block">INT</span>
                <span className="text-xs font-bold text-white font-orbitron">{player.stats.intelligence}</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[9px] text-white/40 font-orbitron block">PER</span>
                <span className="text-xs font-bold text-white font-orbitron">{player.stats.perception}</span>
              </div>
            </div>

            {/* Top Unlocked Achievements Showcase */}
            {unlockedAchievements.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 relative z-10">
                <span className="text-[9px] text-white/40 font-orbitron uppercase block mb-2">
                  {t('awakenedAchievements').toUpperCase()} ({unlockedAchievements.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {unlockedAchievements.slice(0, 4).map((ach) => (
                    <div
                      key={ach.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-yellow-500/30 text-[11px] text-yellow-300 font-cinzel"
                    >
                      <Trophy className="w-3 h-3 text-yellow-400" />
                      <span>{ach.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Strict Privacy Disclaimer */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-white/60 text-[11px] mb-6">
            <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p>{t('publicProfileDisclaimer')}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="w-full flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-orbitron shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? t('copied') : t('copyShareableLink')}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                onClose();
              }}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold font-orbitron transition-all cursor-pointer"
            >
              {t('closeWindow')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
