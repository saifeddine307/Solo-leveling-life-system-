import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import {
  Sparkles,
  Zap,
  Layers,
  Target,
  ChevronUp,
  Award,
  Trash2,
  Plus,
  X,
  Dumbbell,
  Code,
  BookOpen,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { SkillNode, PlayerStats, SoundEvent } from '../types';
import { soundManager } from '../utils/audio';
import { useI18n } from '../i18n';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface SkillRadarProps {
  skills: SkillNode[];
  player: PlayerStats;
  onUpgradeSkill: (skillId: string) => void;
  onDeleteSkill?: (skillId: string) => void;
  onAddSkill?: (skill: Partial<SkillNode>) => void;
}

const skillIcons: Record<string, React.ReactNode> = {
  'Motion Design': <Sparkles className="w-4 h-4 text-purple-400" />,
  'Editing Speed': <Zap className="w-4 h-4 text-cyan-400" />,
  'Portfolio': <Layers className="w-4 h-4 text-amber-400" />,
  'Client Acquisition': <Target className="w-4 h-4 text-rose-400" />,
  'Fitness': <Dumbbell className="w-4 h-4 text-rose-400" />,
  'Coding': <Code className="w-4 h-4 text-cyan-400" />,
  'Study': <BookOpen className="w-4 h-4 text-emerald-400" />,
  'Life': <Heart className="w-4 h-4 text-amber-400" />,
  'General': <Award className="w-4 h-4 text-purple-400" />,
};

const CATEGORY_OPTIONS = [
  'Motion Design',
  'Editing Speed',
  'Portfolio',
  'Client Acquisition',
  'Fitness',
  'Coding',
  'Study',
  'Life',
  'General',
];

export const SkillRadar: React.FC<SkillRadarProps> = ({
  skills,
  player,
  onUpgradeSkill,
  onDeleteSkill,
  onAddSkill,
}) => {
  const { t, isRTL } = useI18n();
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skills[0]?.id || '');
  const [deleteConfirmSkill, setDeleteConfirmSkill] = useState<SkillNode | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form state for creating a new skill
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState(CATEGORY_OPTIONS[0]);
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [newSkillBuff, setNewSkillBuff] = useState('');

  // Keep selectedSkillId synchronized if skills change or a skill gets deleted
  useEffect(() => {
    if (skills.length > 0) {
      if (!skills.some((s) => s.id === selectedSkillId)) {
        setSelectedSkillId(skills[0].id);
      }
    } else {
      setSelectedSkillId('');
    }
  }, [skills, selectedSkillId]);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) || skills[0];

  // Prepare radar chart data
  const hasEnoughSkillsForRadar = skills.length >= 3;
  const labels = skills.map((s) => s.name);
  const dataValues = skills.map((s) => (s.xpToNext > 0 ? (s.xp / s.xpToNext) * 100 : 0));

  const radarData = {
    labels,
    datasets: [
      {
        label: `${t('domainMastery')} (%)`,
        data: dataValues,
        backgroundColor: 'rgba(168, 85, 247, 0.28)',
        borderColor: '#c084fc',
        borderWidth: 2,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#a855f7',
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          color: 'rgba(168, 85, 247, 0.2)',
          lineWidth: 1,
        },
        grid: {
          color: 'rgba(56, 189, 248, 0.15)',
          circular: true,
        },
        pointLabels: {
          color: '#e2e8f0',
          font: {
            family: "'Rajdhani', sans-serif",
            size: 12,
            weight: 600,
          },
        },
        ticks: {
          display: false,
          min: 0,
          max: 100,
          stepSize: 20,
        },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(13, 11, 20, 0.95)',
        titleColor: '#c084fc',
        bodyColor: '#f1f5f9',
        borderColor: 'rgba(168, 85, 247, 0.4)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: { raw: unknown }) => `${t('domainMastery')}: ${context.raw}%`,
        },
      },
    },
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmSkill) return;
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
    if (onDeleteSkill) {
      onDeleteSkill(deleteConfirmSkill.id);
    }
    setDeleteConfirmSkill(null);
  };

  const handleAddSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    if (onAddSkill) {
      soundManager.playSound(SoundEvent.QUEST_COMPLETE);
      onAddSkill({
        name: newSkillName.trim(),
        category: newSkillCategory,
        description: newSkillDescription.trim() || `${newSkillName.trim()} proficiency`,
        buff: newSkillBuff.trim() || '+10% Focus Multiplier',
        level: 1,
        maxLevel: 10,
        xp: 0,
        xpToNext: 300,
      });
    }

    setNewSkillName('');
    setNewSkillDescription('');
    setNewSkillBuff('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="relative bg-white/5 rounded-3xl border border-white/10 p-6 sm:p-7 backdrop-blur-xl shadow-2xl flex flex-col h-full overflow-hidden">
      {/* Top Center System Badge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-1 bg-purple-600 text-[10px] font-black uppercase tracking-widest rounded-b-xl shadow-lg shadow-purple-500/20 text-white font-orbitron z-10">
        {t('skillTree')}
      </div>

      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 mt-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Award className="w-4 h-4" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-sm sm:text-base font-bold text-white font-cinzel tracking-wider">
              {t('skillTree')}
            </h2>
            <p className="text-[11px] text-white/50 font-rajdhani">
              {t('interactiveRadarMatrix')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onAddSkill && (
            <button
              id="btn-open-awaken-skill"
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                setIsAddModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/60 border border-purple-400/40 text-purple-200 hover:text-white text-xs font-bold font-orbitron transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
              title={t('awakenNewSkill')}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('awakenNewSkill')}</span>
            </button>
          )}

          <div className={isRTL ? 'text-left' : 'text-right'}>
            <span className="text-[10px] uppercase font-bold text-white/40 font-orbitron block">
              {t('availableStatPoints')}
            </span>
            <span className="text-xs font-bold text-yellow-400 font-orbitron">
              {player.statPoints} {t('sp')}
            </span>
          </div>
        </div>
      </div>

      {/* Radar Canvas Container or Empty State */}
      {skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center my-auto min-h-[220px]">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-3">
            <Award className="w-8 h-8 opacity-60 animate-pulse" />
          </div>
          <p className="text-sm font-bold text-white/80 font-rajdhani max-w-sm">
            {t('noSkillsInTree')}
          </p>
          {onAddSkill && (
            <button
              onClick={() => {
                soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                setIsAddModalOpen(true);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-orbitron transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t('awakenNewSkill')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="relative w-full h-56 sm:h-64 my-auto flex items-center justify-center">
          {hasEnoughSkillsForRadar ? (
            <Radar data={radarData} options={radarOptions} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4">
              <div className="w-28 h-28 rounded-full border border-dashed border-purple-500/40 flex items-center justify-center mb-3">
                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>
              <p className="text-xs text-white/60 font-rajdhani">
                {skills.map((s) => `${s.name} (T${s.level})`).join(' • ')}
              </p>
            </div>
          )}
          {/* Center aura */}
          <div className="absolute w-24 h-24 rounded-full border border-purple-500/20 pointer-events-none animate-pulse" />
        </div>
      )}

      {/* Skill Selector Chips */}
      {skills.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
          {skills.map((skill) => {
            const isSelected = skill.id === selectedSkillId;
            const pct = skill.xpToNext > 0 ? Math.round((skill.xp / skill.xpToNext) * 100) : 0;
            return (
              <button
                key={skill.id}
                id={`btn-select-skill-${skill.id}`}
                onClick={() => {
                  soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                  setSelectedSkillId(skill.id);
                }}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-950/60 border-purple-500 shadow-lg shadow-purple-500/20 scale-[1.02]'
                    : 'bg-white/5 border-white/10 hover:border-purple-500/40 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs">
                    {skillIcons[skill.category] || <Sparkles className="w-3.5 h-3.5" />}
                  </span>
                  <span className="text-[10px] font-bold font-orbitron text-purple-300">
                    {t('level')}.{skill.level}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate font-rajdhani">
                  {skill.name}
                </p>
                <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 via-purple-400 to-white h-full rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Skill Focus Card with Upgrade and Delete Controls */}
      {selectedSkill && (
        <div className="mt-auto p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 to-white/5 border border-purple-500/20 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white font-rajdhani tracking-wide">
                  {selectedSkill.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-orbitron">
                  Tier {selectedSkill.level}/{selectedSkill.maxLevel}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-white/60 font-rajdhani">
                  {selectedSkill.category}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                {selectedSkill.description}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-400 font-semibold font-rajdhani">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>
                  {t('activeBuff')}: {selectedSkill.buff}
                </span>
              </div>
            </div>

            {/* Action Buttons: Upgrade & Delete */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Upgrade Skill Button */}
              <button
                id={`btn-upgrade-skill-${selectedSkill.id}`}
                disabled={player.statPoints <= 0 || selectedSkill.level >= selectedSkill.maxLevel}
                onClick={() => {
                  soundManager.playSound(SoundEvent.XP_GAIN);
                  onUpgradeSkill(selectedSkill.id);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition-all min-w-[76px] cursor-pointer ${
                  player.statPoints > 0 && selectedSkill.level < selectedSkill.maxLevel
                    ? 'bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-600/30 active:scale-95 border border-purple-400/40 font-orbitron'
                    : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed font-orbitron'
                }`}
                title={
                  player.statPoints > 0
                    ? 'Spend 1 Stat Point to upgrade skill'
                    : 'Earn Stat Points from quests'
                }
              >
                <ChevronUp className="w-4 h-4 mb-0.5" />
                <span>{t('train')}</span>
                <span className="text-[10px] opacity-80">-1 {t('sp')}</span>
              </button>

              {/* Delete Skill Button */}
              {onDeleteSkill && (
                <button
                  id={`btn-delete-skill-${selectedSkill.id}`}
                  onClick={() => {
                    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
                    setDeleteConfirmSkill(selectedSkill);
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition-all min-w-[72px] cursor-pointer border border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white shadow-md active:scale-95"
                  title={t('deleteSkill')}
                >
                  <Trash2 className="w-4 h-4 mb-0.5 text-rose-400" />
                  <span className="text-[10px] font-rajdhani leading-tight">
                    {t('deleteSkill')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Skill Confirmation Modal */}
      {deleteConfirmSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-neutral-900 border border-rose-500/40 shadow-2xl text-left overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="text-base font-bold text-white font-orbitron">
                  {t('deleteSkill')}: {deleteConfirmSkill.name}
                </h3>
                <p className="text-xs text-white/50 font-rajdhani">
                  Tier {deleteConfirmSkill.level} / {deleteConfirmSkill.maxLevel} •{' '}
                  {deleteConfirmSkill.category}
                </p>
              </div>
            </div>

            <p className={`text-xs text-white/80 leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('confirmDeleteSkill')}
            </p>

            {deleteConfirmSkill.level > 1 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-rajdhani mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className={isRTL ? 'text-right' : 'text-left'}>
                  {t('deleteSkillRefundNotice').replace(
                    '{points}',
                    String(deleteConfirmSkill.level - 1)
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                id="btn-cancel-delete-skill"
                onClick={() => setDeleteConfirmSkill(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-xs font-bold font-orbitron transition-all cursor-pointer"
              >
                {t('cancelAction')}
              </button>
              <button
                id="btn-confirm-delete-skill"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-orbitron transition-all shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('confirmDeleteAction')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Awaken New Skill Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-neutral-900 border border-purple-500/40 shadow-2xl text-left overflow-hidden">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="text-base font-bold text-white font-orbitron">
                  {t('awakenNewSkill')}
                </h3>
                <p className="text-xs text-white/50 font-rajdhani">
                  {t('skillTree')}
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSkillSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold text-white/70 mb-1.5 font-rajdhani ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('skillName')} *
                </label>
                <input
                  id="input-new-skill-name"
                  type="text"
                  required
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Mana Shield, Video Flow, High Focus"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white text-xs font-rajdhani"
                />
              </div>

              <div>
                <label className={`block text-xs font-bold text-white/70 mb-1.5 font-rajdhani ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('skillCategory')}
                </label>
                <select
                  id="select-new-skill-category"
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-white/10 focus:border-purple-500 focus:outline-none text-white text-xs font-rajdhani"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold text-white/70 mb-1.5 font-rajdhani ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('skillDescription')}
                </label>
                <textarea
                  id="input-new-skill-desc"
                  rows={2}
                  value={newSkillDescription}
                  onChange={(e) => setNewSkillDescription(e.target.value)}
                  placeholder="Brief description of this competency and its application"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white text-xs font-rajdhani resize-none"
                />
              </div>

              <div>
                <label className={`block text-xs font-bold text-white/70 mb-1.5 font-rajdhani ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('skillBuff')}
                </label>
                <input
                  id="input-new-skill-buff"
                  type="text"
                  value={newSkillBuff}
                  onChange={(e) => setNewSkillBuff(e.target.value)}
                  placeholder="e.g. +15% Execution Speed"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-white text-xs font-rajdhani"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-xs font-bold font-orbitron transition-all cursor-pointer"
                >
                  {t('cancelAction')}
                </button>
                <button
                  id="btn-submit-new-skill"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-orbitron transition-all shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('awakenNewSkill')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
