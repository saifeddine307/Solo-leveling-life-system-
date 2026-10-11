import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  FolderGit2,
  Flag,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Sparkles,
  Coins,
  Swords,
  Layers,
  ArrowRight,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  HunterGoal,
  HunterProject,
  HunterMilestone,
  Quest,
  SoundEvent,
} from '../../types';
import { soundManager } from '../../utils/audio';

interface GoalsViewProps {
  goals: HunterGoal[];
  projects: HunterProject[];
  milestones: HunterMilestone[];
  quests: Quest[];
  onOpenCreateModal: (mode: 'goal' | 'project' | 'milestone', initialData?: any) => void;
  onDeleteGoal: (goalId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDeleteMilestone: (milestoneId: string) => void;
  onCompleteMilestone: (milestoneId: string) => void;
  onToggleQuest: (questId: string) => void;
  onAddQuestForProject?: (projectId: string, goalId?: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  projects,
  milestones,
  quests,
  onOpenCreateModal,
  onDeleteGoal,
  onDeleteProject,
  onDeleteMilestone,
  onCompleteMilestone,
  onToggleQuest,
  onAddQuestForProject,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    goals.forEach((g) => {
      initial[g.id] = true;
    });
    return initial;
  });

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    projects.forEach((p) => {
      initial[p.id] = true;
    });
    return initial;
  });

  const toggleGoalExpand = (goalId: string) => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setExpandedGoals((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const toggleProjectExpand = (projectId: string) => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    setExpandedProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  // Filtered Goals
  const filteredGoals = goals.filter((g) => {
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    return true;
  });

  // Calculate dynamic objective progress from child milestones & quests
  const getGoalProgress = (goal: HunterGoal): number => {
    const childProjects = projects.filter((p) => p.goalId === goal.id);
    const childProjectIds = childProjects.map((p) => p.id);
    const childMilestones = milestones.filter(
      (m) => m.goalId === goal.id || (m.projectId && childProjectIds.includes(m.projectId))
    );
    const childQuests = quests.filter(
      (q) => q.goalId === goal.id || (q.projectId && childProjectIds.includes(q.projectId))
    );

    const totalItems = childMilestones.length + childQuests.length;
    if (totalItems === 0) return goal.progress || 0;

    const completedMilestones = childMilestones.filter((m) => m.completed).length;
    const completedQuests = childQuests.filter((q) => q.completed).length;
    return Math.round(((completedMilestones + completedQuests) / totalItems) * 100);
  };

  // Calculate project progress
  const getProjectProgress = (project: HunterProject): number => {
    const projectMilestones = milestones.filter((m) => m.projectId === project.id);
    const projectQuests = quests.filter((q) => q.projectId === project.id);
    const total = projectMilestones.length + projectQuests.length;
    if (total === 0) return project.progress || 0;

    const completedMilestones = projectMilestones.filter((m) => m.completed).length;
    const completedQuests = projectQuests.filter((q) => q.completed).length;
    return Math.round(((completedMilestones + completedQuests) / total) * 100);
  };

  // Metrics
  const activeGoalsCount = goals.filter((g) => g.status === 'active').length;
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const completedMilestonesCount = milestones.filter((m) => m.completed).length;
  const totalMilestonesCount = milestones.length;

  return (
    <div className="space-y-6">
      {/* Top Hierarchy HUD Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/5 border border-purple-500/20 backdrop-blur-md">
          <div className="flex items-center justify-between text-purple-400 mb-1">
            <span className="text-[11px] font-bold font-orbitron uppercase tracking-wider">
              Strategic Objectives
            </span>
            <Target className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white font-cinzel">
            {activeGoalsCount}
            <span className="text-xs text-white/40 ml-1 font-rajdhani font-normal">Active</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-cyan-500/20 backdrop-blur-md">
          <div className="flex items-center justify-between text-cyan-400 mb-1">
            <span className="text-[11px] font-bold font-orbitron uppercase tracking-wider">
              Campaigns & Projects
            </span>
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white font-cinzel">
            {activeProjectsCount}
            <span className="text-xs text-white/40 ml-1 font-rajdhani font-normal">Active</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-amber-500/20 backdrop-blur-md">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[11px] font-bold font-orbitron uppercase tracking-wider">
              Milestones Conquered
            </span>
            <Flag className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white font-cinzel">
            {completedMilestonesCount}
            <span className="text-xs text-white/40 ml-1 font-rajdhani font-normal">
              / {totalMilestonesCount} Trials
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-emerald-500/20 backdrop-blur-md">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[11px] font-bold font-orbitron uppercase tracking-wider">
              Directives Attached
            </span>
            <Swords className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white font-cinzel">
            {quests.filter((q) => q.goalId || q.projectId).length}
            <span className="text-xs text-white/40 ml-1 font-rajdhani font-normal">Linked Quests</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
          {(['all', 'active', 'completed', 'paused'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                setStatusFilter(st);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-orbitron uppercase tracking-wider capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              soundManager.playSound(SoundEvent.SYSTEM_OPEN);
              onOpenCreateModal('project');
            }}
            className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-orbitron uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Campaign</span>
          </button>

          <button
            onClick={() => {
              soundManager.playSound(SoundEvent.SYSTEM_OPEN);
              onOpenCreateModal('goal');
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-xs font-bold font-orbitron uppercase tracking-wider shadow-lg shadow-purple-600/30 border border-purple-400/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Objective</span>
          </button>
        </div>
      </div>

      {/* Strategic Goals & Campaigns Hierarchy */}
      {filteredGoals.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white/5 border border-white/10 text-center backdrop-blur-xl">
          <Target className="w-12 h-12 text-purple-400/50 mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-black text-white font-cinzel tracking-wider">
            No Strategic Objectives Active
          </h3>
          <p className="text-xs text-white/50 font-rajdhani max-w-md mx-auto mt-1 mb-6">
            Real progress requires long-range vision. Establish a master objective, partition it
            into structured campaigns, and conquer milestones.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                onOpenCreateModal('goal', {
                  goal: {
                    title: 'Awaken Kinetic Motion Design Mastery',
                    category: 'Motion Design',
                    description: 'Build a top-tier showreel and conquer high-velocity typography.',
                    weeklyHoursTarget: 15,
                  },
                });
              }}
              className="px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold font-orbitron cursor-pointer transition-all"
            >
              + Template: Motion Design Mastery
            </button>
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                onOpenCreateModal('goal', {
                  goal: {
                    title: 'Iron Physique & Endurance Protocol',
                    category: 'Fitness',
                    description: 'Reach 100 consecutive pushups, sub-12% bodyfat, and daily conditioning.',
                    weeklyHoursTarget: 7,
                  },
                });
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-orbitron cursor-pointer transition-all"
            >
              + Template: Physical Conditioning
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGoals.map((goal) => {
            const isExpanded = expandedGoals[goal.id] ?? true;
            const progress = getGoalProgress(goal);
            const childProjects = projects.filter((p) => p.goalId === goal.id);
            const goalMilestones = milestones.filter((m) => m.goalId === goal.id);
            const directGoalQuests = quests.filter((q) => q.goalId === goal.id && !q.projectId);

            return (
              <div
                key={goal.id}
                className="relative bg-white/5 rounded-3xl border border-purple-500/30 p-5 sm:p-6 backdrop-blur-xl shadow-xl overflow-hidden"
              >
                <div className="hud-corner-tl" />
                <div className="hud-corner-tr" />
                <div className="hud-corner-bl" />
                <div className="hud-corner-br" />

                {/* Goal Card Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-start gap-3.5">
                    <button
                      onClick={() => toggleGoalExpand(goal.id)}
                      className="p-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 mt-0.5 cursor-pointer transition-colors shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-purple-600/30 border border-purple-400/30 text-[10px] font-black text-purple-300 font-orbitron uppercase tracking-wider">
                          {goal.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-orbitron uppercase tracking-wider ${
                            goal.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : goal.status === 'paused'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {goal.status}
                        </span>
                        {goal.targetDate && (
                          <span className="text-[11px] text-white/50 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-purple-400" />
                            {goal.targetDate}
                          </span>
                        )}
                        {goal.weeklyHoursTarget && (
                          <span className="text-[11px] text-white/50 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-purple-400" />
                            {goal.weeklyHoursTarget} hrs/wk
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-white font-cinzel tracking-wide">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-xs text-white/60 font-rajdhani mt-0.5 line-clamp-2">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Goal Actions & Progress Indicator */}
                  <div className="flex items-center gap-4 shrink-0 justify-between lg:justify-end">
                    <div className="text-right">
                      <div className="text-xs font-orbitron font-black text-purple-300">
                        {progress}%
                      </div>
                      <div className="w-24 sm:w-32 h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                          onOpenCreateModal('project', { project: { goalId: goal.id, category: goal.category } });
                        }}
                        title="Add Campaign to Objective"
                        className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 cursor-pointer transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                          onOpenCreateModal('goal', { goal });
                        }}
                        title="Edit Objective"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Dissolve objective: ${goal.title}?`)) {
                            soundManager.playSound(SoundEvent.WARNING);
                            onDeleteGoal(goal.id);
                          }
                        }}
                        title="Delete Objective"
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Goal Tree (Child Campaigns & Milestones) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4 pt-1"
                    >
                      {/* Direct Milestones under this Goal */}
                      {goalMilestones.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-amber-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-amber-300 font-orbitron uppercase tracking-wider flex items-center gap-1.5">
                              <Flag className="w-3.5 h-3.5 text-amber-400" />
                              Objective Trial Milestones
                            </span>
                            <button
                              onClick={() => {
                                soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                                onOpenCreateModal('milestone', { milestone: { goalId: goal.id } });
                              }}
                              className="text-[11px] text-amber-400 hover:text-amber-300 font-orbitron font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Add Trial
                            </button>
                          </div>

                          <div className="space-y-2">
                            {goalMilestones.map((ms) => (
                              <div
                                key={ms.id}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                  ms.completed
                                    ? 'bg-emerald-950/20 border-emerald-500/30'
                                    : 'bg-white/5 border-white/10 hover:border-amber-500/30'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <button
                                    onClick={() => {
                                      if (!ms.completed) {
                                        soundManager.playSound(SoundEvent.ACHIEVEMENT_UNLOCK);
                                        onCompleteMilestone(ms.id);
                                      }
                                    }}
                                    disabled={ms.completed}
                                    className={`p-1 rounded-lg transition-colors ${
                                      ms.completed
                                        ? 'text-emerald-400 cursor-default'
                                        : 'text-white/40 hover:text-amber-400 cursor-pointer'
                                    }`}
                                  >
                                    {ms.completed ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                      <Circle className="w-5 h-5" />
                                    )}
                                  </button>

                                  <div>
                                    <div
                                      className={`text-xs font-bold font-cinzel ${
                                        ms.completed ? 'text-white/50 line-through' : 'text-white'
                                      }`}
                                    >
                                      {ms.title}
                                    </div>
                                    {ms.description && (
                                      <div className="text-[11px] text-white/40 font-rajdhani">
                                        {ms.description}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-bold">
                                    +{ms.xpReward} XP
                                  </span>
                                  <button
                                    onClick={() => onDeleteMilestone(ms.id)}
                                    className="p-1 text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Direct Quests attached to Goal */}
                      {directGoalQuests.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-purple-500/20">
                          <div className="text-xs font-bold text-purple-300 font-orbitron uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Swords className="w-3.5 h-3.5 text-purple-400" />
                            Directives Assigned to Objective
                          </div>
                          <div className="space-y-1.5">
                            {directGoalQuests.map((q) => (
                              <div
                                key={q.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onToggleQuest(q.id)}
                                    className={`p-1 rounded cursor-pointer ${
                                      q.completed ? 'text-purple-400' : 'text-white/40 hover:text-white'
                                    }`}
                                  >
                                    {q.completed ? <Check className="w-4 h-4 text-purple-400" /> : <Circle className="w-4 h-4" />}
                                  </button>
                                  <span className={q.completed ? 'text-white/40 line-through' : 'text-white'}>
                                    {q.title}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-purple-300">
                                  +{q.xpReward} XP
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Child Campaigns / Projects */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-300 font-orbitron uppercase tracking-wider flex items-center gap-1.5">
                            <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                            Campaigns in this Objective ({childProjects.length})
                          </span>
                          <button
                            onClick={() => {
                              soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                              onOpenCreateModal('project', { project: { goalId: goal.id, category: goal.category } });
                            }}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-orbitron font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Add Campaign
                          </button>
                        </div>

                        {childProjects.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                            <p className="text-xs text-white/40 font-rajdhani">
                              No campaigns initialized yet. Create a project campaign to break down this objective.
                            </p>
                          </div>
                        ) : (
                          childProjects.map((proj) => {
                            const isProjExpanded = expandedProjects[proj.id] ?? true;
                            const projProgress = getProjectProgress(proj);
                            const projMilestones = milestones.filter((m) => m.projectId === proj.id);
                            const projQuests = quests.filter((q) => q.projectId === proj.id);

                            return (
                              <div
                                key={proj.id}
                                className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 backdrop-blur-md"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      onClick={() => toggleProjectExpand(proj.id)}
                                      className="p-1 rounded-lg text-cyan-400 hover:bg-white/5 cursor-pointer"
                                    >
                                      {isProjExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <div>
                                      <div className="text-xs sm:text-sm font-bold text-white font-cinzel">
                                        {proj.title}
                                      </div>
                                      {proj.description && (
                                        <div className="text-[11px] text-white/50 font-rajdhani">
                                          {proj.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                                    <div className="text-right">
                                      <span className="text-[11px] font-mono text-cyan-300 font-bold">
                                        {projProgress}%
                                      </span>
                                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden mt-0.5">
                                        <div
                                          className="h-full bg-cyan-400"
                                          style={{ width: `${projProgress}%` }}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                                          onOpenCreateModal('milestone', {
                                            milestone: { projectId: proj.id, goalId: goal.id },
                                          });
                                        }}
                                        title="Add Milestone Trial"
                                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                                          onOpenCreateModal('project', { project: proj });
                                        }}
                                        title="Edit Campaign"
                                        className="p-1.5 rounded-lg text-white/40 hover:text-white cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Delete campaign: ${proj.title}?`)) {
                                            onDeleteProject(proj.id);
                                          }
                                        }}
                                        title="Delete Campaign"
                                        className="p-1.5 rounded-lg text-rose-400/60 hover:text-rose-400 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Project Children (Milestones & Quests) */}
                                <AnimatePresence>
                                  {isProjExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="pt-3 space-y-2.5"
                                    >
                                      {/* Milestones inside this project */}
                                      {projMilestones.length > 0 && (
                                        <div className="space-y-1.5">
                                          <div className="text-[10px] font-bold text-amber-300/80 font-orbitron uppercase tracking-wider">
                                            Trial Stages
                                          </div>
                                          {projMilestones.map((ms) => (
                                            <div
                                              key={ms.id}
                                              className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-all ${
                                                ms.completed
                                                  ? 'bg-emerald-950/20 border-emerald-500/30'
                                                  : 'bg-white/5 border-white/5 hover:border-amber-500/30'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => {
                                                    if (!ms.completed) {
                                                      soundManager.playSound(SoundEvent.ACHIEVEMENT_UNLOCK);
                                                      onCompleteMilestone(ms.id);
                                                    }
                                                  }}
                                                  disabled={ms.completed}
                                                  className={
                                                    ms.completed
                                                      ? 'text-emerald-400'
                                                      : 'text-white/40 hover:text-amber-400 cursor-pointer'
                                                  }
                                                >
                                                  {ms.completed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                  ) : (
                                                    <Circle className="w-4 h-4" />
                                                  )}
                                                </button>
                                                <span
                                                  className={
                                                    ms.completed
                                                      ? 'text-white/40 line-through font-cinzel'
                                                      : 'text-white font-cinzel'
                                                  }
                                                >
                                                  {ms.title}
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-mono text-amber-300">
                                                  +{ms.xpReward} XP
                                                </span>
                                                <button
                                                  onClick={() => onDeleteMilestone(ms.id)}
                                                  className="p-1 text-white/30 hover:text-rose-400 cursor-pointer"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Linked Quests inside this project */}
                                      {projQuests.length > 0 && (
                                        <div className="space-y-1.5">
                                          <div className="text-[10px] font-bold text-cyan-300/80 font-orbitron uppercase tracking-wider">
                                            Assigned Directives
                                          </div>
                                          {projQuests.map((q) => (
                                            <div
                                              key={q.id}
                                              className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                                            >
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => onToggleQuest(q.id)}
                                                  className={`p-0.5 rounded cursor-pointer ${
                                                    q.completed ? 'text-cyan-400' : 'text-white/40 hover:text-white'
                                                  }`}
                                                >
                                                  {q.completed ? (
                                                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                                                  ) : (
                                                    <Circle className="w-3.5 h-3.5" />
                                                  )}
                                                </button>
                                                <span
                                                  className={
                                                    q.completed ? 'text-white/40 line-through' : 'text-white'
                                                  }
                                                >
                                                  {q.title}
                                                </span>
                                              </div>
                                              <span className="text-[10px] font-mono text-cyan-300">
                                                +{q.xpReward} XP
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Quick Actions for Campaign */}
                                      <div className="flex items-center gap-2 pt-1">
                                        <button
                                          onClick={() => {
                                            soundManager.playSound(SoundEvent.SYSTEM_OPEN);
                                            onOpenCreateModal('milestone', {
                                              milestone: { projectId: proj.id, goalId: goal.id },
                                            });
                                          }}
                                          className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1 font-orbitron cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          Add Trial Stage
                                        </button>
                                        {onAddQuestForProject && (
                                          <button
                                            onClick={() => onAddQuestForProject(proj.id, goal.id)}
                                            className="text-[11px] text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1 font-orbitron cursor-pointer ml-3"
                                          >
                                            <Plus className="w-3 h-3" />
                                            Attach Quest
                                          </button>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
