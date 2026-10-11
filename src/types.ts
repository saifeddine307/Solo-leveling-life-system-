export type RankTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'National' | 'Monarch';

export type QuestType = 'daily' | 'weekly' | 'monthly' | 'penalty' | 'boss';

export type NavigationTab = 'home' | 'quests' | 'ai' | 'analytics' | 'character' | 'settings';

export type AIAutonomyMode = 'suggest_only' | 'ask_before_apply' | 'auto_apply';
export type AIProviderType = 'gemini' | 'local';

export interface HunterGoal {
  id: string;
  title: string;
  description: string;
  targetDate?: string;
  dailyHoursTarget?: number;
  weeklyHoursTarget?: number;
  category: string;
  progress: number; // 0 - 100
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

export interface HunterProject {
  id: string;
  goalId?: string;
  title: string;
  description: string;
  category: string;
  progress: number; // 0 - 100
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  completedAt?: string;
}

export interface HunterMilestone {
  id: string;
  projectId?: string;
  goalId?: string;
  title: string;
  description: string;
  completed: boolean;
  order?: number;
  xpReward?: number;
  goldReward?: number;
  rewardClaimed?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface GeneratedQuestPlan {
  id: string;
  goalTitle: string;
  durationDays: number;
  availableDailyHours: number;
  totalEstimatedHours: number;
  analysisSummary?: string;
  quests: Quest[];
  status: 'suggested' | 'approved' | 'rejected' | 'applied';
  createdAt: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  plan?: GeneratedQuestPlan;
  actionProposals?: Array<{
    type: 'create_task' | 'update_task' | 'delete_task' | 'update_goal';
    task?: Quest;
    taskId?: string;
    updates?: Partial<Quest>;
    reason?: string;
    goal?: HunterGoal;
  }>;
  toolsUsed?: string[];
  isError?: boolean;
}

export type AccentColor = 'purple' | 'cyan' | 'emerald' | 'gold' | 'rose';
export type ThemeMode = 'light' | 'dark' | 'midnight' | 'cyber';

export enum SoundEvent {
  SYSTEM_OPEN = 'SYSTEM_OPEN',
  SYSTEM_CLOSE = 'SYSTEM_CLOSE',
  QUEST_CREATED = 'QUEST_CREATED',
  QUEST_COMPLETE = 'QUEST_COMPLETE',
  XP_GAIN = 'XP_GAIN',
  LEVEL_UP = 'LEVEL_UP',
  RANK_UP = 'RANK_UP',
  ACHIEVEMENT_UNLOCK = 'ACHIEVEMENT_UNLOCK',
  TIMER_START = 'TIMER_START',
  TIMER_PAUSE = 'TIMER_PAUSE',
  TIMER_COMPLETE = 'TIMER_COMPLETE',
  AI_ACTION = 'AI_ACTION',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  AWAKENING = 'AWAKENING',
  BUTTON_CONFIRM = 'BUTTON_CONFIRM',
  // Backward compatible event aliases
  SYSTEM_AI_PING = 'SYSTEM_AI_PING',
  PLAN_APPLIED = 'PLAN_APPLIED',
  SYSTEM_BOOT = 'SYSTEM_BOOT',
  LIGHTNING_PULSE = 'LIGHTNING_PULSE',
  QUESTION_APPEAR = 'QUESTION_APPEAR',
  ANSWER_CONFIRM = 'ANSWER_CONFIRM',
  ANALYSIS_PULSE = 'ANALYSIS_PULSE',
  PROFILE_REVEAL = 'PROFILE_REVEAL',
  AWAKENING_SURGE = 'AWAKENING_SURGE',
}

export interface HunterAwakeningAnswer {
  questionId: string;
  questionText: string;
  answerText: string;
  category?: string;
  timestamp: string;
}

export interface HunterAwakeningProfile {
  preferredName: string;
  title: string;
  primaryPath: string;
  primaryGoal: string;
  secondaryGoals: string[];
  interests: string[];
  learningStyle: string;
  dailyAvailableMinutes: number;
  questPreference: string;
  recommendedFocusAreas: string[];
  suggestedStats?: {
    strength: number;
    agility: number;
    intelligence: number;
    perception: number;
    vitality: number;
  };
  suggestedSkills?: Array<{
    name: string;
    description: string;
    buff: string;
    category: string;
  }>;
  initialQuests: Quest[];
}

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  createdAt: string;
  isGuest?: boolean;
}

export interface UserSettings {
  language: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  theme: ThemeMode;
  accentColor: AccentColor;
  notificationsEnabled: boolean;
  timeFormat: '12h' | '24h';
  publicProfileEnabled: boolean;
  customSfx?: Partial<Record<SoundEvent, string>>;
}

export type QuestCategory = 'Motion Design' | 'Editing Speed' | 'Portfolio' | 'Client Acquisition' | 'Fitness' | 'Life' | 'Study' | 'Coding' | 'General';

export type SystemActionType =
  | 'ADD_QUEST'
  | 'CREATE_QUEST'
  | 'BATCH_ADD_QUESTS'
  | 'COMPLETE_QUEST'
  | 'UPDATE_QUEST'
  | 'DELETE_QUEST'
  | 'ADD_XP'
  | 'GRANT_REWARDS'
  | 'APPLY_PENALTY'
  | 'ADD_SKILL'
  | 'UNLOCK_SKILL'
  | 'UPGRADE_SKILL'
  | 'DELETE_SKILL'
  | 'REMOVE_SKILL'
  | 'ADD_GOAL'
  | 'UPDATE_PLAYER_STATS'
  | 'ADD_SYSTEM_LOG'
  | 'TRIGGER_NOTIFICATION';

export interface SystemAction {
  id?: string;
  type: SystemActionType;
  payload: any;
  status?: 'pending' | 'applied' | 'rejected';
}

export interface RewardTransaction {
  id: string; // Deterministic unique ID: tx-${questId}-${completionCycle}
  questId: string;
  taskId?: string; // Standard alias for questId
  completionCycle: string; // e.g. 2026-09-03, 2026-W36, 2026-09, one-time
  rewardType?: string; // 'quest_reward' | 'penalty_clear' | 'system_action'
  amount?: number; // total reward value
  xpGranted: number;
  goldGranted: number;
  statPointsGranted: number;
  claimedAt: string;
  createdAt?: string;
  claimed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  rank: RankTier;
  xpReward: number;
  goldReward: number;
  statPointsReward?: number;
  category: QuestCategory | string;
  completed: boolean;
  rewardClaimed?: boolean;
  lastRewardCycle?: string;
  lastTransactionId?: string;
  completedAt?: string;
  dueDate?: string;
  targetCount?: number;
  currentCount?: number;
  unit?: string;
  goalId?: string;
  projectId?: string;
  milestoneId?: string;
}

export interface SkillNode {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  xp: number;
  xpToNext: number;
  category: QuestCategory | string;
  description: string;
  buff: string;
  iconName?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  category: 'Progression' | 'Focus' | 'Quests' | 'Mastery';
}

export interface WorkSession {
  id: string;
  durationSeconds: number;
  xpEarned: number;
  completedAt: string;
  mode: 'pomodoro' | 'stopwatch' | 'deep_work';
  tag?: string;
}

export interface PlayerStats {
  name: string;
  title: string;
  avatar?: string;
  rank: RankTier;
  level: number;
  currentXP: number;
  requiredXP: number;
  totalXPEarned: number;
  gold: number;
  statPoints: number;
  streak: number;
  lastActiveDate: string;
  totalFocusSeconds: number;
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    perception: number;
    vitality: number;
  };
  skills: {
    motionDesign: number; // 0 - 100
    editingSpeed: number; // 0 - 100
    portfolio: number;    // 0 - 100
    clientAcquisition: number; // 0 - 100
  };
}

export interface XPHistoryEntry {
  date: string; // YYYY-MM-DD
  xp: number;
  questsCompleted: number;
  level: number;
  focusMinutes?: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'quest_complete' | 'level_up' | 'rank_up' | 'skill_upgrade' | 'penalty' | 'system' | 'work_session';
}

export interface GithubSyncConfig {
  githubToken: string;
  gistId: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface HunterUserData {
  profile: PlayerStats;
  quests: Quest[];
  skills: SkillNode[];
  history: XPHistoryEntry[];
  logs: SystemLog[];
  achievements: Achievement[];
  settings: UserSettings;
  workSessions: WorkSession[];
  goals?: HunterGoal[];
  projects?: HunterProject[];
  milestones?: HunterMilestone[];
  rewardTransactions?: RewardTransaction[];
}
