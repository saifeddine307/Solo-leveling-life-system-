import React from 'react';
import { TrendingUp, Clock, Zap, Target, Flame, Activity, ShieldCheck, Layers, Sparkles } from 'lucide-react';
import { PlayerStats, XPHistoryEntry, Quest, SystemLog } from '../../types';
import { HistoricalXPChart } from '../HistoricalXPChart';
import { useI18n } from '../../i18n';

interface AnalyticsPageProps {
  player: PlayerStats;
  history: XPHistoryEntry[];
  quests: Quest[];
  logs: SystemLog[];
  todayFocusMinutes: number;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  player,
  history,
  quests,
  logs,
  todayFocusMinutes,
}) => {
  const { t, isRTL } = useI18n();
  const completedQuests = quests.filter((q) => q.completed).length;
  const completionRate = quests.length > 0 ? Math.round((completedQuests / quests.length) * 100) : 0;

  const totalFocusHours = (player.totalFocusSeconds / 3600).toFixed(1);

  // Category Breakdown
  const categoryCounts: Record<string, { total: number; done: number; xp: number }> = {};
  quests.forEach((q) => {
    if (!categoryCounts[q.category]) {
      categoryCounts[q.category] = { total: 0, done: 0, xp: 0 };
    }
    categoryCounts[q.category].total += 1;
    if (q.completed) {
      categoryCounts[q.category].done += 1;
      categoryCounts[q.category].xp += q.xpReward;
    }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h2 className="text-xl sm:text-2xl font-black text-white font-cinzel tracking-wider flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-purple-400" />
          {t('systemAnalytics')}
        </h2>
        <p className="text-xs text-white/50 font-rajdhani mt-0.5">
          {t('analyticsSubtitle')}
        </p>
      </div>

      {/* Top Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-white/40 font-orbitron">
              {t('totalManaEarned')}
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black text-white font-orbitron">
              {player.totalXPEarned.toLocaleString()}
            </span>
            <span className="text-xs text-purple-300 font-orbitron ml-1">{t('xp')}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-white/40 font-orbitron">
              {t('deepWorkLogged')}
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black text-white font-orbitron">
              {totalFocusHours}
            </span>
            <span className="text-xs text-cyan-300 font-orbitron ml-1">{t('hours')}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-white/40 font-orbitron">
              {t('questClearRate')}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black text-white font-orbitron">
              {completionRate}%
            </span>
            <span className="text-xs text-emerald-300 font-orbitron ml-1">({completedQuests}/{quests.length})</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-white/40 font-orbitron">
              {t('unbrokenStreak')}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-black text-amber-300 font-orbitron">
              {player.streak}
            </span>
            <span className="text-xs text-amber-300/80 font-orbitron ml-1">{t('daysUnbroken')}</span>
          </div>
        </div>
      </div>

      {/* Primary Historical XP Chart */}
      <HistoricalXPChart history={history} />

      {/* Category Performance Breakdown & Recent Log Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/10">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white font-cinzel tracking-wider">
              {t('domainMastery')}
            </h3>
          </div>

          <div className="space-y-3.5">
            {Object.entries(categoryCounts).map(([cat, val]) => {
              const rate = val.total > 0 ? Math.round((val.done / val.total) * 100) : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-rajdhani">
                    <span className="font-bold text-white">{cat}</span>
                    <span className="text-white/60">
                      {val.done}/{val.total} {t('cleared')} • <strong className="text-purple-300 font-orbitron">+{val.xp} {t('xp')}</strong>
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Activity Feed */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/10">
            <Activity className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white font-cinzel tracking-wider">
              {t('recentEvents')}
            </h3>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {logs.slice(-5).reverse().map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3 text-xs"
              >
                <span className="text-[10px] text-white/40 font-mono shrink-0 mt-0.5">
                  {log.timestamp}
                </span>
                <span className="text-white/80 font-rajdhani flex-1">
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
