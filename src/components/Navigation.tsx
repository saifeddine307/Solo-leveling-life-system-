import React from 'react';
import { Home, CheckSquare, BarChart3, User, Settings, Volume2, VolumeX, Cloud, Bell, Flame, Sparkles } from 'lucide-react';
import { NavigationTab, PlayerStats, SoundEvent } from '../types';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';
import { HunterAvatar } from './HunterAvatar';

interface NavigationProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  player: PlayerStats;
  unreadLogsCount: number;
  activeQuestsCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSyncModal: () => void;
  onOpenLogsModal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  player,
  unreadLogsCount,
  activeQuestsCount,
  isMuted,
  onToggleMute,
  onOpenSyncModal,
  onOpenLogsModal,
}) => {
  const { t, isRTL } = useI18n();

  const navItems = [
    {
      id: 'home' as NavigationTab,
      label: t('home'),
      icon: Home,
      badge: null,
    },
    {
      id: 'quests' as NavigationTab,
      label: t('quests'),
      icon: CheckSquare,
      badge: activeQuestsCount > 0 ? activeQuestsCount : null,
    },
    {
      id: 'system-ai' as NavigationTab,
      label: 'مساعد النظام',
      icon: Sparkles,
      badge: 'AI',
    },
    {
      id: 'analytics' as NavigationTab,
      label: t('analytics'),
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'character' as NavigationTab,
      label: t('character'),
      icon: User,
      badge: player.statPoints > 0 ? `${player.statPoints} SP` : null,
    },
    {
      id: 'settings' as NavigationTab,
      label: t('settings'),
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside
        className={`hidden md:flex flex-col justify-between w-64 lg:w-72 shrink-0 h-screen sticky top-0 bg-[#0d0b14]/90 backdrop-blur-2xl p-5 z-30 select-none ${
          isRTL ? 'border-l border-white/10' : 'border-r border-white/10'
        }`}
      >
        <div>
          {/* System Brand Title */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-purple-600/30 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0d0b14] rounded-[15px] flex items-center justify-center">
                <span className="font-orbitron font-black text-base text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">
                  SL
                </span>
              </div>
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-widest text-white font-cinzel">
                  {t('appTitle')}
                </h1>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
              </div>
              <p className="text-[10px] text-purple-300/70 font-orbitron tracking-wider">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Hunter Mini Profile Card in Sidebar */}
          <div
            onClick={() => {
              soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
              onSelectTab('character');
            }}
            className="group mb-6 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <HunterAvatar avatar={player.avatar} name={player.name} size="sm" />
                <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-purple-600 text-[9px] font-black text-white font-orbitron">
                  {player.rank}
                </span>
              </div>
              <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-xs font-bold text-white truncate font-cinzel group-hover:text-purple-200">
                  {player.name}
                </p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] text-white/50 font-orbitron">
                    Lv. {player.level}
                  </span>
                  <span className="text-[11px] text-amber-400 font-orbitron flex items-center gap-0.5">
                    <Flame className="w-3 h-3 fill-amber-400" /> {player.streak}d
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => {
                    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                    onSelectTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-orbitron'
                      : 'text-white/60 hover:text-white hover:bg-white/5 font-rajdhani text-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-purple-400'
                      }`}
                    />
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <span className="block leading-none">{item.label}</span>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-orbitron font-black ${
                        isActive
                          ? 'bg-white text-purple-900'
                          : typeof item.badge === 'string'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Utilities Footer */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {/* Audio Toggle */}
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Audio SFX' : 'Mute Audio SFX'}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-purple-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
            </button>

            {/* Cloud Sync */}
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                onOpenSyncModal();
              }}
              title="Cloud Sync / Export Data"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-cyan-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-cyan-400" />
            </button>

            {/* System Logs */}
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                onOpenLogsModal();
              }}
              title="System Alerts & Logs"
              className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-purple-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 text-purple-400" />
              {unreadLogsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          </div>

          <div className="text-center">
            <span className="text-[9px] text-white/30 font-orbitron tracking-widest uppercase">
              {t('statusOperational')}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0b14]/95 border-t border-white/10 backdrop-blur-2xl px-2 py-1.5 flex items-center justify-around select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                onSelectTab(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
                isActive ? 'text-purple-300' : 'text-white/40 hover:text-white/80'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
              <span className={`text-[10px] mt-0.5 font-orbitron ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};