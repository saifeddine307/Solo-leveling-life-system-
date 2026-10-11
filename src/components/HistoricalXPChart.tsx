import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Activity, Target, Zap, Calendar } from 'lucide-react';
import { XPHistoryEntry } from '../types';
import { soundManager } from '../utils/audio';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HistoricalXPChartProps {
  history: XPHistoryEntry[];
}

export const HistoricalXPChart: React.FC<HistoricalXPChartProps> = ({ history }) => {
  const [daysFilter, setDaysFilter] = useState<number>(14);

  // Slice history based on days filter
  const displayedHistory = history.slice(-daysFilter);

  const labels = displayedHistory.map((item) => {
    const d = new Date(item.date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });

  const xpValues = displayedHistory.map((item) => item.xp);

  // Calculate metrics
  const totalXPEarned = xpValues.reduce((acc, curr) => acc + curr, 0);
  const avgDailyXP = xpValues.length > 0 ? Math.round(totalXPEarned / xpValues.length) : 0;
  const maxDayXP = xpValues.length > 0 ? Math.max(...xpValues) : 0;
  const totalQuestsCompleted = displayedHistory.reduce((acc, curr) => acc + curr.questsCompleted, 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily XP Acquired',
        data: xpValues,
        fill: true,
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 220);
          gradient.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
          gradient.addColorStop(0.7, 'rgba(56, 189, 248, 0.1)');
          gradient.addColorStop(1, 'rgba(13, 11, 20, 0)');
          return gradient;
        },
        borderColor: '#c084fc',
        borderWidth: 3,
        tension: 0.38,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#0d0b14',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#a855f7',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(13, 11, 20, 0.95)',
        titleColor: '#c084fc',
        bodyColor: '#f1f5f9',
        borderColor: 'rgba(168, 85, 247, 0.5)',
        borderWidth: 1,
        padding: 12,
        titleFont: {
          family: "'Orbitron', sans-serif",
          size: 11,
        },
        bodyFont: {
          family: "'Rajdhani', sans-serif",
          size: 13,
          weight: 600 as const,
        },
        callbacks: {
          label: (context: { parsed: { y: number }; dataIndex: number }) => {
            const entry = displayedHistory[context.dataIndex];
            return [
              ` Mana/XP: +${context.parsed.y} XP`,
              ` Quests Cleared: ${entry?.questsCompleted || 0}`,
              ` Player Level: Lv.${entry?.level ?? 1}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(168, 85, 247, 0.08)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Rajdhani', sans-serif",
            size: 11,
            weight: 600 as const,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(168, 85, 247, 0.12)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Orbitron', sans-serif",
            size: 10,
          },
          callback: (value: string | number) => `${value} XP`,
        },
        suggestedMin: 0,
      },
    },
  };

  return (
    <div className="relative bg-white/5 rounded-3xl border border-white/10 p-6 sm:p-7 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="hud-corner-tl" />
      <div className="hud-corner-tr" />
      <div className="hud-corner-bl" />
      <div className="hud-corner-br" />

      {/* Top Banner */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] sm:text-xs font-black text-white/50 uppercase tracking-[0.2em] font-orbitron">
            System Performance: XP Chrono-Log
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-purple-400 font-mono font-bold tracking-widest bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            SYNC: 100% SECURE
          </span>
          {/* Days Filter Pills */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-purple-400 ml-1 mr-0.5" />
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => {
                  soundManager.playClick();
                  setDaysFilter(days);
                }}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold font-orbitron transition-all cursor-pointer ${
                  daysFilter === days
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-white/40 hover:text-purple-300'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-white/40 font-orbitron flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-400" /> Total Period XP
          </span>
          <span className="text-sm sm:text-base font-black text-white font-orbitron mt-1">
            +{totalXPEarned.toLocaleString()} <span className="text-purple-400 text-xs font-normal">XP</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-white/40 font-orbitron flex items-center gap-1">
            <Activity className="w-3 h-3 text-purple-400" /> Daily Average
          </span>
          <span className="text-sm sm:text-base font-black text-white font-orbitron mt-1">
            {avgDailyXP.toLocaleString()} <span className="text-white/40 text-xs font-normal">XP/d</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-white/40 font-orbitron flex items-center gap-1">
            <Target className="w-3 h-3 text-yellow-400" /> Peak Day Output
          </span>
          <span className="text-sm sm:text-base font-black text-yellow-400 font-orbitron mt-1">
            {maxDayXP.toLocaleString()} <span className="text-xs font-normal">XP</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-white/40 font-orbitron flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-purple-400" /> Quests Cleared
          </span>
          <span className="text-sm sm:text-base font-black text-white font-orbitron mt-1">
            {totalQuestsCompleted} <span className="text-white/40 text-xs font-normal">Cleared</span>
          </span>
        </div>
      </div>

      {/* Chart.js Line Chart */}
      <div className="w-full h-56 sm:h-64 flex items-center justify-center">
        {displayedHistory.length === 0 ? (
          <div className="text-center p-6 text-white/40 font-rajdhani">
            <Activity className="w-10 h-10 mx-auto mb-2 text-purple-500/30" />
            <p className="text-sm font-semibold">No activity recorded yet</p>
            <p className="text-xs text-white/30 mt-1">Complete quests or focus sessions to generate your chronological mana telemetry.</p>
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
};
