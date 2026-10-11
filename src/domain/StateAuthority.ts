// State Authority — Single Authoritative Domain Layer for Solo Leveling Life System
// Enforces:
// REAL ACTION -> REAL TIME -> REAL COMPLETION -> REAL REWARD -> REAL PROGRESS
// 1. AI cannot directly set XP, Gold, Level, Rank, Achievements, Streaks, or Skill XP.
// 2. All progression is earned through verified domain events and atomic transactions.
// 3. Transactions in the reward ledger are idempotent and immutable.
// 4. React renders do NOT trigger sound or progression. Domain events drive all side-effects.

import {
  PlayerStats,
  Quest,
  SkillNode,
  Achievement,
  XPHistoryEntry,
  SystemLog,
  HunterGoal,
  HunterProject,
  HunterMilestone,
  WorkSession,
  RewardTransaction,
  RankTier,
  UserSettings,
} from '../types';
import {
  loadStoredData,
  saveStoredData,
  calculateRequiredXP,
  getRankByLevel,
  getQuestCompletionCycle,
  isQuestRewardAlreadyClaimed,
  isRewardClaimedForCycle,
  synchronizeQuestCycles,
  evaluateAchievements,
  STORAGE_KEY_PLAYER,
  STORAGE_KEY_QUESTS,
  STORAGE_KEY_SKILLS,
  STORAGE_KEY_ACHIEVEMENTS,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_LOGS,
  STORAGE_KEY_GOALS,
  STORAGE_KEY_SESSIONS,
  STORAGE_KEY_REWARD_TRANSACTIONS,
  INITIAL_PLAYER_STATS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_SKILL_NODES,
  INITIAL_QUESTS,
  INITIAL_GOALS,
  INITIAL_SYSTEM_LOGS,
  executeFactoryReset,
} from '../utils/storage';
import {
  getCurrentUserId,
  setCurrentUserId,
  loadUserData,
  saveUserData,
  DEFAULT_USER_SETTINGS,
} from '../utils/auth';
import { domainEventBus, EventSource } from './events';
import { DomainAction, validateDomainAction } from './actions';
import { cloudSync } from '../services/cloudSync';

export const STORAGE_KEY_PROJECTS = 'solo_projects_data';
export const STORAGE_KEY_MILESTONES = 'solo_milestones_data';
export const STORAGE_KEY_SETTINGS = 'solo_system_user_settings';

export interface AuthoritativeState {
  player: PlayerStats;
  quests: Quest[];
  skills: SkillNode[];
  achievements: Achievement[];
  history: XPHistoryEntry[];
  logs: SystemLog[];
  goals: HunterGoal[];
  projects: HunterProject[];
  milestones: HunterMilestone[];
  workSessions: WorkSession[];
  rewardTransactions: RewardTransaction[];
  settings: UserSettings;
}

export type StateListener = (state: AuthoritativeState) => void;

export interface DispatchResult {
  success: boolean;
  actionType: string;
  reason?: string;
  transactionId?: string;
  rewardGranted?: {
    xp: number;
    gold: number;
    statPoints: number;
  };
  didLevelUp?: boolean;
  didRankUp?: boolean;
  newLevel?: number;
  newRank?: RankTier;
  refundedStatPoints?: number;
}

class StateAuthorityClass {
  private state: AuthoritativeState;
  private listeners: Set<StateListener> = new Set();
  private inFlightLocks: Set<string> = new Set();
  private currentUserId: string = 'guest';

  constructor() {
    this.currentUserId = typeof localStorage !== 'undefined' ? getCurrentUserId() : 'guest';
    this.state = this.loadInitialState();
    // Synchronize recurring daily/weekly/monthly quest occurrences immediately on boot
    this.synchronizeRecurringCycles();
  }

  private loadInitialState(): AuthoritativeState {
    const activeUserId = this.currentUserId;
    // Load from partitioned user state if available
    const userData = loadUserData(activeUserId);

    const player = userData?.profile || loadStoredData<PlayerStats>(STORAGE_KEY_PLAYER, INITIAL_PLAYER_STATS);
    const quests = userData?.quests || loadStoredData<Quest[]>(STORAGE_KEY_QUESTS, INITIAL_QUESTS);
    const skills = userData?.skills || loadStoredData<SkillNode[]>(STORAGE_KEY_SKILLS, INITIAL_SKILL_NODES);
    const achievements = userData?.achievements || loadStoredData<Achievement[]>(STORAGE_KEY_ACHIEVEMENTS, INITIAL_ACHIEVEMENTS);
    const history = userData?.history || loadStoredData<XPHistoryEntry[]>(STORAGE_KEY_HISTORY, []);
    const logs = userData?.logs || loadStoredData<SystemLog[]>(STORAGE_KEY_LOGS, INITIAL_SYSTEM_LOGS);
    const goals = userData?.goals || loadStoredData<HunterGoal[]>(STORAGE_KEY_GOALS, INITIAL_GOALS);
    const projects = userData?.projects || loadStoredData<HunterProject[]>(STORAGE_KEY_PROJECTS, []);
    const milestones = userData?.milestones || loadStoredData<HunterMilestone[]>(STORAGE_KEY_MILESTONES, []);
    const workSessions = userData?.workSessions || loadStoredData<WorkSession[]>(STORAGE_KEY_SESSIONS, []);
    const rewardTransactions = userData?.rewardTransactions || loadStoredData<RewardTransaction[]>(STORAGE_KEY_REWARD_TRANSACTIONS, []);
    const settings = userData?.settings || loadStoredData<UserSettings>(STORAGE_KEY_SETTINGS, DEFAULT_USER_SETTINGS);

    return {
      player,
      quests,
      skills,
      achievements,
      history,
      logs,
      goals,
      projects,
      milestones,
      workSessions,
      rewardTransactions,
      settings,
    };
  }

  /**
   * Get active partitioned user ID
   */
  public getCurrentUserId(): string {
    return this.currentUserId;
  }

  /**
   * Set active partitioned user ID
   */
  public setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  /**
   * Atomic User Switching:
   * 1. Persist current state of outgoing user to their partition
   * 2. Set new active user ID and persist current user ID marker
   * 3. Load target user's partition data
   * 4. Atomically replace StateAuthority internal state
   * 5. Synchronize recurring quest cycles for this user
   * 6. Persist to active partition & active keys
   * 7. Emit USER_SWITCHED and PLAYER_STATE_UPDATED domain events
   * 8. Notify all listeners
   */
  public switchUser(newUserId: string): AuthoritativeState {
    if (!newUserId || typeof newUserId !== 'string') {
      return this.state;
    }

    // 1. Persist current state for outgoing user
    this.persist();

    // 2. Switch user pointer
    this.currentUserId = newUserId;
    setCurrentUserId(newUserId);

    // 3. Load target user's partitioned domain state
    const userData = loadUserData(newUserId);

    // 4. Atomically replace internal state
    this.state = {
      player: userData.profile,
      quests: userData.quests || [],
      skills: userData.skills || [],
      achievements: userData.achievements || INITIAL_ACHIEVEMENTS,
      history: userData.history || [],
      logs: userData.logs || [],
      goals: userData.goals || [],
      projects: userData.projects || [],
      milestones: userData.milestones || [],
      workSessions: userData.workSessions || [],
      rewardTransactions: userData.rewardTransactions || [],
      settings: userData.settings || DEFAULT_USER_SETTINGS,
    };

    // 5. Synchronize recurring cycles for this user
    this.synchronizeRecurringCycles();

    // 6. Persist this user's active state
    this.persist();

    // 7. Emit domain events
    domainEventBus.emit('USER_SWITCHED', { userId: newUserId, player: this.state.player }, 'system');
    domainEventBus.emit('PLAYER_STATE_UPDATED', { switchUser: true, userId: newUserId }, 'system');

    // 8. Notify listeners
    this.notifyListeners();

    return this.state;
  }

  /**
   * Reload all state from current user partition in storage
   */
  public reloadFromStorage(): AuthoritativeState {
    const userData = loadUserData(this.currentUserId);
    this.state = {
      player: userData.profile,
      quests: userData.quests || [],
      skills: userData.skills || [],
      achievements: userData.achievements || INITIAL_ACHIEVEMENTS,
      history: userData.history || [],
      logs: userData.logs || [],
      goals: userData.goals || [],
      projects: userData.projects || [],
      milestones: userData.milestones || [],
      workSessions: userData.workSessions || [],
      rewardTransactions: userData.rewardTransactions || [],
      settings: userData.settings || DEFAULT_USER_SETTINGS,
    };
    this.synchronizeRecurringCycles();
    this.notifyListeners();
    return this.state;
  }

  /**
   * Update user settings through StateAuthority
   */
  public updateSettings(updates: Partial<UserSettings>, source: EventSource = 'user'): UserSettings {
    const updatedSettings: UserSettings = {
      ...this.state.settings,
      ...updates,
    };
    this.state = {
      ...this.state,
      settings: updatedSettings,
    };
    this.persist();
    domainEventBus.emit('SETTINGS_UPDATED', { settings: updatedSettings }, source);
    this.notifyListeners();
    return updatedSettings;
  }

  /**
   * Clear system logs
   */
  public clearLogs(_source: EventSource = 'user'): void {
    this.state = {
      ...this.state,
      logs: [],
    };
    this.persist();
    this.notifyListeners();
  }

  /**
   * Hunter Awakening onboarding completion through StateAuthority.
   * Strictly enforces baseline zero progression: Level 1, 0 XP, 0 Gold, 0 SP, 0 streak, Rank E.
   * No completed quests, no achievements, no fake history.
   */
  public completeAwakening(
    data: {
      name: string;
      avatar: string;
      title: string;
      quests?: Quest[];
      skills?: SkillNode[];
    },
    source: EventSource = 'user'
  ): AuthoritativeState {
    const cleanName = (data.name || this.state.player.name).trim() || 'Sung Jin-Woo';
    const cleanAvatar = data.avatar || this.state.player.avatar || 'monarch';
    const cleanTitle = (data.title || this.state.player.title).trim() || 'E-Rank Awakened Novice';

    // Awakened baseline: strict zero progression
    const updatedPlayer: PlayerStats = {
      ...this.state.player,
      name: cleanName,
      avatar: cleanAvatar,
      title: cleanTitle,
      rank: 'E',
      level: 1,
      currentXP: 0,
      requiredXP: 100,
      totalXPEarned: 0,
      gold: 0,
      statPoints: 0,
      streak: 0,
      totalFocusSeconds: 0,
      stats: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        perception: 10,
        vitality: 10,
      },
    };

    // Initial starter quests: ensure completed=false, rewardClaimed=false
    let updatedQuests = [...this.state.quests];
    if (data.quests && data.quests.length > 0) {
      const existingIds = new Set(updatedQuests.map((q) => q.id));
      const newQuests: Quest[] = data.quests
        .filter((q) => !existingIds.has(q.id))
        .map((q) => ({
          ...q,
          completed: false,
          rewardClaimed: false,
          xpReward: Math.max(10, Math.min(500, Number(q.xpReward) || 50)),
          goldReward: Math.max(5, Math.min(500, Number(q.goldReward) || 40)),
          statPointsReward: Math.max(0, Math.min(2, Number(q.statPointsReward) || 0)),
        }));
      updatedQuests = [...newQuests, ...updatedQuests];
    }

    // Initial starter skills: ensure level=1, xp=0
    let updatedSkills = [...this.state.skills];
    if (data.skills && data.skills.length > 0) {
      const existingNames = new Set(updatedSkills.map((s) => s.name.toLowerCase()));
      const newSkills: SkillNode[] = data.skills
        .filter((s) => !existingNames.has(s.name.toLowerCase()))
        .map((s) => ({
          ...s,
          level: 1,
          xp: 0,
          xpToNext: 300,
        }));
      updatedSkills = [...newSkills, ...updatedSkills];
    }

    const newLog: SystemLog = {
      id: `log-awake-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: `[SYSTEM AWAKENING] Hunter Protocol Activated. Identity: ${cleanName}. Rank: E. System Core Online.`,
      type: 'system',
    };

    this.state = {
      ...this.state,
      player: updatedPlayer,
      quests: updatedQuests,
      skills: updatedSkills,
      logs: [newLog, ...this.state.logs.slice(0, 49)],
    };

    this.persist();
    domainEventBus.emit('PLAYER_STATE_UPDATED', { awakening: true }, source);
    this.notifyListeners();
    return this.state;
  }

  /**
   * Read-only view of current authoritative state snapshot
   */
  public getState(): AuthoritativeState {
    return this.state;
  }

  /**
   * Subscribe to authoritative state changes
   */
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (err) {
        console.error('Error in StateAuthority listener:', err);
      }
    });
  }

  private persist() {
    saveStoredData(STORAGE_KEY_PLAYER, this.state.player);
    saveStoredData(STORAGE_KEY_QUESTS, this.state.quests);
    saveStoredData(STORAGE_KEY_SKILLS, this.state.skills);
    saveStoredData(STORAGE_KEY_ACHIEVEMENTS, this.state.achievements);
    saveStoredData(STORAGE_KEY_HISTORY, this.state.history);
    saveStoredData(STORAGE_KEY_LOGS, this.state.logs);
    saveStoredData(STORAGE_KEY_GOALS, this.state.goals);
    saveStoredData(STORAGE_KEY_PROJECTS, this.state.projects);
    saveStoredData(STORAGE_KEY_MILESTONES, this.state.milestones);
    saveStoredData(STORAGE_KEY_SESSIONS, this.state.workSessions);
    saveStoredData(STORAGE_KEY_REWARD_TRANSACTIONS, this.state.rewardTransactions);
    saveStoredData(STORAGE_KEY_SETTINGS, this.state.settings);

    // Authoritative user partition persistence
    saveUserData(this.currentUserId, {
      profile: this.state.player,
      quests: this.state.quests,
      skills: this.state.skills,
      achievements: this.state.achievements,
      history: this.state.history,
      logs: this.state.logs,
      goals: this.state.goals,
      projects: this.state.projects,
      milestones: this.state.milestones,
      workSessions: this.state.workSessions,
      rewardTransactions: this.state.rewardTransactions,
      settings: this.state.settings,
    });

    // Queue cloud synchronization for authoritative state
    cloudSync.queueSync(this.state);
  }

  /**
   * Apply incoming authoritative state from Firestore (e.g. from the other device)
   */
  public applyCloudState(cloudState: AuthoritativeState): AuthoritativeState {
    if (!cloudState) return this.state;
    return this.mergeCloudAndLocal(cloudState, this.currentUserId);
  }

  /**
   * Deterministically merge cloud state with local state:
   * 1. Reward transaction ledger: union by ID (strictly idempotent, never duplicate XP/gold)
   * 2. Quests: merged by ID; if marked completed on either device, stays completed
   * 3. Skills: merged by ID, highest level and unlocked status preserved
   * 4. Achievements: union of unlocked status
   * 5. Player stats: highest level and XP, stats maxed, no phantom progression
   * 6. Goals, Projects, Milestones, WorkSessions: merged by ID
   */
  public mergeCloudAndLocal(cloudState: AuthoritativeState, targetUserId?: string): AuthoritativeState {
    if (targetUserId) {
      this.currentUserId = targetUserId;
      setCurrentUserId(targetUserId);
    }

    const local = this.state;
    const remote = cloudState;

    // 1. Merge Reward Transaction Ledger (Authoritative deduplication)
    const txMap = new Map<string, RewardTransaction>();
    (local.rewardTransactions || []).forEach((tx) => txMap.set(tx.id, tx));
    (remote.rewardTransactions || []).forEach((tx) => {
      if (!txMap.has(tx.id)) {
        txMap.set(tx.id, tx);
      }
    });
    const mergedTransactions = Array.from(txMap.values()).sort(
      (a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()
    );

    // 2. Merge Quests
    const questMap = new Map<string, Quest>();
    (local.quests || []).forEach((q) => questMap.set(q.id, { ...q }));
    (remote.quests || []).forEach((rq) => {
      const existing = questMap.get(rq.id);
      if (!existing) {
        questMap.set(rq.id, rq);
      } else {
        const isCompleted = existing.completed || rq.completed;
        const higherCount = Math.max(existing.currentCount || 0, rq.currentCount || 0);
        questMap.set(rq.id, {
          ...existing,
          ...rq,
          completed: isCompleted,
          completedAt: isCompleted ? (existing.completedAt || rq.completedAt || new Date().toISOString()) : undefined,
          currentCount: higherCount,
        });
      }
    });
    const mergedQuests = Array.from(questMap.values());

    // 3. Merge Skills
    const skillMap = new Map<string, SkillNode>();
    (local.skills || []).forEach((s) => skillMap.set(s.id, { ...s }));
    (remote.skills || []).forEach((rs) => {
      const existing = skillMap.get(rs.id);
      if (!existing) {
        skillMap.set(rs.id, rs);
      } else {
        const higherLevel = Math.max(existing.level, rs.level);
        const higherXP = Math.max(existing.xp, rs.xp);
        skillMap.set(rs.id, {
          ...existing,
          ...rs,
          level: higherLevel,
          xp: higherXP,
        });
      }
    });
    const mergedSkills = Array.from(skillMap.values());

    // 4. Merge Achievements
    const achievementMap = new Map<string, Achievement>();
    (local.achievements || INITIAL_ACHIEVEMENTS).forEach((a) => achievementMap.set(a.id, { ...a }));
    (remote.achievements || []).forEach((ra) => {
      const existing = achievementMap.get(ra.id);
      if (!existing) {
        achievementMap.set(ra.id, ra);
      } else if (ra.unlocked && !existing.unlocked) {
        achievementMap.set(ra.id, { ...existing, unlocked: true, unlockedAt: ra.unlockedAt });
      }
    });
    const mergedAchievements = Array.from(achievementMap.values());

    // 5. Merge Goals, Projects, Milestones, Sessions
    const goalMap = new Map<string, HunterGoal>();
    (local.goals || []).forEach((g) => goalMap.set(g.id, g));
    (remote.goals || []).forEach((g) => {
      const ex = goalMap.get(g.id);
      if (!ex || g.status === 'completed') goalMap.set(g.id, g);
    });

    const projectMap = new Map<string, HunterProject>();
    (local.projects || []).forEach((p) => projectMap.set(p.id, p));
    (remote.projects || []).forEach((p) => {
      const ex = projectMap.get(p.id);
      if (!ex || p.progress >= (ex.progress || 0)) projectMap.set(p.id, p);
    });

    const milestoneMap = new Map<string, HunterMilestone>();
    (local.milestones || []).forEach((m) => milestoneMap.set(m.id, m));
    (remote.milestones || []).forEach((m) => {
      const ex = milestoneMap.get(m.id);
      if (!ex || m.completed) milestoneMap.set(m.id, m);
    });

    const sessionMap = new Map<string, WorkSession>();
    (local.workSessions || []).forEach((w) => sessionMap.set(w.id, w));
    (remote.workSessions || []).forEach((w) => sessionMap.set(w.id, w));

    // 6. Merge Player Stats
    const totalXP = Math.max(local.player.totalXPEarned || 0, remote.player.totalXPEarned || 0);
    const maxLevel = Math.max(local.player.level, remote.player.level);
    const maxGold = Math.max(local.player.gold, remote.player.gold);
    const maxStreak = Math.max(local.player.streak, remote.player.streak);
    const maxFocus = Math.max(local.player.totalFocusSeconds || 0, remote.player.totalFocusSeconds || 0);
    const calculatedRank = getRankByLevel(maxLevel);

    const mergedPlayer: PlayerStats = {
      ...local.player,
      name: remote.player.name !== 'Sung Jin-Woo' ? remote.player.name : local.player.name,
      avatar: remote.player.avatar || local.player.avatar,
      title: remote.player.title || calculatedRank.title,
      rank: calculatedRank.rank,
      level: maxLevel,
      currentXP: Math.max(local.player.currentXP, remote.player.currentXP),
      requiredXP: calculateRequiredXP(maxLevel),
      totalXPEarned: totalXP,
      gold: maxGold,
      statPoints: Math.max(local.player.statPoints, remote.player.statPoints),
      streak: maxStreak,
      totalFocusSeconds: maxFocus,
      stats: {
        strength: Math.max(local.player.stats.strength, remote.player.stats.strength),
        agility: Math.max(local.player.stats.agility, remote.player.stats.agility),
        intelligence: Math.max(local.player.stats.intelligence, remote.player.stats.intelligence),
        perception: Math.max(local.player.stats.perception, remote.player.stats.perception),
        vitality: Math.max(local.player.stats.vitality, remote.player.stats.vitality),
      },
      skills: {
        motionDesign: Math.max(local.player.skills.motionDesign, remote.player.skills.motionDesign),
        editingSpeed: Math.max(local.player.skills.editingSpeed, remote.player.skills.editingSpeed),
        portfolio: Math.max(local.player.skills.portfolio, remote.player.skills.portfolio),
        clientAcquisition: Math.max(local.player.skills.clientAcquisition, remote.player.skills.clientAcquisition),
      },
    };

    // 7. Update internal state atomically
    this.state = {
      player: mergedPlayer,
      quests: mergedQuests,
      skills: mergedSkills,
      achievements: mergedAchievements,
      history: (remote.history && remote.history.length > local.history.length) ? remote.history : local.history,
      logs: [
        {
          id: `log-sync-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: 'Cloud synchronized domain state across devices with ledger integrity.',
          type: 'system',
        },
        ...local.logs.slice(0, 49),
      ],
      goals: Array.from(goalMap.values()),
      projects: Array.from(projectMap.values()),
      milestones: Array.from(milestoneMap.values()),
      workSessions: Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
      rewardTransactions: mergedTransactions,
      settings: {
        ...local.settings,
        ...(remote.settings || {}),
      },
    };

    // 8. Persist to local partition
    saveStoredData(STORAGE_KEY_PLAYER, this.state.player);
    saveStoredData(STORAGE_KEY_QUESTS, this.state.quests);
    saveStoredData(STORAGE_KEY_SKILLS, this.state.skills);
    saveStoredData(STORAGE_KEY_ACHIEVEMENTS, this.state.achievements);
    saveStoredData(STORAGE_KEY_HISTORY, this.state.history);
    saveStoredData(STORAGE_KEY_LOGS, this.state.logs);
    saveStoredData(STORAGE_KEY_GOALS, this.state.goals);
    saveStoredData(STORAGE_KEY_PROJECTS, this.state.projects);
    saveStoredData(STORAGE_KEY_MILESTONES, this.state.milestones);
    saveStoredData(STORAGE_KEY_SESSIONS, this.state.workSessions);
    saveStoredData(STORAGE_KEY_REWARD_TRANSACTIONS, this.state.rewardTransactions);
    saveStoredData(STORAGE_KEY_SETTINGS, this.state.settings);

    saveUserData(this.currentUserId, {
      profile: this.state.player,
      quests: this.state.quests,
      skills: this.state.skills,
      achievements: this.state.achievements,
      history: this.state.history,
      logs: this.state.logs,
      goals: this.state.goals,
      projects: this.state.projects,
      milestones: this.state.milestones,
      workSessions: this.state.workSessions,
      rewardTransactions: this.state.rewardTransactions,
      settings: this.state.settings,
    });

    domainEventBus.emit('PLAYER_STATE_UPDATED', { merged: true, userId: this.currentUserId }, 'system');
    this.notifyListeners();
    return this.state;
  }

  public addSystemLog(message: string, type: SystemLog['type']): SystemLog {
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message,
      type,
    };
    this.state = {
      ...this.state,
      logs: [newLog, ...this.state.logs.slice(0, 49)],
    };
    saveStoredData(STORAGE_KEY_LOGS, this.state.logs);
    return newLog;
  }

  /**
   * Synchronize recurring quest cycles (daily, weekly, monthly)
   */
  public synchronizeRecurringCycles(date: Date = new Date()): void {
    const synced = synchronizeQuestCycles(this.state.quests, this.state.rewardTransactions, date);
    let changed = false;
    if (synced.length !== this.state.quests.length) {
      changed = true;
    } else {
      for (let i = 0; i < synced.length; i++) {
        if (
          synced[i].completed !== this.state.quests[i].completed ||
          synced[i].rewardClaimed !== this.state.quests[i].rewardClaimed ||
          synced[i].lastRewardCycle !== this.state.quests[i].lastRewardCycle
        ) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      this.state = { ...this.state, quests: synced };
      saveStoredData(STORAGE_KEY_QUESTS, synced);
      this.notifyListeners();
    }
  }

  /**
   * Internal authoritative reward executor.
   * Only called through verified domain events (atomic quest completion, real focus session, verified milestone).
   */
  private internalGrantRewards(
    xpAmount: number,
    goldAmount: number,
    statPointsAmount: number = 0,
    sourceEvent: string,
    transactionId?: string,
    source: EventSource = 'system'
  ): { didLevelUp: boolean; didRankUp: boolean; newLevel: number; newRank: RankTier } {
    let newCurrentXP = this.state.player.currentXP + xpAmount;
    let newLevel = this.state.player.level;
    let newRequiredXP = this.state.player.requiredXP;
    let newStatPoints = this.state.player.statPoints + statPointsAmount;
    let didLevelUp = false;

    // Mathematical Level Ascension Calculation
    while (newCurrentXP >= newRequiredXP) {
      newCurrentXP -= newRequiredXP;
      newLevel += 1;
      newRequiredXP = calculateRequiredXP(newLevel);
      newStatPoints += 5; // +5 Stat points per level up
      didLevelUp = true;
    }

    const { rank: newRank, title: newTitle } = getRankByLevel(newLevel);
    const didRankUp = newRank !== this.state.player.rank;

    // Update Player Stats
    const updatedPlayer: PlayerStats = {
      ...this.state.player,
      level: newLevel,
      currentXP: newCurrentXP,
      requiredXP: newRequiredXP,
      totalXPEarned: this.state.player.totalXPEarned + xpAmount,
      gold: this.state.player.gold + goldAmount,
      statPoints: newStatPoints,
      rank: newRank,
      title: this.state.player.title === INITIAL_PLAYER_STATS.title ? newTitle : this.state.player.title,
    };

    // Update History Record for today
    const todayStr = new Date().toISOString().split('T')[0];
    const existingToday = this.state.history.find((h) => h.date === todayStr);
    let updatedHistory: XPHistoryEntry[];
    if (existingToday) {
      updatedHistory = this.state.history.map((h) =>
        h.date === todayStr
          ? { ...h, xp: h.xp + xpAmount, questsCompleted: h.questsCompleted + 1, level: newLevel }
          : h
      );
    } else {
      updatedHistory = [
        ...this.state.history,
        {
          date: todayStr,
          xp: xpAmount,
          questsCompleted: 1,
          level: newLevel,
          focusMinutes: 0,
        },
      ];
    }

    this.state = {
      ...this.state,
      player: updatedPlayer,
      history: updatedHistory,
    };

    // Emit Level Up / Rank Up domain events
    if (didRankUp) {
      domainEventBus.emit(
        'RANK_UP',
        {
          oldRank: this.state.player.rank,
          newRank,
          level: newLevel,
          title: newTitle,
        },
        source,
        transactionId
      );
      this.addSystemLog(`[RANK ASCENSION] Hunter evaluated and ascended to ${newRank}-Rank (${newTitle})!`, 'level_up');
    } else if (didLevelUp) {
      domainEventBus.emit(
        'LEVEL_UP',
        {
          newLevel,
          rank: newRank,
          statPointsGranted: 5,
        },
        source,
        transactionId
      );
      this.addSystemLog(`[LEVEL ASCENSION] Ascended to Level ${newLevel}! +5 Stat Points granted.`, 'level_up');
    }

    if (xpAmount > 0 || goldAmount > 0) {
      domainEventBus.emit(
        'REWARD_GRANTED',
        {
          xp: xpAmount,
          gold: goldAmount,
          statPoints: statPointsAmount,
          sourceEvent,
        },
        source,
        transactionId
      );
    }

    return { didLevelUp, didRankUp, newLevel, newRank };
  }

  /**
   * Atomic, Idempotent Quest Completion.
   * Enforces:
   * - Deterministic transaction ID
   * - Duplicate prevention across in-flight clicks, memory, and disk ledger
   * - No duplicate reward under refresh, uncheck/recheck, or double-click
   */
  public atomicCompleteQuest(
    questId: string,
    source: EventSource = 'user'
  ): DispatchResult {
    // In-flight mutex protection
    if (this.inFlightLocks.has(questId)) {
      return { success: false, actionType: 'COMPLETE_QUEST', reason: 'Operation in flight' };
    }
    this.inFlightLocks.add(questId);

    try {
      const targetQuest = this.state.quests.find((q) => q.id === questId);
      if (!targetQuest) {
        return {
          success: false,
          actionType: 'COMPLETE_QUEST',
          reason: `Quest with ID [${questId}] not found in state matrix.`,
        };
      }

      const currentCycle = getQuestCompletionCycle(targetQuest);
      const transactionId = `tx-${targetQuest.id}-${currentCycle}`;

      // Check whether reward was already claimed for this occurrence in transaction ledger (memory + disk)
      const persistedTxs = loadStoredData<RewardTransaction[]>(STORAGE_KEY_REWARD_TRANSACTIONS, []);
      const alreadyClaimed =
        isQuestRewardAlreadyClaimed(targetQuest, this.state.rewardTransactions) ||
        isQuestRewardAlreadyClaimed(targetQuest, persistedTxs);

      const completionTimestamp = new Date().toISOString();

      // Update quest state in matrix
      const updatedQuests = this.state.quests.map((q) =>
        q.id === targetQuest.id
          ? {
              ...q,
              completed: true,
              completedAt: completionTimestamp,
              rewardClaimed: true,
              lastRewardCycle: currentCycle,
              lastTransactionId: alreadyClaimed ? q.lastTransactionId || transactionId : transactionId,
            }
          : q
      );

      this.state = { ...this.state, quests: updatedQuests };
      saveStoredData(STORAGE_KEY_QUESTS, updatedQuests);

      // If already claimed for this cycle: DO NOT GRANT DUPLICATE REWARDS
      if (alreadyClaimed) {
        this.addSystemLog(
          `Quest Checked: [${targetQuest.title}] (Reward already recorded in transaction ledger for cycle ${currentCycle}).`,
          'quest_complete'
        );

        domainEventBus.emit(
          'QUEST_COMPLETED',
          {
            quest: targetQuest,
            alreadyClaimed: true,
            rewardGranted: false,
          },
          source,
          transactionId
        );

        this.notifyListeners();
        return {
          success: true,
          actionType: 'COMPLETE_QUEST',
          transactionId,
          reason: 'Quest verified complete. Reward previously claimed for this cycle.',
        };
      }

      // Record immutable Reward Transaction in ledger
      const newTx: RewardTransaction = {
        id: transactionId,
        questId: targetQuest.id,
        taskId: targetQuest.id,
        completionCycle: currentCycle,
        rewardType: 'quest_reward',
        amount: targetQuest.xpReward,
        xpGranted: targetQuest.xpReward,
        goldGranted: targetQuest.goldReward,
        statPointsGranted: targetQuest.statPointsReward || 0,
        claimedAt: completionTimestamp,
        createdAt: completionTimestamp,
        claimed: true,
      };

      const updatedTxs = [
        ...this.state.rewardTransactions.filter((t) => t.id !== transactionId),
        newTx,
      ];
      this.state = { ...this.state, rewardTransactions: updatedTxs };
      saveStoredData(STORAGE_KEY_REWARD_TRANSACTIONS, updatedTxs);

      // Grant legitimate XP, Gold, SP
      const rewardResult = this.internalGrantRewards(
        targetQuest.xpReward,
        targetQuest.goldReward,
        targetQuest.statPointsReward || 0,
        `Quest: ${targetQuest.title}`,
        transactionId,
        source
      );

      // Append-only achievement evaluation
      const { updatedAchievements, newlyUnlocked } = evaluateAchievements(
        this.state.achievements,
        this.state.player,
        updatedTxs
      );
      if (newlyUnlocked.length > 0) {
        this.state = { ...this.state, achievements: updatedAchievements };
        saveStoredData(STORAGE_KEY_ACHIEVEMENTS, updatedAchievements);
        newlyUnlocked.forEach((ach) => {
          domainEventBus.emit('ACHIEVEMENT_UNLOCKED', { achievement: ach }, source, transactionId);
          this.addSystemLog(`[ACHIEVEMENT UNLOCKED] ${ach.title} — ${ach.description}`, 'system');
        });
      }

      // Advance category skill XP if matched
      if (targetQuest.category) {
        const matchingSkill = this.state.skills.find((s) => s.category === targetQuest.category);
        if (matchingSkill && matchingSkill.level < matchingSkill.maxLevel) {
          const addedSkillXP = Math.min(
            matchingSkill.xpToNext,
            matchingSkill.xp + Math.floor(targetQuest.xpReward * 0.4)
          );
          const updatedSkills = this.state.skills.map((s) =>
            s.id === matchingSkill.id ? { ...s, xp: addedSkillXP } : s
          );
          this.state = { ...this.state, skills: updatedSkills };
          saveStoredData(STORAGE_KEY_SKILLS, updatedSkills);
        }
      }

      this.addSystemLog(
        `Quest Cleared: [${targetQuest.title}] (+${targetQuest.xpReward} XP, +${targetQuest.goldReward} Gold) [Tx: ${transactionId.slice(-8)}]`,
        'quest_complete'
      );

      domainEventBus.emit(
        'QUEST_COMPLETED',
        {
          quest: targetQuest,
          alreadyClaimed: false,
          rewardGranted: true,
          xpReward: targetQuest.xpReward,
          goldReward: targetQuest.goldReward,
          statPointsReward: targetQuest.statPointsReward,
        },
        source,
        transactionId
      );

      this.persist();
      this.notifyListeners();

      return {
        success: true,
        actionType: 'COMPLETE_QUEST',
        transactionId,
        rewardGranted: {
          xp: targetQuest.xpReward,
          gold: targetQuest.goldReward,
          statPoints: targetQuest.statPointsReward || 0,
        },
        didLevelUp: rewardResult.didLevelUp,
        didRankUp: rewardResult.didRankUp,
        newLevel: rewardResult.newLevel,
        newRank: rewardResult.newRank,
      };
    } finally {
      setTimeout(() => {
        this.inFlightLocks.delete(questId);
      }, 300);
    }
  }

  /**
   * Uncomplete Quest.
   * STRICT DOMAIN RULE:
   * Historical progression is permanent!
   * Unchecking does NOT deduct XP, Gold, Level, Rank, or Achievements.
   */
  public uncompleteQuest(questId: string, source: EventSource = 'user'): DispatchResult {
    const targetQuest = this.state.quests.find((q) => q.id === questId);
    if (!targetQuest) {
      return { success: false, actionType: 'UNCOMPLETE_QUEST', reason: 'Quest not found' };
    }

    const updatedQuests = this.state.quests.map((q) =>
      q.id === questId ? { ...q, completed: false } : q
    );

    this.state = { ...this.state, quests: updatedQuests };
    saveStoredData(STORAGE_KEY_QUESTS, updatedQuests);

    this.addSystemLog(
      `Quest Checked Off: [${targetQuest.title}] (Historical rewards remain permanent in progression ledger).`,
      'system'
    );

    domainEventBus.emit('QUEST_UNCOMPLETED', { quest: targetQuest }, source);

    this.notifyListeners();
    return { success: true, actionType: 'UNCOMPLETE_QUEST' };
  }

  /**
   * Create a new Quest
   */
  public createQuest(questData: Partial<Quest>, source: EventSource = 'user'): Quest {
    const newQuest: Quest = {
      id: questData.id || `quest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: questData.title || 'Untitled Directive',
      description: questData.description || '',
      type: questData.type || 'daily',
      rank: questData.rank || 'E',
      category: questData.category || 'General',
      xpReward: Math.max(10, Math.min(500, Number(questData.xpReward) || 50)),
      goldReward: Math.max(5, Math.min(500, Number(questData.goldReward) || 40)),
      statPointsReward: Math.max(0, Math.min(2, Number(questData.statPointsReward) || 0)),
      completed: false,
      dueDate: questData.dueDate,
      targetCount: questData.targetCount,
      unit: questData.unit,
      goalId: questData.goalId,
      projectId: questData.projectId,
      milestoneId: questData.milestoneId,
    };

    const updatedQuests = [newQuest, ...this.state.quests];
    this.state = { ...this.state, quests: updatedQuests };
    saveStoredData(STORAGE_KEY_QUESTS, updatedQuests);

    this.addSystemLog(`New Quest Issued: [${newQuest.title}] (${newQuest.rank}-Rank)`, 'system');
    domainEventBus.emit('QUEST_CREATED', { quest: newQuest }, source);

    this.notifyListeners();
    return newQuest;
  }

  /**
   * Update an existing Quest
   */
  public updateQuest(questId: string, updates: Partial<Quest>, source: EventSource = 'user'): boolean {
    const target = this.state.quests.find((q) => q.id === questId);
    if (!target) return false;

    const updatedQuests = this.state.quests.map((q) =>
      q.id === questId ? { ...q, ...updates } : q
    );
    this.state = { ...this.state, quests: updatedQuests };
    saveStoredData(STORAGE_KEY_QUESTS, updatedQuests);

    domainEventBus.emit('QUEST_UPDATED', { questId, updates }, source);
    this.notifyListeners();
    return true;
  }

  /**
   * Delete a Quest
   */
  public deleteQuest(questId: string, source: EventSource = 'user'): boolean {
    const target = this.state.quests.find((q) => q.id === questId);
    if (!target) return false;

    const updatedQuests = this.state.quests.filter((q) => q.id !== questId);
    this.state = { ...this.state, quests: updatedQuests };
    saveStoredData(STORAGE_KEY_QUESTS, updatedQuests);

    this.addSystemLog(`[DIRECTIVE REVOKED] Quest [${target.title}] removed.`, 'system');
    domainEventBus.emit('QUEST_DELETED', { questId, title: target.title }, source);

    this.notifyListeners();
    return true;
  }

  /**
   * Record a Real Verified Focus Work Session.
   * Awards XP and Gold derived strictly from real elapsed time.
   */
  public recordFocusSession(
    durationSeconds: number,
    mode: string,
    tag: string,
    source: EventSource = 'timer'
  ): DispatchResult {
    if (durationSeconds <= 0) {
      return { success: false, actionType: 'END_FOCUS_SESSION', reason: 'Duration must be > 0' };
    }

    const minutes = Math.floor(durationSeconds / 60);
    const xpEarned = Math.max(10, Math.floor(minutes * 10));
    const goldEarned = Math.max(5, Math.floor(minutes * 8));

    const newSession: WorkSession = {
      id: `session-${Date.now()}`,
      durationSeconds,
      xpEarned,
      completedAt: new Date().toISOString(),
      mode: (mode as any) || 'deep_work',
      tag,
    };

    // Update Player Total Focus Time
    const updatedPlayer: PlayerStats = {
      ...this.state.player,
      totalFocusSeconds: (this.state.player.totalFocusSeconds || 0) + durationSeconds,
    };

    // Update Sessions
    const updatedSessions = [newSession, ...this.state.workSessions.slice(0, 99)];

    // Update History Focus Minutes
    const todayStr = new Date().toISOString().split('T')[0];
    const existingToday = this.state.history.find((h) => h.date === todayStr);
    let updatedHistory: XPHistoryEntry[];
    if (existingToday) {
      updatedHistory = this.state.history.map((h) =>
        h.date === todayStr ? { ...h, focusMinutes: (h.focusMinutes || 0) + minutes } : h
      );
    } else {
      updatedHistory = [
        ...this.state.history,
        {
          date: todayStr,
          xp: 0,
          questsCompleted: 0,
          level: this.state.player.level,
          focusMinutes: minutes,
        },
      ];
    }

    this.state = {
      ...this.state,
      player: updatedPlayer,
      workSessions: updatedSessions,
      history: updatedHistory,
    };

    // Grant rewards legitimately
    const txId = `tx-focus-${newSession.id}`;
    const rewardResult = this.internalGrantRewards(
      xpEarned,
      goldEarned,
      0,
      `Focus Session: ${tag}`,
      txId,
      source
    );

    this.addSystemLog(
      `Focus Session Concluded: [${tag}] (${minutes} mins). Gained +${xpEarned} XP, +${goldEarned} Gold.`,
      'work_session'
    );

    domainEventBus.emit(
      'FOCUS_COMPLETED',
      {
        session: newSession,
        xpEarned,
        goldEarned,
        minutes,
      },
      source,
      txId
    );

    this.persist();
    this.notifyListeners();

    return {
      success: true,
      actionType: 'END_FOCUS_SESSION',
      transactionId: txId,
      rewardGranted: { xp: xpEarned, gold: goldEarned, statPoints: 0 },
      didLevelUp: rewardResult.didLevelUp,
      didRankUp: rewardResult.didRankUp,
      newLevel: rewardResult.newLevel,
      newRank: rewardResult.newRank,
    };
  }

  /**
   * Distribute a single Stat Point to an attribute or skill
   */
  public distributeStatPoint(statKey: keyof PlayerStats['stats'], source: EventSource = 'user'): boolean {
    if (this.state.player.statPoints <= 0) {
      return false;
    }

    const updatedPlayer: PlayerStats = {
      ...this.state.player,
      statPoints: this.state.player.statPoints - 1,
      stats: {
        ...this.state.player.stats,
        [statKey]: (this.state.player.stats[statKey] || 10) + 1,
      },
    };

    this.state = { ...this.state, player: updatedPlayer };
    saveStoredData(STORAGE_KEY_PLAYER, updatedPlayer);

    this.addSystemLog(`Hunter parameter enhanced: ${String(statKey).toUpperCase()} +1`, 'system');
    domainEventBus.emit('SKILL_POINTS_DISTRIBUTED', { statKey }, source);

    this.notifyListeners();
    return true;
  }

  /**
   * Upgrade a Skill with 1 Stat Point
   */
  public upgradeSkill(skillId: string, source: EventSource = 'user'): boolean {
    if (this.state.player.statPoints <= 0) {
      return false;
    }

    const targetSkill = this.state.skills.find((s) => s.id === skillId);
    if (!targetSkill || targetSkill.level >= targetSkill.maxLevel) {
      return false;
    }

    const nextLevel = targetSkill.level + 1;
    const updatedSkills = this.state.skills.map((s) =>
      s.id === skillId
        ? {
            ...s,
            level: nextLevel,
            xp: 0,
            xpToNext: Math.floor(s.xpToNext * 1.3),
          }
        : s
    );

    const updatedPlayer: PlayerStats = {
      ...this.state.player,
      statPoints: this.state.player.statPoints - 1,
    };

    this.state = {
      ...this.state,
      player: updatedPlayer,
      skills: updatedSkills,
    };

    saveStoredData(STORAGE_KEY_PLAYER, updatedPlayer);
    saveStoredData(STORAGE_KEY_SKILLS, updatedSkills);

    this.addSystemLog(`Skill Awakened: [${targetSkill.name}] reached Tier ${nextLevel}!`, 'skill_upgrade');
    domainEventBus.emit('SKILL_POINTS_DISTRIBUTED', { skillId, nextLevel }, source);

    this.notifyListeners();
    return true;
  }

  /**
   * Unlock or awaken a Skill node in the Hunter Matrix
   */
  public unlockSkill(skillData: Partial<SkillNode>, source: EventSource = 'user'): SkillNode {
    const existing = this.state.skills.find(
      (s) => s.name.toLowerCase() === (skillData.name || '').toLowerCase()
    );
    if (existing) {
      return existing;
    }
    const newSkill: SkillNode = {
      id: skillData.id || `skill-${Date.now()}`,
      name: skillData.name || 'Awakened Capability',
      category: skillData.category || 'General',
      level: Number(skillData.level) || 1,
      maxLevel: Number(skillData.maxLevel) || 10,
      xp: Number(skillData.xp) || 0,
      xpToNext: Number(skillData.xpToNext) || 300,
      description: skillData.description || 'Awakened capability node in Hunter matrix.',
      buff: skillData.buff || '+10% Efficiency',
      iconName: skillData.iconName || 'Sparkles',
    };
    const updatedSkills = [...this.state.skills, newSkill];
    this.state = { ...this.state, skills: updatedSkills };
    saveStoredData(STORAGE_KEY_SKILLS, updatedSkills);
    this.addSystemLog(`[SKILL AWAKENED] ${newSkill.name} unlocked in Hunter matrix.`, 'skill_upgrade');
    domainEventBus.emit('SKILL_UNLOCKED', { skill: newSkill }, source);
    this.notifyListeners();
    return newSkill;
  }

  /**
   * Delete or remove a Skill node from the Hunter Matrix.
   * If any Stat Points were spent upgrading this skill (level > 1),
   * they are automatically refunded to the hunter's statPoints pool.
   */
  public deleteSkill(
    skillIdentifier: string,
    source: EventSource = 'user'
  ): { success: boolean; deletedSkill?: SkillNode; refundedStatPoints: number } {
    const cleanId = (skillIdentifier || '').trim().toLowerCase();
    const targetSkill = this.state.skills.find(
      (s) => s.id.toLowerCase() === cleanId || s.name.toLowerCase() === cleanId
    );

    if (!targetSkill) {
      return { success: false, refundedStatPoints: 0 };
    }

    const updatedSkills = this.state.skills.filter((s) => s.id !== targetSkill.id);
    const refundedPoints = Math.max(0, (targetSkill.level || 1) - 1);

    const updatedPlayer: PlayerStats = refundedPoints > 0
      ? {
          ...this.state.player,
          statPoints: this.state.player.statPoints + refundedPoints,
        }
      : this.state.player;

    this.state = {
      ...this.state,
      skills: updatedSkills,
      player: updatedPlayer,
    };

    saveStoredData(STORAGE_KEY_SKILLS, updatedSkills);
    if (refundedPoints > 0) {
      saveStoredData(STORAGE_KEY_PLAYER, updatedPlayer);
    }
    this.persist();

    this.addSystemLog(
      `[SKILL REMOVED] Skill [${targetSkill.name}] was removed from Hunter Matrix.${refundedPoints > 0 ? ` Refunded +${refundedPoints} SP.` : ''}`,
      'system'
    );

    domainEventBus.emit(
      'SKILL_DELETED',
      {
        skill: targetSkill,
        skillId: targetSkill.id,
        name: targetSkill.name,
        refundedStatPoints: refundedPoints,
      },
      source
    );

    this.notifyListeners();

    return {
      success: true,
      deletedSkill: targetSkill,
      refundedStatPoints: refundedPoints,
    };
  }

  /**
   * Update Player metadata (name, title, avatar) safely.
   * Arbitrary progression changes (XP/Gold/Level/Rank) are never allowed through this method.
   */
  public updatePlayerProfile(updates: { name?: string; title?: string; avatar?: string }, source: EventSource = 'user'): boolean {
    const updatedPlayer: PlayerStats = {
      ...this.state.player,
      name: updates.name || this.state.player.name,
      title: updates.title || this.state.player.title,
      avatar: updates.avatar !== undefined ? updates.avatar : this.state.player.avatar,
    };

    this.state = { ...this.state, player: updatedPlayer };
    saveStoredData(STORAGE_KEY_PLAYER, updatedPlayer);

    this.addSystemLog(`Hunter registry updated: ${updatedPlayer.name} (${updatedPlayer.title})`, 'system');
    domainEventBus.emit('PLAYER_STATE_UPDATED', { updates }, source);

    this.notifyListeners();
    return true;
  }

  /**
   * Goal Hierarchy Management: HunterGoal
   */
  public createGoal(goalData: Partial<HunterGoal>, source: EventSource = 'user'): HunterGoal {
    const newGoal: HunterGoal = {
      id: goalData.id || `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: goalData.title || 'Untitled Strategic Objective',
      description: goalData.description || '',
      category: goalData.category || 'General',
      progress: Math.max(0, Math.min(100, Number(goalData.progress) || 0)),
      status: goalData.status || 'active',
      targetDate: goalData.targetDate,
      dailyHoursTarget: goalData.dailyHoursTarget,
      weeklyHoursTarget: goalData.weeklyHoursTarget,
      createdAt: goalData.createdAt || new Date().toISOString(),
    };

    const updatedGoals = [newGoal, ...this.state.goals];
    this.state = { ...this.state, goals: updatedGoals };
    saveStoredData(STORAGE_KEY_GOALS, updatedGoals);

    this.addSystemLog(`[STRATEGIC OBJECTIVE REGISTERED] ${newGoal.title}`, 'system');
    domainEventBus.emit('GOAL_CREATED', { goal: newGoal }, source);

    this.notifyListeners();
    return newGoal;
  }

  public updateGoal(goalId: string, updates: Partial<HunterGoal>, source: EventSource = 'user'): boolean {
    const exists = this.state.goals.some((g) => g.id === goalId);
    if (!exists) return false;

    const updatedGoals = this.state.goals.map((g) => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        ...updates,
        progress: updates.progress !== undefined ? Math.max(0, Math.min(100, updates.progress)) : g.progress,
      };
    });

    this.state = { ...this.state, goals: updatedGoals };
    saveStoredData(STORAGE_KEY_GOALS, updatedGoals);

    domainEventBus.emit('GOAL_UPDATED', { goalId, updates }, source);
    this.notifyListeners();
    return true;
  }

  public deleteGoal(goalId: string, source: EventSource = 'user'): boolean {
    const target = this.state.goals.find((g) => g.id === goalId);
    if (!target) return false;

    const updatedGoals = this.state.goals.filter((g) => g.id !== goalId);
    this.state = { ...this.state, goals: updatedGoals };
    saveStoredData(STORAGE_KEY_GOALS, updatedGoals);

    this.addSystemLog(`[OBJECTIVE DISSOLVED] ${target.title}`, 'system');
    domainEventBus.emit('GOAL_DELETED', { goalId }, source);

    this.notifyListeners();
    return true;
  }

  /**
   * Project Hierarchy Management: HunterProject
   */
  public createProject(projectData: Partial<HunterProject>, source: EventSource = 'user'): HunterProject {
    const newProject: HunterProject = {
      id: projectData.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      goalId: projectData.goalId,
      title: projectData.title || 'Untitled Project',
      description: projectData.description || '',
      category: projectData.category || 'General',
      progress: Math.max(0, Math.min(100, Number(projectData.progress) || 0)),
      status: projectData.status || 'active',
      createdAt: projectData.createdAt || new Date().toISOString(),
    };

    const updatedProjects = [newProject, ...this.state.projects];
    this.state = { ...this.state, projects: updatedProjects };
    saveStoredData(STORAGE_KEY_PROJECTS, updatedProjects);

    this.addSystemLog(`[PROJECT INITIALIZED] ${newProject.title}`, 'system');
    this.notifyListeners();
    return newProject;
  }

  public updateProject(projectId: string, updates: Partial<HunterProject>, source: EventSource = 'user'): boolean {
    const exists = this.state.projects.some((p) => p.id === projectId);
    if (!exists) return false;

    const updatedProjects = this.state.projects.map((p) => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        ...updates,
        progress: updates.progress !== undefined ? Math.max(0, Math.min(100, updates.progress)) : p.progress,
      };
    });

    this.state = { ...this.state, projects: updatedProjects };
    saveStoredData(STORAGE_KEY_PROJECTS, updatedProjects);
    this.notifyListeners();
    return true;
  }

  public deleteProject(projectId: string, source: EventSource = 'user'): boolean {
    const target = this.state.projects.find((p) => p.id === projectId);
    if (!target) return false;

    const updatedProjects = this.state.projects.filter((p) => p.id !== projectId);
    this.state = { ...this.state, projects: updatedProjects };
    saveStoredData(STORAGE_KEY_PROJECTS, updatedProjects);

    this.addSystemLog(`[PROJECT ARCHIVED] ${target.title}`, 'system');
    this.notifyListeners();
    return true;
  }

  /**
   * Milestone Hierarchy Management: HunterMilestone
   */
  public createMilestone(milestoneData: Partial<HunterMilestone>, source: EventSource = 'user'): HunterMilestone {
    const newMilestone: HunterMilestone = {
      id: milestoneData.id || `ms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: milestoneData.projectId,
      goalId: milestoneData.goalId,
      title: milestoneData.title || 'Milestone Stage',
      description: milestoneData.description || '',
      completed: milestoneData.completed || false,
      order: milestoneData.order || 0,
      xpReward: milestoneData.xpReward || 50,
      goldReward: milestoneData.goldReward || 40,
      createdAt: milestoneData.createdAt || new Date().toISOString(),
    };

    const updatedMilestones = [...this.state.milestones, newMilestone];
    this.state = { ...this.state, milestones: updatedMilestones };
    saveStoredData(STORAGE_KEY_MILESTONES, updatedMilestones);

    domainEventBus.emit('MILESTONE_CREATED', { milestone: newMilestone }, source);
    this.notifyListeners();
    return newMilestone;
  }

  public updateMilestone(milestoneId: string, updates: Partial<HunterMilestone>, source: EventSource = 'user'): boolean {
    const exists = this.state.milestones.some((m) => m.id === milestoneId);
    if (!exists) return false;

    const updatedMilestones = this.state.milestones.map((m) =>
      m.id === milestoneId ? { ...m, ...updates } : m
    );

    this.state = { ...this.state, milestones: updatedMilestones };
    saveStoredData(STORAGE_KEY_MILESTONES, updatedMilestones);

    domainEventBus.emit('MILESTONE_UPDATED', { milestoneId, updates }, source);
    this.notifyListeners();
    return true;
  }

  public deleteMilestone(milestoneId: string, source: EventSource = 'user'): boolean {
    const target = this.state.milestones.find((m) => m.id === milestoneId);
    if (!target) return false;

    const updatedMilestones = this.state.milestones.filter((m) => m.id !== milestoneId);
    this.state = { ...this.state, milestones: updatedMilestones };
    saveStoredData(STORAGE_KEY_MILESTONES, updatedMilestones);

    this.notifyListeners();
    return true;
  }

  public completeMilestone(milestoneId: string, source: EventSource = 'user'): boolean {
    const target = this.state.milestones.find((m) => m.id === milestoneId);
    if (!target || target.completed) return false;

    const transactionId = `tx-milestone-${milestoneId}-${Date.now()}`;
    const xpReward = Number(target.xpReward) || 50;
    const goldReward = Number(target.goldReward) || 40;

    const rewardResult = this.internalGrantRewards(
      xpReward,
      goldReward,
      0,
      `Milestone Achieved: ${target.title}`,
      transactionId,
      source
    );

    const updatedMilestones = this.state.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: true, completedAt: new Date().toISOString() } : m
    );

    this.state = { ...this.state, milestones: updatedMilestones };
    saveStoredData(STORAGE_KEY_MILESTONES, updatedMilestones);

    this.addSystemLog(`[MILESTONE CONQUERED] ${target.title}: +${xpReward} XP, +${goldReward} Gold`, 'quest_complete');
    domainEventBus.emit('MILESTONE_COMPLETED', { milestone: target, rewardGranted: rewardResult }, source);

    this.notifyListeners();
    return true;
  }

  /**
   * Central Controlled Action Pipeline Dispatcher
   * AI intent -> Action parser -> Action validator -> State Authority -> Transaction validation -> Event emission
   */
  public dispatch(action: DomainAction, source: EventSource = 'user'): DispatchResult {
    // 1. Validation pipeline
    const validation = validateDomainAction(action, source, {
      quests: this.state.quests,
      goals: this.state.goals,
      statPoints: this.state.player.statPoints,
    });

    if (!validation.isValid || !validation.normalizedAction) {
      const reason = validation.rejectionReason || 'Action failed domain validation.';
      this.addSystemLog(`[ACTION REJECTED] ${reason}`, 'system');

      domainEventBus.emit(
        'AI_ACTION_REJECTED',
        {
          attemptedAction: action,
          reason,
          isArbitraryProgressionAttempt: validation.isArbitraryProgressionAttempt || false,
        },
        source
      );

      return {
        success: false,
        actionType: action.type,
        reason,
      };
    }

    const { normalizedAction } = validation;
    const payload = normalizedAction.payload || {};

    let result: DispatchResult;

    // 2. State Authority execution
    switch (normalizedAction.type) {
      case 'COMPLETE_QUEST': {
        result = this.atomicCompleteQuest(payload.questId, source);
        break;
      }

      case 'UNCOMPLETE_QUEST': {
        result = this.uncompleteQuest(payload.questId, source);
        break;
      }

      case 'CREATE_QUEST': {
        const q = this.createQuest(payload, source);
        result = { success: true, actionType: 'CREATE_QUEST' };
        break;
      }

      case 'BATCH_ADD_QUESTS': {
        const created: Quest[] = [];
        const rawList = Array.isArray(payload.quests) ? payload.quests : [];
        for (const item of rawList) {
          created.push(this.createQuest(item, source));
        }
        result = { success: true, actionType: 'BATCH_ADD_QUESTS' };
        break;
      }

      case 'UPDATE_QUEST': {
        const ok = this.updateQuest(payload.questId || payload.id, payload.updates || payload, source);
        result = { success: ok, actionType: 'UPDATE_QUEST' };
        break;
      }

      case 'DELETE_QUEST': {
        const questId = payload.questId || payload.id;
        const ok = this.deleteQuest(questId, source);
        result = { success: ok, actionType: 'DELETE_QUEST' };
        break;
      }

      case 'END_FOCUS_SESSION': {
        result = this.recordFocusSession(
          payload.durationSeconds,
          payload.mode || 'deep_work',
          payload.tag || 'Focus Work',
          source
        );
        break;
      }

      case 'DISTRIBUTE_SKILL_POINTS': {
        const ok = this.distributeStatPoint(payload.statKey, source);
        result = { success: ok, actionType: 'DISTRIBUTE_SKILL_POINTS' };
        break;
      }

      case 'CREATE_PENALTY': {
        const penaltyQuest = this.createQuest(
          {
            title: payload.title,
            description: payload.description,
            type: 'penalty',
            rank: 'E',
            category: 'Life',
            xpReward: payload.xpReward || 30,
            goldReward: payload.goldReward || 20,
          },
          source
        );
        domainEventBus.emit('PENALTY_STARTED', { quest: penaltyQuest }, source);
        result = { success: true, actionType: 'CREATE_PENALTY' };
        break;
      }

      case 'UPDATE_PLAYER_STATE': {
        const ok = this.updatePlayerProfile(payload, source);
        result = { success: ok, actionType: 'UPDATE_PLAYER_STATE' };
        break;
      }

      case 'ADD_SKILL':
      case 'UNLOCK_SKILL': {
        this.unlockSkill(payload, source);
        result = { success: true, actionType: 'ADD_SKILL' };
        break;
      }

      case 'UPGRADE_SKILL': {
        const targetSkill = this.state.skills.find(
          (s) => s.id === payload.skillId || s.name.toLowerCase().includes((payload.skillName || '').toLowerCase())
        );
        if (targetSkill) {
          const ok = this.upgradeSkill(targetSkill.id, source);
          result = { success: ok, actionType: 'UPGRADE_SKILL' };
        } else {
          result = { success: false, actionType: 'UPGRADE_SKILL', reason: 'Skill not found' };
        }
        break;
      }

      case 'DELETE_SKILL':
      case 'REMOVE_SKILL': {
        const targetId = payload.skillId || payload.id || payload.skillName || payload.name;
        const res = this.deleteSkill(targetId, source);
        result = {
          success: res.success,
          actionType: 'DELETE_SKILL',
          refundedStatPoints: res.refundedStatPoints,
          reason: res.success ? undefined : 'Skill not found',
        };
        break;
      }

      case 'CREATE_GOAL': {
        const g = this.createGoal(payload, source);
        result = { success: true, actionType: 'CREATE_GOAL' };
        break;
      }

      case 'UPDATE_GOAL': {
        const ok = this.updateGoal(payload.goalId || payload.id, payload.updates || payload, source);
        result = { success: ok, actionType: 'UPDATE_GOAL' };
        break;
      }

      case 'DELETE_GOAL': {
        const ok = this.deleteGoal(payload.goalId || payload.id, source);
        result = { success: ok, actionType: 'DELETE_GOAL' };
        break;
      }

      case 'CREATE_PROJECT': {
        const p = this.createProject(payload, source);
        result = { success: true, actionType: 'CREATE_PROJECT' };
        break;
      }

      case 'UPDATE_PROJECT': {
        const ok = this.updateProject(payload.projectId || payload.id, payload.updates || payload, source);
        result = { success: ok, actionType: 'UPDATE_PROJECT' };
        break;
      }

      case 'DELETE_PROJECT': {
        const ok = this.deleteProject(payload.projectId || payload.id, source);
        result = { success: ok, actionType: 'DELETE_PROJECT' };
        break;
      }

      case 'CREATE_MILESTONE': {
        const m = this.createMilestone(payload, source);
        result = { success: true, actionType: 'CREATE_MILESTONE' };
        break;
      }

      case 'UPDATE_MILESTONE': {
        const ok = this.updateMilestone(payload.milestoneId || payload.id, payload.updates || payload, source);
        result = { success: ok, actionType: 'UPDATE_MILESTONE' };
        break;
      }

      case 'COMPLETE_MILESTONE': {
        const ok = this.completeMilestone(payload.milestoneId || payload.id, source);
        result = { success: ok, actionType: 'COMPLETE_MILESTONE' };
        break;
      }

      case 'DELETE_MILESTONE': {
        const ok = this.deleteMilestone(payload.milestoneId || payload.id, source);
        result = { success: ok, actionType: 'DELETE_MILESTONE' };
        break;
      }

      default: {
        result = {
          success: false,
          actionType: normalizedAction.type,
          reason: `Unsupported action type: ${normalizedAction.type}`,
        };
      }
    }

    if (source === 'ai') {
      if (result.success) {
        domainEventBus.emit('AI_ACTION_EXECUTED', { action: normalizedAction, result }, 'ai');
      } else {
        domainEventBus.emit('AI_ACTION_REJECTED', { action: normalizedAction, reason: result.reason }, 'ai');
      }
    }

    return result;
  }

  /**
   * Execute Factory Reset through authoritative reset pipeline.
   * Truly wipes progression, clears ledgers, and restores initial pristine status.
   */
  public factoryReset(): AuthoritativeState {
    const result = executeFactoryReset(this.state.player.name, this.currentUserId);
    this.state = {
      player: result.player,
      quests: result.quests,
      skills: result.skills,
      achievements: result.achievements,
      history: result.history,
      logs: result.logs,
      goals: result.goals || [],
      projects: [],
      milestones: [],
      workSessions: result.workSessions || [],
      rewardTransactions: [],
      settings: this.state.settings || DEFAULT_USER_SETTINGS,
    };

    saveStoredData(STORAGE_KEY_PROJECTS, []);
    saveStoredData(STORAGE_KEY_MILESTONES, []);
    this.persist();
    domainEventBus.clearHistory();

    domainEventBus.emit('PLAYER_STATE_UPDATED', { reset: true }, 'system');
    this.notifyListeners();

    return this.state;
  }
}

export const stateAuthority = new StateAuthorityClass();
