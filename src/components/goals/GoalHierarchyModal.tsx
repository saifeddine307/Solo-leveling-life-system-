import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target, FolderGit2, Flag, Sparkles, Coins, Calendar, Clock, Layers } from 'lucide-react';
import { HunterGoal, HunterProject, HunterMilestone, SoundEvent } from '../../types';
import { soundManager } from '../../utils/audio';

export type HierarchyModalMode = 'goal' | 'project' | 'milestone';

interface GoalHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: HierarchyModalMode;
  initialData?: {
    goal?: Partial<HunterGoal>;
    project?: Partial<HunterProject>;
    milestone?: Partial<HunterMilestone>;
  };
  goals: HunterGoal[];
  projects: HunterProject[];
  onSaveGoal: (goal: Partial<HunterGoal>) => void;
  onSaveProject: (project: Partial<HunterProject>) => void;
  onSaveMilestone: (milestone: Partial<HunterMilestone>) => void;
}

const CATEGORIES = [
  'Motion Design',
  'Editing Speed',
  'Portfolio',
  'Client Acquisition',
  'Fitness',
  'Study',
  'Coding',
  'Life',
  'General',
];

export const GoalHierarchyModal: React.FC<GoalHierarchyModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialData,
  goals,
  projects,
  onSaveGoal,
  onSaveProject,
  onSaveMilestone,
}) => {
  const [activeMode, setActiveMode] = useState<HierarchyModalMode>(mode);

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalCategory, setGoalCategory] = useState('Motion Design');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [dailyHoursTarget, setDailyHoursTarget] = useState<number | ''>('');
  const [weeklyHoursTarget, setWeeklyHoursTarget] = useState<number | ''>(10);
  const [goalStatus, setGoalStatus] = useState<'active' | 'completed' | 'paused'>('active');

  // Project Form State
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectGoalId, setProjectGoalId] = useState('');
  const [projectCategory, setProjectCategory] = useState('Motion Design');
  const [projectStatus, setProjectStatus] = useState<'active' | 'completed' | 'paused'>('active');

  // Milestone Form State
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneProjectId, setMilestoneProjectId] = useState('');
  const [milestoneGoalId, setMilestoneGoalId] = useState('');
  const [milestoneXPReward, setMilestoneXPReward] = useState(100);
  const [milestoneGoldReward, setMilestoneGoldReward] = useState(80);

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData?.goal) {
      setGoalTitle(initialData.goal.title || '');
      setGoalDescription(initialData.goal.description || '');
      setGoalCategory(initialData.goal.category || 'Motion Design');
      setGoalTargetDate(initialData.goal.targetDate || '');
      setDailyHoursTarget(initialData.goal.dailyHoursTarget ?? '');
      setWeeklyHoursTarget(initialData.goal.weeklyHoursTarget ?? 10);
      setGoalStatus(initialData.goal.status || 'active');
    } else {
      setGoalTitle('');
      setGoalDescription('');
      setGoalCategory('Motion Design');
      setGoalTargetDate('');
      setDailyHoursTarget('');
      setWeeklyHoursTarget(10);
      setGoalStatus('active');
    }

    if (initialData?.project) {
      setProjectTitle(initialData.project.title || '');
      setProjectDescription(initialData.project.description || '');
      setProjectGoalId(initialData.project.goalId || (goals[0]?.id ?? ''));
      setProjectCategory(initialData.project.category || 'Motion Design');
      setProjectStatus(initialData.project.status || 'active');
    } else {
      setProjectTitle('');
      setProjectDescription('');
      setProjectGoalId(goals[0]?.id ?? '');
      setProjectCategory('Motion Design');
      setProjectStatus('active');
    }

    if (initialData?.milestone) {
      setMilestoneTitle(initialData.milestone.title || '');
      setMilestoneDescription(initialData.milestone.description || '');
      setMilestoneProjectId(initialData.milestone.projectId || (projects[0]?.id ?? ''));
      setMilestoneGoalId(initialData.milestone.goalId || (goals[0]?.id ?? ''));
      setMilestoneXPReward(initialData.milestone.xpReward ?? 100);
      setMilestoneGoldReward(initialData.milestone.goldReward ?? 80);
    } else {
      setMilestoneTitle('');
      setMilestoneDescription('');
      setMilestoneProjectId(projects[0]?.id ?? '');
      setMilestoneGoalId(goals[0]?.id ?? '');
      setMilestoneXPReward(100);
      setMilestoneGoldReward(80);
    }
  }, [isOpen, initialData, goals, projects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeMode === 'goal') {
      if (!goalTitle.trim()) return;
      onSaveGoal({
        id: initialData?.goal?.id,
        title: goalTitle.trim(),
        description: goalDescription.trim(),
        category: goalCategory,
        targetDate: goalTargetDate || undefined,
        dailyHoursTarget: dailyHoursTarget === '' ? undefined : Number(dailyHoursTarget),
        weeklyHoursTarget: weeklyHoursTarget === '' ? undefined : Number(weeklyHoursTarget),
        status: goalStatus,
      });
    } else if (activeMode === 'project') {
      if (!projectTitle.trim()) return;
      onSaveProject({
        id: initialData?.project?.id,
        goalId: projectGoalId || undefined,
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        category: projectCategory,
        status: projectStatus,
      });
    } else if (activeMode === 'milestone') {
      if (!milestoneTitle.trim()) return;
      onSaveMilestone({
        id: initialData?.milestone?.id,
        projectId: milestoneProjectId || undefined,
        goalId: milestoneGoalId || undefined,
        title: milestoneTitle.trim(),
        description: milestoneDescription.trim(),
        xpReward: Number(milestoneXPReward) || 100,
        goldReward: Number(milestoneGoldReward) || 80,
      });
    }

    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    onClose();
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
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          className="relative z-10 w-full max-w-xl bg-[#0d0b14]/95 border border-purple-500/30 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/80 overflow-hidden"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                {activeMode === 'goal' && <Target className="w-5 h-5 text-purple-400" />}
                {activeMode === 'project' && <FolderGit2 className="w-5 h-5 text-cyan-400" />}
                {activeMode === 'milestone' && <Flag className="w-5 h-5 text-amber-400" />}
              </div>
              <div>
                <h2 className="text-base font-black text-white font-cinzel tracking-wider uppercase">
                  {initialData?.goal?.id || initialData?.project?.id || initialData?.milestone?.id
                    ? 'Calibrate Strategic Asset'
                    : 'Commission Strategic Asset'}
                </h2>
                <p className="text-xs text-white/40 font-rajdhani">
                  Establish real-world productivity milestones & structural campaigns
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                onClose();
              }}
              className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hierarchy Level Selector Tabs */}
          {!initialData?.goal?.id && !initialData?.project?.id && !initialData?.milestone?.id && (
            <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-white/5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                  setActiveMode('goal');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold font-orbitron flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'goal'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Objective</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                  setActiveMode('project');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold font-orbitron flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'project'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/40'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Campaign</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                  setActiveMode('milestone');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold font-orbitron flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'milestone'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Milestone</span>
              </button>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* --- GOAL MODE --- */}
            {activeMode === 'goal' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-purple-300 font-orbitron uppercase tracking-wider mb-1.5">
                    Objective Title
                  </label>
                  <input
                    type="text"
                    required
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g. Master High-End Kinetic Typography"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-purple-500 text-sm font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-300 font-orbitron uppercase tracking-wider mb-1.5">
                    Description & Scope
                  </label>
                  <textarea
                    rows={2}
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder="Key real-world outcomes, standards, and deliverables..."
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-purple-500 text-xs font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-300 font-orbitron uppercase tracking-wider mb-1.5">
                      Domain Category
                    </label>
                    <select
                      value={goalCategory}
                      onChange={(e) => setGoalCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#13111c] border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-300 font-orbitron uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={goalTargetDate}
                      onChange={(e) => setGoalTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-300 font-orbitron uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      Weekly Hours Target
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="80"
                      value={weeklyHoursTarget}
                      onChange={(e) => setWeeklyHoursTarget(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="10"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-300 font-orbitron uppercase tracking-wider mb-1.5">
                      Objective Status
                    </label>
                    <select
                      value={goalStatus}
                      onChange={(e) => setGoalStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#13111c] border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="active">Active Objective</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* --- PROJECT MODE --- */}
            {activeMode === 'project' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-cyan-300 font-orbitron uppercase tracking-wider mb-1.5">
                    Campaign / Project Title
                  </label>
                  <input
                    type="text"
                    required
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="e.g. 2026 Kinetic Showreel Production"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500 text-sm font-sans"
                  />
                </div>

                {goals.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-cyan-300 font-orbitron uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-cyan-400" />
                      Parent Strategic Objective
                    </label>
                    <select
                      value={projectGoalId}
                      onChange={(e) => setProjectGoalId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#13111c] border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="">None (Independent Project)</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title} ({g.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-cyan-300 font-orbitron uppercase tracking-wider mb-1.5">
                    Description & Deliverables
                  </label>
                  <textarea
                    rows={2}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Concrete outcomes, phases, and assets..."
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500 text-xs font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-cyan-300 font-orbitron uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={projectCategory}
                      onChange={(e) => setProjectCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#13111c] border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cyan-300 font-orbitron uppercase tracking-wider mb-1.5">
                      Project Status
                    </label>
                    <select
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#13111c] border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="active">Active Campaign</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* --- MILESTONE MODE --- */}
            {activeMode === 'milestone' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-amber-300 font-orbitron uppercase tracking-wider mb-1.5">
                    Milestone Stage Title
                  </label>
                  <input
                    type="text"
                    required
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    placeholder="e.g. Complete 5 Kinetic Typography Styleframes"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-amber-500 text-sm font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-amber-300 font-orbitron uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
                        Parent Project
                      </label>
                      <select
                        value={milestoneProjectId}
                        onChange={(e) => setMilestoneProjectId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#13111c] border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">None (General Trial)</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {goals.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-amber-300 font-orbitron uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        Parent Objective
                      </label>
                      <select
                        value={milestoneGoalId}
                        onChange={(e) => setMilestoneGoalId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#13111c] border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">None</option>
                        {goals.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 font-orbitron uppercase tracking-wider mb-1.5">
                    Completion Criteria
                  </label>
                  <textarea
                    rows={2}
                    value={milestoneDescription}
                    onChange={(e) => setMilestoneDescription(e.target.value)}
                    placeholder="Specific test or benchmark proving this trial is conquered..."
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-amber-500 text-xs font-sans resize-none"
                  />
                </div>

                {/* Milestone Conquering Rewards */}
                <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300 font-orbitron uppercase tracking-wider">
                      Trial Conquest Rewards (Immutable Ledger)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1">XP Granted</label>
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={milestoneXPReward}
                        onChange={(e) => setMilestoneXPReward(Number(e.target.value) || 50)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-amber-300 font-bold font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-400" />
                        Gold Granted
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={milestoneGoldReward}
                        onChange={(e) => setMilestoneGoldReward(Number(e.target.value) || 40)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-amber-300 font-bold font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white font-orbitron uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                  activeMode === 'goal'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-600/30'
                    : activeMode === 'project'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-cyan-600/30'
                    : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-600/30'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Confirm Protocol</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
