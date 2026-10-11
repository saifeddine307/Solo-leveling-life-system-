import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX, ShieldAlert, Sparkles, RefreshCw, UserCheck, Plus, Globe, Cloud, CloudOff } from 'lucide-react';
import { PlayerStats, SoundEvent } from '../types';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';
import { HunterAvatar } from './HunterAvatar';
import { PWAInstallButton } from './PWAInstallButton';
import { cloudSync, CloudSyncInfo } from '../services/cloudSync';
import { authService, AuthState } from '../services/authService';

interface HeaderProps {
  player: PlayerStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenStatsModal: () => void;
  onOpenSyncModal: () => void;
  onOpenNewQuestModal: () => void;
  onOpenLogsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  player,
  isMuted,
  onToggleMute,
  onOpenStatsModal,
  onOpenSyncModal,
  onOpenNewQuestModal,
  onOpenLogsModal,
}) => {
  const { t, language, setLanguage, isRTL } = useI18n();
  const [syncInfo, setSyncInfo] = useState<CloudSyncInfo>(() => cloudSync.getInfo());
  const [authState, setAuthState] = useState<AuthState>(() => authService.getState());

  useEffect(() => {
    const unsubSync = cloudSync.subscribe(setSyncInfo);
    const unsubAuth = authService.subscribe(setAuthState);
    return () => {
      unsubSync();
      unsubAuth();
    };
  }, []);

  const progressPercent = Math.min(100, Math.max(0, Math.round((player.currentXP / player.requiredXP) * 100)));

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ar' : 'en';
    soundManager.playSound(SoundEvent.SYSTEM_OPEN);
    setLanguage(nextLang);
  };

  return (
    <header className="relative z-20 w-full mb-6">
      {/* Top Bar Background Panel */}
      <div className="relative bg-white/5 rounded-3xl border border-white/10 p-6 sm:p-7 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-purple-400/80 to-transparent" />

        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          {/* Left: Player Profile & Level */}
          <div className="flex items-center gap-5 sm:gap-6 flex-1 min-w-0">
            {/* Rank Avatar Ring */}
            <div
              className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 cursor-pointer group select-none flex items-center justify-center"
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                onOpenStatsModal();
              }}
              title={t('statusWindow')}
            >
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/30 animate-pulse" />
              <div className="absolute inset-1 rounded-full border-2 border-purple-500 animate-spin-slow" />
              <div className="relative z-10">
                <HunterAvatar avatar={player.avatar} name={player.name} size="lg" glow />
              </div>
            </div>

            {/* Player Info & Title */}
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-2.5 sm:gap-3 mb-1 flex-wrap">
                <span className="text-xs font-bold tracking-widest text-purple-400 uppercase font-orbitron">
                  {t('rank')}: {player.rank}-Rank
                </span>
                <span className="text-xs font-bold tracking-widest text-yellow-500 uppercase px-2 py-0.5 bg-yellow-500/10 rounded font-orbitron border border-yellow-500/20">
                  {player.title}
                </span>
                {player.statPoints > 0 && (
                  <motion.button
                    initial={{ scale: 0.95 }}
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    onClick={() => {
                      soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                      onOpenStatsModal();
                    }}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 border border-purple-400/60 text-purple-300 shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    +{player.statPoints} {t('statPoints')}
                  </motion.button>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-cinzel uppercase truncate">
                {player.name}
              </h1>

              {/* Level & XP Mana bar */}
              <div className="mt-2.5 flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                <div className="text-xs sm:text-sm font-bold text-white/60 font-orbitron whitespace-nowrap">
                  {t('level')}. <span className="text-xl sm:text-2xl text-white font-black">{player.level}</span>
                </div>
                <div className="w-48 sm:w-64 bg-white/5 h-3 rounded-full border border-white/10 relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-600 via-purple-400 to-white shadow-[0_0_15px_rgba(168,85,247,0.8)] transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider whitespace-nowrap">
                  {progressPercent}% • {player.currentXP}/{player.requiredXP} {t('xp')}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Currency, Streak, & Action Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-stretch xl:self-center">
            {/* Stat Cards */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* Current Streak */}
              <div
                className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-white/5 border border-purple-500/20 rounded-xl px-5 sm:px-6 py-3.5 backdrop-blur-md cursor-pointer hover:border-purple-500/40 transition-colors"
                onClick={() => soundManager.playSound(SoundEvent.BUTTON_CONFIRM)}
                title={`${player.streak} ${t('daysUnbroken')}`}
              >
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5 font-orbitron">
                  {t('streak')}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-yellow-400 flex items-center gap-1.5 font-orbitron">
                  <span>{player.streak}</span>
                  <span className="text-xl animate-fire">🔥</span>
                </div>
              </div>

              {/* Gold Accumulated */}
              <div
                className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-white/5 border border-purple-500/20 rounded-xl px-5 sm:px-6 py-3.5 backdrop-blur-md"
                title={t('gold')}
              >
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5 font-orbitron">
                  {t('gold')}
                </div>
                <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
                  {player.gold.toLocaleString()} <span className="text-yellow-500 text-xs sm:text-sm font-bold ml-1">G</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* PWA / Desktop Install Prompt */}
              <PWAInstallButton />

              {/* Quick Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-purple-900/30 text-purple-300 hover:text-white border border-white/10 hover:border-purple-500/40 transition-colors cursor-pointer flex items-center gap-1.5"
                title={language === 'en' ? 'التحويل للغة العربية' : 'Switch to English'}
              >
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-orbitron font-bold uppercase">{language === 'en' ? 'AR' : 'EN'}</span>
              </button>

              {/* Add Quest Button */}
              <button
                id="btn-new-quest"
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                  onOpenNewQuestModal();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 border border-purple-400/40 transition-all hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider font-orbitron"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('quickQuest')}</span>
              </button>

              {/* System Status Window Button */}
              <button
                id="btn-player-status"
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                  onOpenStatsModal();
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-purple-900/30 text-purple-300 hover:text-white border border-white/10 hover:border-purple-500/40 transition-colors cursor-pointer"
                title={t('hunterAttributes')}
              >
                <UserCheck className="w-4 h-4" />
              </button>

              {/* Cloud Sync Button */}
              <button
                id="btn-cloud-sync"
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                  onOpenSyncModal();
                }}
                className="relative p-2.5 rounded-xl bg-white/5 hover:bg-purple-900/30 text-purple-300 hover:text-white border border-white/10 hover:border-purple-500/40 transition-colors cursor-pointer"
                title={
                  authState.isCloudLinked
                    ? `Cloud Sync: ${syncInfo.status.toUpperCase()} (PC ↔ Phone)`
                    : 'Cloud Backup & Sync (Sign in to sync across devices)'
                }
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    syncInfo.status === 'syncing' ? 'animate-spin text-cyan-400' : ''
                  }`}
                />
                {/* Live Status Indicator Dot */}
                <span
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                    !syncInfo.isOnline
                      ? 'bg-amber-400'
                      : syncInfo.status === 'syncing'
                      ? 'bg-cyan-400 animate-pulse'
                      : syncInfo.status === 'error'
                      ? 'bg-rose-400'
                      : authState.isCloudLinked
                      ? 'bg-emerald-400'
                      : 'bg-purple-400/50'
                  }`}
                />
              </button>

              {/* System Logs / Alerts */}
              <button
                id="btn-system-logs"
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                  onOpenLogsModal();
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-purple-900/30 text-purple-400 hover:text-white border border-white/10 hover:border-purple-500/40 transition-colors cursor-pointer"
                title={t('recentEvents')}
              >
                <ShieldAlert className="w-4 h-4" />
              </button>

              {/* Audio SFX Toggle */}
              <button
                id="btn-toggle-sfx"
                onClick={onToggleMute}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-red-950/40 text-red-400 border-red-500/40 hover:bg-red-900/60'
                    : 'bg-white/5 text-purple-300 border-white/10 hover:border-purple-500/40 hover:text-white'
                }`}
                title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
