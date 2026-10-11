import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Shield, AlertTriangle, Plus, Trash2, Trophy, Swords } from 'lucide-react';
import { Quest, SoundEvent } from '../types';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';

interface QuestSectionProps {
  quests: Quest[];
  onToggleQuest: (questId: string) => void;
  onDeleteQuest: (questId: string) => void;
  onOpenNewQuestModal: () => void;
}

const getQuestAccentBorder = (quest: Quest) => {
  if (quest.type === 'penalty') return 'border-l-rose-500';
  if (quest.type === 'weekly' || quest.rank === 'S' || quest.rank === 'Monarch' || quest.rank === 'National') return 'border-l-yellow-500';
  if (quest.category === 'Editing Speed' || quest.rank === 'A') return 'border-l-cyan-400';
  return 'border-l-purple-500';
};

export const QuestSection: React.FC<QuestSectionProps> = ({
  quests,
  onToggleQuest,
  onDeleteQuest,
  onOpenNewQuestModal,
}) => {
  const { t, isRTL } = useI18n();
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'penalty'>('all');

  const filteredQuests = quests.filter((q) => {
    if (filter === 'all') return true;
    return q.type === filter;
  });

  const dailyQuests = quests.filter((q) => q.type === 'daily');
  const completedDailyCount = dailyQuests.filter((q) => q.completed).length;
  const dailyProgressPct = dailyQuests.length > 0 ? Math.round((completedDailyCount / dailyQuests.length) * 100) : 0;

  const penaltyQuest = quests.find((q) => q.type === 'penalty' && !q.completed);

  return (
    <div className="relative bg-white/5 rounded-3xl border border-white/10 p-6 sm:p-7 backdrop-blur-xl shadow-2xl flex flex-col h-full overflow-hidden">
      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
        <div className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 font-orbitron">
          <Swords className="w-4 h-4 text-purple-400" />
          <span>{t('activeQuests')}</span>
          <div className="h-[1px] w-12 sm:w-24 bg-purple-500/30" />
        </div>

        {/* Quest Filter Tabs & New Quest Button */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {(['all', 'daily', 'weekly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                setFilter(tab);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase font-orbitron transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-white/50 hover:text-purple-300'
              }`}
            >
              {tab === 'all' ? t('all') : tab === 'daily' ? t('daily') : t('weekly')}
            </button>
          ))}
          <button
            onClick={() => {
              soundManager.playSound(SoundEvent.SYSTEM_OPEN);
              onOpenNewQuestModal();
            }}
            className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30 transition-colors ml-1 cursor-pointer"
            title="Create Custom Quest"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Daily Quest Completion Gauge */}
      <div className="mb-3.5 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
        <span className="text-xs font-rajdhani font-semibold text-white/70">
          {t('dailyClearProgress')}: <strong className="text-white font-orbitron">{completedDailyCount}/{dailyQuests.length}</strong> {t('completed')}
        </span>
        <div className="w-28 sm:w-36 bg-white/10 rounded-full h-2 overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-white rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
            style={{ width: `${dailyProgressPct}%` }}
          />
        </div>
      </div>

      {/* Emergency Penalty Warning Box if any exists */}
      {penaltyQuest && (
        <div className="mb-3.5 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 shadow-lg shadow-rose-950/40 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 font-cinzel uppercase tracking-wider">
                {t('penaltyProtocol')}
              </span>
              <span className="text-[10px] font-mono text-rose-400 font-bold">{t('expiresMidnight')}</span>
            </div>
            <p className="text-xs text-rose-200/90 mt-0.5">
              {penaltyQuest.title}
            </p>
          </div>
        </div>
      )}

      {/* Quests List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px]">
        <AnimatePresence>
          {filteredQuests.length === 0 ? (
            <div className="py-10 text-center text-white/40">
              <Shield className="w-10 h-10 mx-auto mb-2 text-purple-500/40" />
              <p className="text-sm font-rajdhani">{t('noQuestsFound')}</p>
              <button
                onClick={onOpenNewQuestModal}
                className="mt-3 text-xs text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
              >
                + {t('issueQuest')}
              </button>
            </div>
          ) : (
            filteredQuests.map((quest) => {
              const borderLeftClass = getQuestAccentBorder(quest);
              return (
                <motion.div
                  key={quest.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 bg-white/5 border-l-4 ${borderLeftClass} rounded-r-xl flex justify-between items-center group hover:bg-white/10 transition-all border-y border-r border-white/5 ${
                    quest.completed ? 'opacity-50' : ''
                  }`}
                >
                  <div className={`flex-1 min-w-0 ${isRTL ? 'pl-3 text-right' : 'pr-3 text-left'}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold text-purple-400 font-orbitron uppercase tracking-wider">
                        [{quest.rank}-RANK]
                      </span>
                      {quest.type === 'weekly' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1 font-orbitron">
                          <Trophy className="w-2.5 h-2.5" /> {t('weekly')}
                        </span>
                      )}
                      {quest.dueDate && !quest.completed && (
                        <span className="text-[10px] text-white/40 font-mono">
                          {t('due')}: {quest.dueDate}
                        </span>
                      )}
                      {quest.rewardClaimed && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-orbitron">
                          <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                          {t('rewardClaimedBadge')}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-sm font-bold transition-all truncate font-rajdhani text-white ${
                        quest.completed ? 'line-through text-white/40' : 'group-hover:text-purple-200'
                      }`}
                    >
                      {quest.title}
                    </div>
                    <div className="text-[10px] text-white/40 uppercase font-mono mt-1 tracking-wider flex items-center gap-2">
                      <span>Reward: +{quest.xpReward} {t('xp')}</span>
                      <span>|</span>
                      <span>+{quest.goldReward} {t('gold')}</span>
                      {quest.statPointsReward ? (
                        <>
                          <span>|</span>
                          <span className="text-yellow-400">+{quest.statPointsReward} {t('sp')}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions Right: Delete & Checkbox */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                        onDeleteQuest(quest.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-950/50 text-white/40 hover:text-rose-400 transition-all cursor-pointer"
                      title="Dismiss Quest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Sophisticated Checkbox */}
                    <button
                      id={`checkbox-${quest.id}`}
                      onClick={() => {
                        onToggleQuest(quest.id);
                      }}
                      className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all cursor-pointer ${
                        quest.completed
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-purple-500/40 hover:border-purple-400 bg-white/5'
                      }`}
                      title={quest.completed ? 'Mark as incomplete' : 'Complete Quest'}
                    >
                      {quest.completed ? (
                        <div className="w-3 h-3 bg-purple-400 rounded-sm shadow-[0_0_8px_rgba(168,85,247,0.9)] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                        </div>
                      ) : null}
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Special Message Banner (Sophisticated Dark Motif) */}
      <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/40 to-transparent border border-purple-500/20 rounded-2xl">
        <div className="text-xs font-bold text-purple-300 uppercase mb-1 font-orbitron tracking-wider">
          {t('systemNotification')}
        </div>
        <p className="text-[11px] leading-relaxed text-white/70 italic font-serif">
          "{t('systemMonarchQuote')}"
        </p>
      </div>
    </div>
  );
};
