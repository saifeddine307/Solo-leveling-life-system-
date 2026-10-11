import { PlayerStats, Quest, SkillNode, XPHistoryEntry, SystemLog, GithubSyncConfig, RankTier, Achievement, WorkSession, HunterGoal, RewardTransaction } from '../types';
import { loadStoredData as storageLoad, saveStoredData as storageSave, removeStoredData as storageRemove, CURRENT_SCHEMA_VERSION, StorageEnvelope, loadRawEnvelope } from '../storage';

export { CURRENT_SCHEMA_VERSION, type StorageEnvelope, loadRawEnvelope };

export const STORAGE_KEY_PLAYER = 'solo_player_data';
export const STORAGE_KEY_QUESTS = 'solo_quests_data';
export const STORAGE_KEY_SKILLS = 'solo_skills_data';
export const STORAGE_KEY_HISTORY = 'solo_history_data';
export const STORAGE_KEY_LOGS = 'solo_logs_data';
export const STORAGE_KEY_GITHUB = 'solo_github_config';
export const STORAGE_KEY_ACHIEVEMENTS = 'solo_achievements_data';
export const STORAGE_KEY_SESSIONS = 'solo_sessions_data';
export const STORAGE_KEY_GOALS = 'solo_goals_data';
export const STORAGE_KEY_AI_MESSAGES = 'solo_ai_messages';
export const STORAGE_KEY_AI_AUTONOMY = 'solo_ai_autonomy_mode';
export const STORAGE_KEY_REWARD_TRANSACTIONS = 'solo_reward_transactions';

export function getLocalTodayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getQuestCompletionCycle(quest: Quest, date: Date = new Date()): string {
  if (quest.type === 'daily') {
    return getLocalTodayDateString(date); // YYYY-MM-DD in local time
  }
  if (quest.type === 'weekly') {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
  if (quest.type === 'monthly') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  // Standard one-time, penalty, boss, or general quest
  return 'one-time';
}

export function isRewardClaimedForCycle(
  questId: string,
  cycle: string,
  transactions: RewardTransaction[]
): boolean {
  if (!Array.isArray(transactions) || transactions.length === 0) return false;
  return transactions.some(
    (tx) =>
      (tx.questId === questId || tx.taskId === questId) &&
      tx.completionCycle === cycle &&
      tx.claimed !== false
  );
}

export function isRewardClaimedAnyCycle(
  questId: string,
  transactions: RewardTransaction[]
): boolean {
  if (!Array.isArray(transactions) || transactions.length === 0) return false;
  return transactions.some(
    (tx) => (tx.questId === questId || tx.taskId === questId) && tx.claimed !== false
  );
}

export function isQuestRewardAlreadyClaimed(
  quest: Quest,
  transactions: RewardTransaction[],
  date: Date = new Date()
): boolean {
  const cycle = getQuestCompletionCycle(quest, date);

  // Check 1: In-memory quest flag matching current cycle
  if (quest.rewardClaimed && quest.lastRewardCycle === cycle) {
    return true;
  }

  // Check 2: For one-time / penalty / boss quests, once claimed anywhere, never repeatable
  if (cycle === 'one-time') {
    if (quest.rewardClaimed) return true;
    if (isRewardClaimedAnyCycle(quest.id, transactions)) return true;
  }

  // Check 3: Check persistent transaction records for this specific task + completion cycle
  if (isRewardClaimedForCycle(quest.id, cycle, transactions)) {
    return true;
  }

  // Check 4: Backward compatibility check for daily quests completed today
  if (quest.type === 'daily' && quest.rewardClaimed && quest.completedAt) {
    const completedDate = quest.completedAt.split('T')[0];
    if (completedDate === cycle) {
      return true;
    }
  }

  return false;
}

/**
 * Synchronizes recurring quests so that when a new occurrence (day/week/month) arrives,
 * the quest reflects the state of the current cycle occurrence.
 * If the current cycle has not been claimed yet, it resets completed & rewardClaimed
 * for the new occurrence while leaving the permanent reward ledger intact.
 */
export function synchronizeQuestCycles(
  quests: Quest[],
  transactions: RewardTransaction[],
  date: Date = new Date()
): Quest[] {
  if (!Array.isArray(quests)) return [];

  return quests.map((quest) => {
    // Non-recurring quests: ensure rewardClaimed flag reflects ledger
    if (quest.type !== 'daily' && quest.type !== 'weekly' && quest.type !== 'monthly') {
      const alreadyClaimed = quest.rewardClaimed || isRewardClaimedAnyCycle(quest.id, transactions);
      if (alreadyClaimed && !quest.rewardClaimed) {
        return {
          ...quest,
          rewardClaimed: true,
          lastRewardCycle: 'one-time',
        };
      }
      return quest;
    }

    const currentCycle = getQuestCompletionCycle(quest, date);
    const claimedForCurrentCycle =
      (quest.rewardClaimed && quest.lastRewardCycle === currentCycle) ||
      isRewardClaimedForCycle(quest.id, currentCycle, transactions);

    if (claimedForCurrentCycle) {
      // Reward has been claimed for the current cycle
      return {
        ...quest,
        rewardClaimed: true,
        lastRewardCycle: currentCycle,
      };
    } else {
      // New occurrence: reward has NOT been claimed for the current cycle
      // If the quest was marked claimed or completed in a previous cycle, rollover to new occurrence
      if (quest.lastRewardCycle && quest.lastRewardCycle !== currentCycle) {
        return {
          ...quest,
          completed: false,
          rewardClaimed: false,
          completedAt: undefined,
        };
      }
      return quest;
    }
  });
}

/**
 * Evaluates achievements based on current player progression and immutable reward transactions.
 * Crucially: ACHIEVEMENTS ARE PERMANENT AND APPEND-ONLY.
 * Once unlocked, an achievement is NEVER re-locked or reversed on uncheck.
 */
export function evaluateAchievements(
  currentAchievements: Achievement[],
  player: PlayerStats,
  transactions: RewardTransaction[]
): { updatedAchievements: Achievement[]; newlyUnlocked: Achievement[] } {
  const completedQuestCount = Array.isArray(transactions) ? transactions.length : 0;
  const newlyUnlocked: Achievement[] = [];

  const updatedAchievements = currentAchievements.map((ach) => {
    // Permanent historical event: never rollback an already unlocked achievement
    if (ach.unlocked) {
      return ach;
    }

    let shouldUnlock = false;
    switch (ach.id) {
      case 'ach-1':
        // First Awakening: Complete your first quest under the System
        shouldUnlock = completedQuestCount >= 1;
        break;
      case 'ach-2':
        // 14-Day Iron Will
        shouldUnlock = (player.streak || 0) >= 14;
        break;
      case 'ach-3':
        // Dungeon Striker (C-Rank)
        shouldUnlock = player.level >= 15 || ['C', 'B', 'A', 'S', 'National', 'Monarch'].includes(player.rank);
        break;
      case 'ach-4':
        // Deep Focus Monk: 10 hours
        shouldUnlock = (player.totalFocusSeconds || 0) >= 36000;
        break;
      case 'ach-5':
        // Century Slayer: 100 quests
        shouldUnlock = completedQuestCount >= 100;
        break;
      case 'ach-6':
        // Shadow Monarch Dominion: S-Rank or Monarch
        shouldUnlock = player.level >= 75 || ['S', 'National', 'Monarch'].includes(player.rank);
        break;
      default:
        break;
    }

    if (shouldUnlock) {
      const unlockedAch: Achievement = {
        ...ach,
        unlocked: true,
        unlockedAt: new Date().toISOString(),
      };
      newlyUnlocked.push(unlockedAch);
      return unlockedAch;
    }

    return ach;
  });

  return { updatedAchievements, newlyUnlocked };
}

export const INITIAL_GOALS: HunterGoal[] = [];

export function calculateRequiredXP(level: number): number {
  return Math.floor(100 * Math.pow(1.18, level - 1));
}

export function getRankByLevel(level: number): { rank: RankTier; title: string } {
  if (level >= 100) return { rank: 'Monarch', title: 'Shadow Monarch' };
  if (level >= 90) return { rank: 'National', title: 'National Level Hunter' };
  if (level >= 75) return { rank: 'S', title: 'S-Rank Awakened Monarch' };
  if (level >= 50) return { rank: 'A', title: 'A-Rank High-Speed Creator' };
  if (level >= 30) return { rank: 'B', title: 'B-Rank Vanguard Producer' };
  if (level >= 15) return { rank: 'C', title: 'C-Rank Dungeon Striker' };
  if (level >= 5) return { rank: 'D', title: 'D-Rank Awakened Hunter' };
  return { rank: 'E', title: 'E-Rank Novice Human' };
}

export const INITIAL_PLAYER_STATS: PlayerStats = {
  name: 'Sung Jin-Woo',
  title: 'E-Rank Novice Human',
  rank: 'E',
  level: 1,
  currentXP: 0,
  requiredXP: 100,
  totalXPEarned: 0,
  gold: 0,
  statPoints: 0,
  streak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  totalFocusSeconds: 0,
  stats: {
    strength: 10,
    agility: 10,
    intelligence: 10,
    perception: 10,
    vitality: 10,
  },
  skills: {
    motionDesign: 0,
    editingSpeed: 0,
    portfolio: 0,
    clientAcquisition: 0,
  },
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Awakening',
    description: 'Complete your first quest under the System.',
    icon: 'Sparkles',
    unlocked: false,
    category: 'Progression',
  },
  {
    id: 'ach-2',
    title: '14-Day Iron Will',
    description: 'Maintain a 14-day consecutive active streak.',
    icon: 'Flame',
    unlocked: false,
    category: 'Focus',
  },
  {
    id: 'ach-3',
    title: 'Dungeon Striker (C-Rank)',
    description: 'Break through the C-Rank hunter threshold.',
    icon: 'Shield',
    unlocked: false,
    category: 'Progression',
  },
  {
    id: 'ach-4',
    title: 'Deep Focus Monk',
    description: 'Log over 10 hours of uninterrupted deep work.',
    icon: 'Clock',
    unlocked: false,
    category: 'Focus',
  },
  {
    id: 'ach-5',
    title: 'Century Slayer',
    description: 'Complete 100 System Quests across all difficulties.',
    icon: 'Swords',
    unlocked: false,
    category: 'Quests',
  },
  {
    id: 'ach-6',
    title: 'Shadow Monarch Dominion',
    description: 'Achieve S-Rank tier and unlock Monarch title.',
    icon: 'Crown',
    unlocked: false,
    category: 'Mastery',
  },
];

export const INITIAL_SKILL_NODES: SkillNode[] = [];

export const INITIAL_QUESTS: Quest[] = [];

export function generateInitialHistory(): XPHistoryEntry[] {
  return [];
}

export const INITIAL_SYSTEM_LOGS: SystemLog[] = [
  {
    id: 'log-init-1',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    message: '[SYSTEM] Awakening sequence initialized. Ready to receive Hunter commands.',
    type: 'system',
  },
];

export function loadStoredData<T>(key: string, defaultValue: T): T {
  return storageLoad<T>(key, defaultValue);
}

export function saveStoredData<T>(key: string, value: T): void {
  storageSave<T>(key, value);
}

export function removeStoredData(key: string): void {
  storageRemove(key);
}

export interface FullExportData {
  player: PlayerStats;
  quests: Quest[];
  skills: SkillNode[];
  history: XPHistoryEntry[];
  logs: SystemLog[];
  achievements?: Achievement[];
  goals?: HunterGoal[];
  exportedAt: string;
  version: string;
}

export function exportAllDataAsJSON(): string {
  const data: FullExportData = {
    player: loadStoredData(STORAGE_KEY_PLAYER, INITIAL_PLAYER_STATS),
    quests: loadStoredData(STORAGE_KEY_QUESTS, INITIAL_QUESTS),
    skills: loadStoredData(STORAGE_KEY_SKILLS, INITIAL_SKILL_NODES),
    history: loadStoredData(STORAGE_KEY_HISTORY, generateInitialHistory()),
    logs: loadStoredData(STORAGE_KEY_LOGS, INITIAL_SYSTEM_LOGS),
    achievements: loadStoredData(STORAGE_KEY_ACHIEVEMENTS, INITIAL_ACHIEVEMENTS),
    goals: loadStoredData(STORAGE_KEY_GOALS, INITIAL_GOALS),
    exportedAt: new Date().toISOString(),
    version: '1.2.0',
  };
  return JSON.stringify(data, null, 2);
}

export function importAllDataFromJSON(jsonString: string, currentUserId?: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.player && data.quests && data.skills) {
      saveStoredData(STORAGE_KEY_PLAYER, data.player);
      saveStoredData(STORAGE_KEY_QUESTS, data.quests);
      saveStoredData(STORAGE_KEY_SKILLS, data.skills);
      if (data.history) saveStoredData(STORAGE_KEY_HISTORY, data.history);
      if (data.logs) saveStoredData(STORAGE_KEY_LOGS, data.logs);
      if (data.achievements) saveStoredData(STORAGE_KEY_ACHIEVEMENTS, data.achievements);
      if (data.goals) saveStoredData(STORAGE_KEY_GOALS, data.goals);
      if (data.workSessions) saveStoredData(STORAGE_KEY_SESSIONS, data.workSessions);

      if (currentUserId) {
        saveStoredData(`solo_user_${currentUserId}_data`, {
          profile: data.player,
          quests: data.quests,
          skills: data.skills,
          history: data.history || [],
          logs: data.logs || [],
          achievements: data.achievements || INITIAL_ACHIEVEMENTS,
          goals: data.goals || [],
          workSessions: data.workSessions || [],
        });
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to parse import JSON', err);
    return false;
  }
}

export interface FactoryResetResult {
  player: PlayerStats;
  quests: Quest[];
  skills: SkillNode[];
  history: XPHistoryEntry[];
  logs: SystemLog[];
  achievements: Achievement[];
  goals: HunterGoal[];
  workSessions: WorkSession[];
}

export function executeFactoryReset(preservedName?: string, userId?: string): FactoryResetResult {
  const cleanPlayer: PlayerStats = {
    ...INITIAL_PLAYER_STATS,
    name: preservedName || 'Sung Jin-Woo',
    title: 'E-Rank Novice Human',
    rank: 'E',
    level: 1,
    currentXP: 0,
    requiredXP: 100,
    totalXPEarned: 0,
    gold: 0,
    statPoints: 0,
    streak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalFocusSeconds: 0,
    stats: {
      strength: 10,
      agility: 10,
      intelligence: 10,
      perception: 10,
      vitality: 10,
    },
    skills: {
      motionDesign: 0,
      editingSpeed: 0,
      portfolio: 0,
      clientAcquisition: 0,
    },
  };

  const cleanQuests: Quest[] = [];
  const cleanSkills: SkillNode[] = [];
  const cleanHistory: XPHistoryEntry[] = [];
  const cleanAchievements: Achievement[] = INITIAL_ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: false,
    unlockedAt: undefined,
  }));
  const cleanGoals: HunterGoal[] = [];
  const cleanWorkSessions: WorkSession[] = [];
  const cleanLogs: SystemLog[] = [
    {
      id: `log-reset-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: '[SYSTEM] Factory Reset completed. All neural and status parameters have been calibrated to initial state.',
      type: 'system',
    },
  ];

  // Save to primary global storage keys
  saveStoredData(STORAGE_KEY_PLAYER, cleanPlayer);
  saveStoredData(STORAGE_KEY_QUESTS, cleanQuests);
  saveStoredData(STORAGE_KEY_SKILLS, cleanSkills);
  saveStoredData(STORAGE_KEY_HISTORY, cleanHistory);
  saveStoredData(STORAGE_KEY_LOGS, cleanLogs);
  saveStoredData(STORAGE_KEY_ACHIEVEMENTS, cleanAchievements);
  saveStoredData(STORAGE_KEY_GOALS, cleanGoals);
  saveStoredData(STORAGE_KEY_SESSIONS, cleanWorkSessions);
  saveStoredData(STORAGE_KEY_REWARD_TRANSACTIONS, []);

  // Clear AI chat log
  try {
    localStorage.removeItem('solo_engine_chat_messages');
    localStorage.removeItem(STORAGE_KEY_AI_MESSAGES);
  } catch {}

  // If a userId is given, update user partition
  if (userId) {
    try {
      const userPartitionKey = `solo_user_${userId}_data`;
      const currentPartition = loadStoredData<any>(userPartitionKey, null);
      const updatedPartition = {
        profile: cleanPlayer,
        quests: cleanQuests,
        skills: cleanSkills,
        history: cleanHistory,
        logs: cleanLogs,
        achievements: cleanAchievements,
        goals: cleanGoals,
        workSessions: cleanWorkSessions,
        settings: currentPartition?.settings || undefined,
      };
      saveStoredData(userPartitionKey, updatedPartition);
    } catch (err) {
      console.error('Error updating user partition on factory reset:', err);
    }
  }

  return {
    player: cleanPlayer,
    quests: cleanQuests,
    skills: cleanSkills,
    history: cleanHistory,
    logs: cleanLogs,
    achievements: cleanAchievements,
    goals: cleanGoals,
    workSessions: cleanWorkSessions,
  };
}


// GitHub Gist API Cloud Sync
export async function syncToGithubGist(token: string, gistId: string, payload: FullExportData): Promise<{ success: boolean; gistId?: string; error?: string }> {
  try {
    const content = JSON.stringify(payload, null, 2);
    const body = {
      description: 'Solo Leveling Life Gamification System Backup',
      public: false,
      files: {
        'solo-leveling-state.json': {
          content,
        },
      },
    };

    let url = 'https://api.github.com/gists';
    let method = 'POST';

    if (gistId && gistId.trim() !== '') {
      url = `https://api.github.com/gists/${gistId.trim()}`;
      method = 'PATCH';
    }

    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token.trim()}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || `GitHub error: ${res.statusText}` };
    }

    const resData = await res.json();
    return { success: true, gistId: resData.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown network error' };
  }
}

export async function fetchFromGithubGist(token: string, gistId: string): Promise<{ success: boolean; data?: FullExportData; error?: string }> {
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId.trim()}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: token.trim() ? `Bearer ${token.trim()}` : '',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || `Failed to fetch Gist (${res.status})` };
    }

    const gistData = await res.json();
    const file = gistData.files?.['solo-leveling-state.json'];
    if (!file || !file.content) {
      return { success: false, error: 'Could not find solo-leveling-state.json in Gist' };
    }

    const parsedData = JSON.parse(file.content);
    return { success: true, data: parsedData };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to parse Gist content' };
  }
}
