import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Swords, Zap, Coins, Sparkles, Target, FolderGit2 } from 'lucide-react';
import { Quest, QuestType, RankTier, SoundEvent, HunterGoal, HunterProject } from '../types';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuest: (newQuest: Omit<Quest, 'id' | 'completed'>) => void;
  goals?: HunterGoal[];
  projects?: HunterProject[];
  initialPreset?: { projectId?: string; goalId?: string };
}

export const QuestModal: React.FC<QuestModalProps> = ({
  isOpen,
  onClose,
  onAddQuest,
  goals = [],
  projects = [],
  initialPreset,
}) => {
  const { t, isRTL } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<QuestType>('daily');
  const [rank, setRank] = useState<RankTier>('B');
  const [category, setCategory] = useState<Quest['category']>('Motion Design');
  const [xpReward, setXpReward] = useState(300);
  const [goldReward, setGoldReward] = useState(500);
  const [statPointsReward, setStatPointsReward] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (initialPreset?.goalId) {
      setSelectedGoalId(initialPreset.goalId);
    }
    if (initialPreset?.projectId) {
      setSelectedProjectId(initialPreset.projectId);
      const parentProject = projects.find((p) => p.id === initialPreset.projectId);
      if (parentProject?.goalId) {
        setSelectedGoalId(parentProject.goalId);
      }
    }
  }, [initialPreset, projects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    soundManager.playSound(SoundEvent.QUEST_COMPLETE);
    onAddQuest({
      title: title.trim(),
      description: description.trim() || 'System generated objective for hunter growth.',
      type,
      rank,
      category,
      xpReward: Number(xpReward) || 100,
      goldReward: Number(goldReward) || 200,
      statPointsReward: Number(statPointsReward) || 0,
      dueDate: dueDate.trim() || undefined,
      goalId: selectedGoalId || undefined,
      projectId: selectedProjectId || undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setSelectedGoalId('');
    setSelectedProjectId('');
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
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Quest Creation Hologram Form */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-lg bg-[#0d0b14]/95 border border-purple-500/30 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/80 overflow-hidden"
        >
          <div className="hud-corner-tl" />
          <div className="hud-corner-tr" />
          <div className="hud-corner-bl" />
          <div className="hud-corner-br" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Swords className="w-4 h-4" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h2 className="text-base font-bold text-white font-cinzel tracking-wider">
                  {t('issueQuest')}
                </h2>
                <p className="text-[11px] text-white/40 font-rajdhani">
                  {t('commissionQuestDesc')}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/80 font-rajdhani uppercase block mb-1">
                {t('questTitle')} *
              </label>
              <input
                type="text"
                required
                placeholder={t('questTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400 font-rajdhani"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/80 font-rajdhani uppercase block mb-1">
                {t('missionDescription')}
              </label>
              <textarea
                rows={2}
                placeholder={t('missionDescPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400 font-rajdhani"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-white/70 font-rajdhani uppercase block mb-1">
                  {t('questType')}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as QuestType)}
                  className="w-full bg-[#12101e] border border-white/10 rounded-2xl px-2.5 py-2 text-xs text-purple-200 focus:outline-none focus:border-purple-400 font-orbitron cursor-pointer"
                >
                  <option value="daily">{t('dailyTrial')}</option>
                  <option value="weekly">{t('weeklyRaids')}</option>
                  <option value="penalty">{t('penaltyZone')}</option>
                  <option value="boss">{t('bossRaid')}</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/70 font-rajdhani uppercase block mb-1">
                  {t('difficultyRank')}
                </label>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value as RankTier)}
                  className="w-full bg-[#12101e] border border-white/10 rounded-2xl px-2.5 py-2 text-xs text-purple-200 focus:outline-none focus:border-purple-400 font-orbitron cursor-pointer"
                >
                  <option value="E">E-Rank</option>
                  <option value="D">D-Rank</option>
                  <option value="C">C-Rank</option>
                  <option value="B">B-Rank</option>
                  <option value="A">A-Rank</option>
                  <option value="S">S-Rank</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/70 font-rajdhani uppercase block mb-1">
                  {t('category')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Quest['category'])}
                  className="w-full bg-[#12101e] border border-white/10 rounded-2xl px-2.5 py-2 text-xs text-purple-200 focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="Motion Design">Motion Design</option>
                  <option value="Editing Speed">Editing Speed</option>
                  <option value="Portfolio">Portfolio</option>
                  <option value="Client Acquisition">Client Acquisition</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Life">Life</option>
                </select>
              </div>
            </div>

            {/* Strategic Objective & Campaign Assignment */}
            {(goals.length > 0 || projects.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div>
                  <label className="text-[10px] font-bold text-purple-300 font-orbitron uppercase flex items-center gap-1 mb-1">
                    <Target className="w-3 h-3 text-purple-400" />
                    Objective Link
                  </label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full bg-[#12101e] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-purple-200 focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    <option value="">None (Independent Directive)</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-cyan-300 font-orbitron uppercase flex items-center gap-1 mb-1">
                    <FolderGit2 className="w-3 h-3 text-cyan-400" />
                    Campaign Link
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      const projId = e.target.value;
                      setSelectedProjectId(projId);
                      const proj = projects.find((p) => p.id === projId);
                      if (proj?.goalId) {
                        setSelectedGoalId(proj.goalId);
                      }
                    }}
                    className="w-full bg-[#12101e] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">None (Independent Directive)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Rewards */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <label className="text-[10px] font-bold text-purple-400 uppercase font-orbitron flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3" /> {t('xpGain')}
                </label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                  className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-2 py-1.5 text-xs text-purple-300 font-orbitron"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-yellow-400 uppercase font-orbitron flex items-center gap-1 mb-1">
                  <Coins className="w-3 h-3" /> {t('gold')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={goldReward}
                  onChange={(e) => setGoldReward(Number(e.target.value))}
                  className="w-full bg-white/5 border border-yellow-500/30 rounded-xl px-2 py-1.5 text-xs text-yellow-300 font-orbitron"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase font-orbitron flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3" /> {t('sp')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={statPointsReward}
                  onChange={(e) => setStatPointsReward(Number(e.target.value))}
                  className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-2 py-1.5 text-xs text-purple-200 font-orbitron"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-600/30 border border-purple-400/40 flex items-center justify-center gap-1.5 cursor-pointer font-orbitron uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" /> {t('issueQuest')}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.playSound(SoundEvent.SYSTEM_CLOSE);
                  onClose();
                }}
                className="py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs border border-white/10 cursor-pointer font-orbitron uppercase tracking-wider"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
