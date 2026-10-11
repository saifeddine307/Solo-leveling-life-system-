import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Plus,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Swords,
  Trophy,
  Calendar,
  Sparkles,
  Target,
  FolderGit2,
  Flag,
  Layers,
} from 'lucide-react';
import { Quest, SoundEvent, HunterGoal, HunterProject, HunterMilestone } from '../../types';
import { soundManager } from '../../utils/audio';
import { useI18n } from '../../i18n';
import { GoalsView } from '../goals/GoalsView';
import { GoalHierarchyModal, HierarchyModalMode } from '../goals/GoalHierarchyModal';

interface QuestsPageProps {
  quests: Quest[];
  goals?: HunterGoal[];
  projects?: HunterProject[];
  milestones?: HunterMilestone[];
  onToggleQuest: (questId: string) => void;
  onDeleteQuest: (questId: string) => void;
  onOpenNewQuestModal: (preset?: { projectId?: string; goalId?: string }) => void;
  onSaveGoal?: (goal: Partial<HunterGoal>) => void;
  onDeleteGoal?: (goalId: string) => void;
  onSaveProject?: (project: Partial<HunterProject>) => void;
  onDeleteProject?: (projectId: string) => void;
  onSaveMilestone?: (milestone: Partial<HunterMilestone>) => void;
  onDeleteMilestone?: (milestoneId: string) => void;
  onCompleteMilestone?: (milestoneId: string) => void;
}

const getQuestAccentBorder = (quest: Quest) => {
  if (quest.type === 'penalty') return 'border-l-rose-500';
  if (quest.type === 'monthly' || quest.rank === 'National' || quest.rank === 'Monarch') return 'border-l-amber-400';
  if (quest.type === 'weekly' || quest.rank === 'S') return 'border-l-yellow-500';
  if (quest.category === 'Editing Speed' || quest.rank === 'A') return 'border-l-cyan-400';
  return 'border-l-purple-500';
};

export const QuestsPage: React.FC<QuestsPageProps> = ({
  quests,
  goals = [],
  projects = [],
  milestones = [],
  onToggleQuest,
  onDeleteQuest,
  onOpenNewQuestModal,
  onSaveGoal,
  onDeleteGoal,
  onSaveProject,
  onDeleteProject,
  onSaveMilestone,
  onDeleteMilestone,
  onCompleteMilestone,
}) => {
  const { t, isRTL } = useI18n();
  const [viewMode, setViewMode] = useState<'tactical' | 'strategic'>('tactical');
  const [tab, setTab] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'penalty'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for Goals/Projects/Milestones
  const [hierarchyModal, setHierarchyModal] = useState<{
    isOpen: boolean;
    mode: HierarchyModalMode;
    initialData?: any;
  }>({
    isOpen: false,
    mode: 'goal',
  });

  const handleOpenHierarchyModal = (mode: HierarchyModalMode, initialData?: any) => {
    setHierarchyModal({
      isOpen: true,
      mode,
      initialData,
    });
  };

  const handleCloseHierarchyModal = () => {
    setHierarchyModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Filter logic for quests
  const filteredQuests = quests.filter((q) => {
    // Tab filter
    if (tab !== 'all' && q.type !== tab) return false;

    // Category filter
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;

    // Status filter
    if (statusFilter === 'active' && q.completed) return false;
    if (statusFilter === 'completed' && !q.completed) return false;

    // Search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        q.title.toLowerCase().includes(query) ||
        q.description.toLowerCase().includes(query) ||
        q.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const penaltyQuest = quests.find((q) => q.type === 'penalty' && !q.completed);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & High-Level View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wider flex items-center gap-2.5">
            {viewMode === 'tactical' ? (
              <Swords className="w-6 h-6 text-purple-400" />
            ) : (
              <Target className="w-6 h-6 text-cyan-400" />
            )}
            {viewMode === 'tactical' ? t('questsBoard') : 'Strategic Objectives & Hierarchy'}
          </h2>
          <p className="text-xs text-white/50 font-rajdhani mt-0.5">
            {viewMode === 'tactical'
              ? t('questsSubtitle')
              : 'Long-term directional ambition, structured campaigns, and trial checkpoints.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Master View Mode Switcher */}
          <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                setViewMode('tactical');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-orbitron flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'tactical'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Directives</span>
            </button>

            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                setViewMode('strategic');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-orbitron flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'strategic'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Hierarchy</span>
            </button>
          </div>

          {viewMode === 'tactical' && (
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                onOpenNewQuestModal();
              }}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-600/30 border border-purple-400/30 flex items-center justify-center gap-2 cursor-pointer font-orbitron uppercase tracking-wider transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('issueQuest')}</span>
            </button>
          )}
        </div>
      </div>

      {/* STRATEGIC OBJECTIVES & HIERARCHY VIEW */}
      {viewMode === 'strategic' ? (
        <GoalsView
          goals={goals}
          projects={projects}
          milestones={milestones}
          quests={quests}
          onOpenCreateModal={handleOpenHierarchyModal}
          onDeleteGoal={onDeleteGoal || (() => {})}
          onDeleteProject={onDeleteProject || (() => {})}
          onDeleteMilestone={onDeleteMilestone || (() => {})}
          onCompleteMilestone={onCompleteMilestone || (() => {})}
          onToggleQuest={onToggleQuest}
          onAddQuestForProject={(projectId, goalId) => onOpenNewQuestModal({ projectId, goalId })}
        />
      ) : (
        /* TACTICAL DIRECTIVES MATRIX (Quests Board) */
        <>
          {/* Emergency Penalty Zone Warning if active */}
          {penaltyQuest && (
            <div className="p-4 rounded-3xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3.5 shadow-xl shadow-rose-950/50">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-300 font-cinzel uppercase tracking-wider">
                    {t('penaltyProtocol')}
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 font-bold">{t('expiresMidnight')}</span>
                </div>
                <p className="text-xs text-rose-200/90 mt-1">
                  {penaltyQuest.title} — {penaltyQuest.description}
                </p>
              </div>
            </div>
          )}

          {/* Controls Container: Tabs, Search & Filters */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-4">
            {/* Type Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'daily', 'weekly', 'monthly', 'penalty'] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => {
                    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                    setTab(tabKey);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-orbitron transition-all uppercase cursor-pointer shrink-0 border ${
                    tab === tabKey
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tabKey === 'all'
                    ? t('allQuests')
                    : tabKey === 'daily'
                    ? t('dailyQuests')
                    : tabKey === 'weekly'
                    ? t('weeklyRaids')
                    : tabKey === 'monthly'
                    ? t('monthlyAscension')
                    : t('penaltyZone')}
                </button>
              ))}
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchQuestsPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#12101e] border border-white/10 rounded-2xl px-3 py-2 text-xs text-purple-200 focus:outline-none focus:border-purple-400 font-rajdhani cursor-pointer"
                >
                  <option value="all">{t('allCategories')}</option>
                  <option value="Motion Design">Motion Design</option>
                  <option value="Editing Speed">Editing Speed</option>
                  <option value="Portfolio">Portfolio</option>
                  <option value="Client Acquisition">Client Acquisition</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Life">Life</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[#12101e] border border-white/10 rounded-2xl px-3 py-2 text-xs text-purple-200 focus:outline-none focus:border-purple-400 font-rajdhani cursor-pointer"
                >
                  <option value="all">{t('allStatus')}</option>
                  <option value="active">{t('activeOnly')}</option>
                  <option value="completed">{t('completedOnly')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quests List Container */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredQuests.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white/5 border border-white/10 text-center backdrop-blur-xl">
                  <Swords className="w-10 h-10 text-purple-400/50 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white font-cinzel tracking-wider">
                    {t('noQuestsFound')}
                  </h3>
                  <p className="text-xs text-white/50 font-rajdhani mt-1">
                    {searchQuery ? 'Adjust your filters or query.' : t('commissionQuestDesc')}
                  </p>
                  <button
                    onClick={() => {
                      soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                      onOpenNewQuestModal();
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold font-orbitron transition-all cursor-pointer"
                  >
                    + {t('issueQuest')}
                  </button>
                </div>
              ) : (
                filteredQuests.map((quest) => {
                  const borderLeftClass = getQuestAccentBorder(quest);
                  const parentGoal = quest.goalId ? goals.find((g) => g.id === quest.goalId) : null;
                  const parentProject = quest.projectId ? projects.find((p) => p.id === quest.projectId) : null;

                  return (
                    <motion.div
                      key={quest.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-5 rounded-2xl bg-white/5 border-l-4 ${borderLeftClass} border-y border-r border-white/10 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white/10 transition-all ${
                        quest.completed ? 'opacity-55' : ''
                      }`}
                    >
                      <div className={`flex-1 min-w-0 ${isRTL ? 'pl-2 text-right' : 'pr-2 text-left'}`}>
                        {/* Top Metadata Row */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-purple-400 font-orbitron uppercase tracking-wider">
                            [{quest.rank}-RANK]
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 border border-white/10 text-white/70 font-rajdhani">
                            {quest.category}
                          </span>
                          {parentGoal && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 font-orbitron flex items-center gap-1">
                              <Target className="w-2.5 h-2.5 text-purple-400" />
                              {parentGoal.title}
                            </span>
                          )}
                          {parentProject && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-orbitron flex items-center gap-1">
                              <FolderGit2 className="w-2.5 h-2.5 text-cyan-400" />
                              {parentProject.title}
                            </span>
                          )}
                          {quest.type === 'weekly' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-orbitron flex items-center gap-1">
                              <Trophy className="w-2.5 h-2.5" /> {t('weeklyRaids')}
                            </span>
                          )}
                          {quest.type === 'monthly' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 font-orbitron flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" /> {t('monthlyAscension')}
                            </span>
                          )}
                          {quest.dueDate && !quest.completed && (
                            <span className="text-[10px] text-white/40 font-mono">
                              {t('due')}: {quest.dueDate}
                            </span>
                          )}
                          {quest.rewardClaimed && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-orbitron flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                              {t('rewardClaimedBadge')}
                            </span>
                          )}
                        </div>

                        {/* Quest Title */}
                        <h3
                          className={`text-sm sm:text-base font-bold font-rajdhani text-white transition-colors ${
                            quest.completed ? 'line-through text-white/40' : 'group-hover:text-purple-200'
                          }`}
                        >
                          {quest.title}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-white/60 font-rajdhani mt-1 line-clamp-2">
                          {quest.description}
                        </p>

                        {/* Rewards Row */}
                        <div className="mt-2.5 flex items-center gap-3 text-[11px] font-orbitron text-white/50 flex-wrap">
                          <span className="text-purple-300 font-bold">+{quest.xpReward} {t('xp')}</span>
                          <span>•</span>
                          <span className="text-yellow-400 font-bold">+{quest.goldReward} {t('gold')}</span>
                          {quest.statPointsReward ? (
                            <>
                              <span>•</span>
                              <span className="text-amber-300 font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-300" />
                                +{quest.statPointsReward} {t('statPoints')}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {/* Actions Right */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {/* Delete */}
                        <button
                          onClick={() => {
                            soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                            onDeleteQuest(quest.id);
                          }}
                          className="p-2 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="Delete Quest"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Interactive Checkbox */}
                        <button
                          onClick={() => {
                            onToggleQuest(quest.id);
                          }}
                          className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                            quest.completed
                              ? 'border-purple-500 bg-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                              : 'border-purple-500/40 hover:border-purple-400 bg-white/5'
                          }`}
                          title={quest.completed ? 'Mark incomplete' : 'Complete Quest'}
                        >
                          {quest.completed && (
                            <Check className="w-4 h-4 text-white stroke-[3]" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Goal / Project / Milestone Hierarchy Creation Modal */}
      <GoalHierarchyModal
        isOpen={hierarchyModal.isOpen}
        onClose={handleCloseHierarchyModal}
        mode={hierarchyModal.mode}
        initialData={hierarchyModal.initialData}
        goals={goals}
        projects={projects}
        onSaveGoal={(g) => {
          if (onSaveGoal) onSaveGoal(g);
        }}
        onSaveProject={(p) => {
          if (onSaveProject) onSaveProject(p);
        }}
        onSaveMilestone={(m) => {
          if (onSaveMilestone) onSaveMilestone(m);
        }}
      />
    </div>
  );
};
