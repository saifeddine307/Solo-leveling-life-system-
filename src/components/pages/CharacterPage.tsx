import React from 'react';
import { User, Shield, Zap, Sparkles, Award, Flame, Dumbbell, Heart, Brain, Eye, Plus, Crown, Clock, Swords } from 'lucide-react';
import { PlayerStats, SkillNode, Achievement, SoundEvent } from '../../types';
import { SkillRadar } from '../SkillRadar';
import { soundManager } from '../../utils/audio';
import { useI18n } from '../../i18n';
import { HunterAvatar } from '../HunterAvatar';

interface CharacterPageProps {
  player: PlayerStats;
  skills: SkillNode[];
  achievements: Achievement[];
  onUpgradeSkill: (skillId: string) => void;
  onDeleteSkill?: (skillId: string) => void;
  onAddSkill?: (skill: Partial<SkillNode>) => void;
  onAllocateStat: (statKey: keyof PlayerStats['stats']) => void;
  onOpenStatsModal: () => void;
}

const achievementIcons: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-5 h-5 text-purple-400" />,
  Flame: <Flame className="w-5 h-5 text-amber-400" />,
  Shield: <Shield className="w-5 h-5 text-cyan-400" />,
  Clock: <Clock className="w-5 h-5 text-emerald-400" />,
  Swords: <Swords className="w-5 h-5 text-rose-400" />,
  Crown: <Crown className="w-5 h-5 text-yellow-400" />,
};

export const CharacterPage: React.FC<CharacterPageProps> = ({
  player,
  skills,
  achievements,
  onUpgradeSkill,
  onDeleteSkill,
  onAddSkill,
  onAllocateStat,
  onOpenStatsModal,
}) => {
  const { t, isRTL } = useI18n();

  const statItems = [
    {
      key: 'strength' as const,
      label: `${t('strength')} (STR)`,
      value: player.stats.strength,
      desc: t('strengthDesc'),
      icon: <Dumbbell className="w-4 h-4 text-rose-400" />,
      color: 'text-rose-400',
    },
    {
      key: 'agility' as const,
      label: `${t('agility')} (AGI)`,
      value: player.stats.agility,
      desc: t('agilityDesc'),
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      color: 'text-cyan-400',
    },
    {
      key: 'vitality' as const,
      label: `${t('vitality')} (VIT)`,
      value: player.stats.vitality,
      desc: t('vitalityDesc'),
      icon: <Heart className="w-4 h-4 text-emerald-400" />,
      color: 'text-emerald-400',
    },
    {
      key: 'intelligence' as const,
      label: `${t('intelligence')} (INT)`,
      value: player.stats.intelligence,
      desc: t('intelligenceDesc'),
      icon: <Brain className="w-4 h-4 text-purple-400" />,
      color: 'text-purple-400',
    },
    {
      key: 'perception' as const,
      label: `${t('perception')} (PER)`,
      value: player.stats.perception,
      desc: t('perceptionDesc'),
      icon: <Eye className="w-4 h-4 text-amber-400" />,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wider flex items-center gap-2.5">
            <User className="w-6 h-6 text-purple-400" />
            {t('hunterProfile')}
          </h2>
          <p className="text-xs text-white/50 font-rajdhani mt-0.5">
            {t('characterSubtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            soundManager.playSound(SoundEvent.SYSTEM_OPEN);
            onOpenStatsModal();
          }}
          className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold font-orbitron transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4" />
          <span>{t('statusWindow')}</span>
        </button>
      </div>

      {/* Character Profile Hero Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <HunterAvatar avatar={player.avatar} name={player.name} size="lg" glow />
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-white font-cinzel">
                {player.name}
              </h3>
              <span className="px-2 py-0.5 rounded-lg bg-purple-600 text-xs font-black text-white font-orbitron">
                {player.rank}-RANK
              </span>
            </div>
            <p className="text-xs text-purple-300 font-rajdhani font-semibold uppercase tracking-wider mt-0.5">
              {player.title}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs font-orbitron text-white/60 flex-wrap">
              <span>{t('level')}: <strong className="text-white font-bold">{player.level}</strong></span>
              <span>•</span>
              <span className="text-yellow-400">{t('gold')}: <strong className="font-bold">{player.gold.toLocaleString()} G</strong></span>
              <span>•</span>
              <span className="text-amber-400">{t('streak')}: <strong className="font-bold">{player.streak} {t('days')}</strong></span>
            </div>
          </div>
        </div>

        {/* Unallocated Stat Points Callout */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-white/5 border border-purple-500/30 flex items-center justify-between gap-4 min-w-[240px]">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <span className="text-[10px] uppercase font-bold text-white/40 font-orbitron block">
              {t('availableStatPoints')}
            </span>
            <span className="text-xl font-black text-yellow-400 font-orbitron">
              {player.statPoints} {t('sp')}
            </span>
          </div>
          <button
            onClick={() => {
              soundManager.playSound(SoundEvent.SYSTEM_OPEN);
              onOpenStatsModal();
            }}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-orbitron transition-all cursor-pointer shadow-md"
          >
            {t('allocate')}
          </button>
        </div>
      </div>

      {/* Two Columns: Attributes Grid & Interactive Skill Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Attributes Grid */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white font-cinzel tracking-wider">
                  {t('hunterAttributes')}
                </h3>
              </div>
              <span className="text-[10px] text-white/40 font-orbitron">
                Pool: {player.statPoints} {t('sp')}
              </span>
            </div>

            <div className="space-y-2.5">
              {statItems.map((stat) => (
                <div
                  key={stat.key}
                  className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      {stat.icon}
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <h4 className={`text-xs font-bold font-orbitron ${stat.color}`}>
                        {stat.label}
                      </h4>
                      <p className="text-[10px] text-white/40 font-rajdhani">{stat.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-black text-white font-orbitron min-w-[28px] text-right">
                      {stat.value}
                    </span>
                    <button
                      disabled={player.statPoints <= 0}
                      onClick={() => {
                        soundManager.playSound(SoundEvent.XP_GAIN);
                        onAllocateStat(stat.key);
                      }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        player.statPoints > 0
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 active:scale-95'
                          : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                      }`}
                      title="Add 1 Point"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <span className="text-[11px] text-white/40 font-rajdhani">
              {t('pointsEarnedNotice')}
            </span>
          </div>
        </div>

        {/* Right: Skill Radar & Tree */}
        <div className="lg:col-span-7">
          <SkillRadar
            skills={skills}
            player={player}
            onUpgradeSkill={onUpgradeSkill}
            onDeleteSkill={onDeleteSkill}
            onAddSkill={onAddSkill}
          />
        </div>
      </div>

      {/* Hunter Achievements Section */}
      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white font-cinzel tracking-wider">
              {t('awakenedAchievements')}
            </h3>
          </div>
          <span className="text-[10px] text-purple-300 font-orbitron font-bold">
            {achievements.filter((a) => a.unlocked).length} / {achievements.length} {t('unlocked')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                ach.unlocked
                  ? 'bg-purple-950/30 border-purple-500/30'
                  : 'bg-white/5 border-white/5 opacity-40'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                {achievementIcons[ach.icon] || <Sparkles className="w-5 h-5 text-purple-400" />}
              </div>
              <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-white font-orbitron truncate">
                    {ach.title}
                  </h4>
                  {ach.unlocked && (
                    <span className="text-[9px] text-emerald-400 font-orbitron font-bold">
                      {t('unlocked').toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/60 font-rajdhani mt-0.5 leading-tight">
                  {ach.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
