import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Flame, Check, Plus, ArrowRight, ArrowLeft, CheckCircle, Zap, Target } from 'lucide-react';
import { PlayerStats, Quest, NavigationTab, SoundEvent } from '../../types';
import { WorkTimer } from '../WorkTimer';
import { soundManager } from '../../utils/audio';
import { useI18n } from '../../i18n';
import { HunterAvatar } from '../HunterAvatar';

interface HomePageProps {
  player: PlayerStats;
  quests: Quest[];
  todayFocusMinutes: number;
  onToggleQuest: (questId: string) => void;
  onOpenNewQuestModal: () => void;
  onOpenStatsModal: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onSessionComplete: (durationSeconds: number, xpEarned: number, mode: string, tag: string) => void;
  onEnterFocusMode: () => void;
  onTimerStarted?: (tag: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  player,
  quests,
  todayFocusMinutes,
  onToggleQuest,
  onOpenNewQuestModal,
  onOpenStatsModal,
  onNavigateTab,
  onSessionComplete,
  onEnterFocusMode,
  onTimerStarted,
}) => {
  const { t, isRTL } = useI18n();
  const xpPercent = Math.min(100, Math.round((player.currentXP / player.requiredXP) * 100));

  // Filter daily and priority active quests
  const dailyQuests = quests.filter((q) => q.type === 'daily');
  const activeDailyQuests = dailyQuests.filter((q) => !q.completed);
  const completedDailyCount = dailyQuests.filter((q) => q.completed).length;
  const dailyProgressPct = dailyQuests.length > 0 ? Math.round((completedDailyCount / dailyQuests.length) * 100) : 0;

  // Immediate top 3 actionable tasks
  const immediateObjectives = activeDailyQuests.slice(0, 3);

  // Today's total potential XP from pending daily tasks
  const pendingXP = activeDailyQuests.reduce((acc, q) => acc + q.xpReward, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Character Identity & Level Progression Card */}
      <div className="relative bg-white/5 rounded-3xl border border-white/10 p-6 sm:p-7 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Hunter Avatar & Identity */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <HunterAvatar avatar={player.avatar} name={player.name} size="lg" glow />
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg bg-purple-600 text-[10px] font-black text-white font-orbitron shadow-md">
                {player.rank}-RANK
              </span>
            </div>

            <div className={isRTL ? 'text-right' : 'text-left'}>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wide">
                  {player.name}
                </h2>
                <button
                  onClick={() => {
                    soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                    onOpenStatsModal();
                  }}
                  className="px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-[11px] text-purple-300 border border-purple-500/30 font-orbitron transition-colors cursor-pointer"
                >
                  {t('statusWindow')}
                </button>
              </div>

              <p className="text-xs sm:text-sm text-purple-300 font-rajdhani font-semibold tracking-wider uppercase mt-0.5">
                {player.title}
              </p>

              <div className="flex items-center gap-4 mt-2 text-xs font-orbitron flex-wrap">
                <div className="flex items-center gap-1 text-white/80">
                  <span className="text-white/40">{t('level').toUpperCase()}:</span>
                  <strong className="text-white font-bold">{player.level}</strong>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{player.streak} {t('days')}</span>
                </div>
                {player.statPoints > 0 && (
                  <div className="flex items-center gap-1 text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                    <Sparkles className="w-3 h-3" />
                    <span>{player.statPoints} {t('sp')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Level XP Progress Bar Module */}
          <div className="lg:max-w-md w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs font-orbitron mb-2">
              <span className="text-white/60 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" /> {t('xpProgress')}
              </span>
              <div className={isRTL ? 'text-left' : 'text-right'}>
                <span className="text-white font-bold">{player.currentXP}</span>
                <span className="text-white/40"> / {player.requiredXP} {t('xp')}</span>
                <span className="text-purple-300 ml-1.5 font-mono">({xpPercent}%)</span>
              </div>
            </div>

            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-600 via-purple-400 to-cyan-300 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-orbitron text-white/40 mt-2">
              <span>{t('nextThreshold')} {player.level + 1}</span>
              <span>{t('needXP')} {Math.max(0, player.requiredXP - player.currentXP)} {t('xp')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout: Work Timer & Today's Immediate Objectives */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Work Timer (Hero Productivity Element) */}
        <div className="lg:col-span-7 flex flex-col">
          <WorkTimer
            onSessionComplete={onSessionComplete}
            onEnterFocusMode={onEnterFocusMode}
            onTimerStarted={onTimerStarted}
            todayFocusMinutes={todayFocusMinutes}
            streak={player.streak}
          />
        </div>

        {/* Right: Today's Actionable Status & Objectives */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="relative bg-white/5 rounded-3xl border border-white/10 p-6 backdrop-blur-xl shadow-2xl flex flex-col justify-between h-full overflow-hidden">
            <div className="hud-corner-tl" />
            <div className="hud-corner-tr" />
            <div className="hud-corner-bl" />
            <div className="hud-corner-br" />

            <div>
              {/* Header & Quick Action */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white font-cinzel tracking-wider">
                    {t('todayObjectives')}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                    onOpenNewQuestModal();
                  }}
                  className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                  title={t('quickQuest')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Daily Clear Progress Metric */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-4 flex items-center justify-between">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <span className="text-[10px] uppercase font-bold text-white/40 font-orbitron block">
                    {t('dailyClearRate')}
                  </span>
                  <span className="text-base font-black text-white font-orbitron">
                    {completedDailyCount}/{dailyQuests.length} <span className="text-xs font-normal text-white/40">{t('quests')}</span>
                  </span>
                </div>
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <span className="text-[10px] uppercase font-bold text-purple-400 font-orbitron block">
                    {t('unclaimedBounty')}
                  </span>
                  <span className="text-xs font-bold text-yellow-400 font-orbitron">
                    +{pendingXP} {t('xp')}
                  </span>
                </div>
              </div>

              {/* Immediate 3 Actionable Tasks */}
              <div className="space-y-2.5">
                {immediateObjectives.length === 0 ? (
                  <div className="py-8 text-center text-white/40">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm font-rajdhani text-white font-semibold">
                      {t('allQuestsCleared')}
                    </p>
                    <p className="text-xs text-white/40 font-rajdhani mt-0.5">
                      {t('allQuestsClearedSub')}
                    </p>
                  </div>
                ) : (
                  immediateObjectives.map((quest) => (
                    <div
                      key={quest.id}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all flex items-center justify-between group"
                    >
                      <div className={`flex-1 min-w-0 ${isRTL ? 'pl-3 text-right' : 'pr-3 text-left'}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold text-purple-400 font-orbitron uppercase">
                            [{quest.rank}-RANK]
                          </span>
                          <span className="text-[10px] text-white/40 font-mono">
                            +{quest.xpReward} {t('xp')}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate font-rajdhani group-hover:text-purple-200">
                          {quest.title}
                        </p>
                      </div>

                      {/* 1-Click Checkbox */}
                      <button
                        onClick={() => {
                          soundManager.playSound(SoundEvent.QUEST_COMPLETE);
                          onToggleQuest(quest.id);
                        }}
                        className="w-6 h-6 rounded-lg border-2 border-purple-500/40 hover:border-purple-400 bg-white/5 hover:bg-purple-500/20 flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title="Complete Objective"
                      >
                        <Check className="w-3 h-3 text-purple-300 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Link to Full Quests Page */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                  onNavigateTab('quests');
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white border border-white/10 text-xs font-semibold font-orbitron flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{t('viewAllQuests')}</span>
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
