import { UserAccount, UserSettings, HunterUserData, RankTier } from '../types';
import {
  loadStoredData,
  saveStoredData,
  INITIAL_PLAYER_STATS,
  INITIAL_QUESTS,
  INITIAL_SKILL_NODES,
  INITIAL_ACHIEVEMENTS,
  INITIAL_SYSTEM_LOGS,
  INITIAL_GOALS,
  generateInitialHistory,
} from './storage';

export const STORAGE_KEY_CURRENT_USER = 'solo_system_current_user_id';
export const STORAGE_KEY_USERS_LIST = 'solo_system_users_list';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'en',
  direction: 'ltr',
  soundEnabled: true,
  soundVolume: 0.7,
  theme: 'dark',
  accentColor: 'purple',
  notificationsEnabled: true,
  timeFormat: '12h',
  publicProfileEnabled: true,
};

export const DEMO_USERS: UserAccount[] = [
  {
    id: 'guest',
    email: 'sung.jinwoo@solo.hunter',
    username: 'Sung Jin-Woo',
    displayName: 'Sung Jin-Woo',
    avatar: 'monarch',
    createdAt: '2026-08-01T00:00:00.000Z',
    isGuest: false,
  },
  {
    id: 'hunter_cha',
    email: 'cha.haein@solo.hunter',
    username: 'Cha Hae-In',
    displayName: 'Cha Hae-In',
    avatar: 'blade',
    createdAt: '2026-08-05T00:00:00.000Z',
    isGuest: false,
  },
  {
    id: 'hunter_igris',
    email: 'igris.commander@solo.hunter',
    username: 'Commander Igris',
    displayName: 'Commander Igris',
    avatar: 'igris',
    createdAt: '2026-08-10T00:00:00.000Z',
    isGuest: false,
  },
];

export function getRegisteredUsers(): UserAccount[] {
  const users = loadStoredData<UserAccount[]>(STORAGE_KEY_USERS_LIST, DEMO_USERS);
  // Ensure default demo users exist
  const existingIds = new Set(users.map((u) => u.id));
  DEMO_USERS.forEach((demo) => {
    if (!existingIds.has(demo.id)) {
      users.push(demo);
    }
  });
  return users;
}

export function getCurrentUserId(): string {
  return loadStoredData<string>(STORAGE_KEY_CURRENT_USER, 'guest');
}

export function getCurrentUserAccount(): UserAccount {
  const currentId = getCurrentUserId();
  const users = getRegisteredUsers();
  const found = users.find((u) => u.id === currentId);
  if (found) return found;
  return DEMO_USERS[0];
}

export function setCurrentUserId(userId: string): void {
  saveStoredData(STORAGE_KEY_CURRENT_USER, userId);
}

export function registerNewUser(username: string, email: string): UserAccount {
  const users = getRegisteredUsers();
  const newId = `hunter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser: UserAccount = {
    id: newId,
    email: email.trim().toLowerCase(),
    username: username.trim(),
    displayName: username.trim(),
    avatar: 'monarch',
    createdAt: new Date().toISOString(),
    isGuest: false,
  };

  users.push(newUser);
  saveStoredData(STORAGE_KEY_USERS_LIST, users);

  // Initialize their isolated starter data (clean initial slate)
  const initialUserData: HunterUserData = {
    profile: {
      ...INITIAL_PLAYER_STATS,
      name: username.trim(),
      title: 'E-Rank Novice Awakened',
      rank: 'E' as RankTier,
      level: 1,
      currentXP: 0,
      requiredXP: 100,
      totalXPEarned: 0,
      gold: 0,
      statPoints: 0,
      streak: 0,
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
    },
    quests: [],
    skills: [],
    history: [],
    logs: [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: `Welcome, Awakened Hunter ${username.trim()}. The System has initialized a clean slate.`,
        type: 'system',
      },
    ],
    achievements: INITIAL_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: false,
      unlockedAt: undefined,
    })),
    settings: {
      ...DEFAULT_USER_SETTINGS,
    },
    workSessions: [],
    goals: [],
    projects: [],
    milestones: [],
    rewardTransactions: [],
  };

  saveUserData(newId, initialUserData);
  setCurrentUserId(newId);
  return newUser;
}

export function saveUserData(userId: string, data: HunterUserData): void {
  saveStoredData(`solo_user_${userId}_data`, data);
}

export function loadUserData(userId: string): HunterUserData {
  // Check if partitioned user data exists
  const stored = loadStoredData<HunterUserData | null>(`solo_user_${userId}_data`, null);
  if (stored) {
    return {
      ...stored,
      settings: { ...DEFAULT_USER_SETTINGS, ...(stored.settings || {}) },
      goals: stored.goals || [],
      projects: stored.projects || [],
      milestones: stored.milestones || [],
      rewardTransactions: stored.rewardTransactions || [],
    };
  }

  // Default guest/user data
  const defaultData: HunterUserData = {
    profile: {
      ...INITIAL_PLAYER_STATS,
      name: userId === 'hunter_cha' ? 'Cha Hae-In' : userId === 'hunter_igris' ? 'Commander Igris' : 'Sung Jin-Woo',
    },
    quests: [],
    skills: [],
    history: [],
    logs: [
      {
        id: `log-init-${userId}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: `[SYSTEM] Awakening sequence initialized for Hunter. State is pristine.`,
        type: 'system',
      },
    ],
    achievements: INITIAL_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false, unlockedAt: undefined })),
    settings: DEFAULT_USER_SETTINGS,
    workSessions: [],
    goals: [],
    projects: [],
    milestones: [],
    rewardTransactions: [],
  };

  saveUserData(userId, defaultData);
  return defaultData;
}
