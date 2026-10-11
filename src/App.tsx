/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/pages/HomePage';
import { QuestsPage } from './components/pages/QuestsPage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { CharacterPage } from './components/pages/CharacterPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { SystemAIPage } from './components/pages/SystemAIPage';
import { FocusMode } from './components/FocusMode';
import { LevelUpModal } from './components/LevelUpModal';
import { StatsModal } from './components/StatsModal';
import { QuestModal } from './components/QuestModal';
import { SyncModal } from './components/SyncModal';
import { LogsModal } from './components/LogsModal';
import { AuthModal } from './components/AuthModal';
import { PublicProfileModal } from './components/PublicProfileModal';
import { HunterAwakeningModal } from './components/HunterAwakening/HunterAwakeningModal';
import { FloatingXP, FloatingReward } from './components/FloatingXP';
import { SystemNotificationBanner, SystemNotification } from './components/SystemNotificationBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  PlayerStats,
  Quest,
  SkillNode,
  XPHistoryEntry,
  SystemLog,
  NavigationTab,
  Achievement,
  UserSettings,
  SystemAction,
  HunterGoal,
  HunterProject,
  HunterMilestone,
  RewardTransaction,
} from './types';
import {
  stateAuthority,
  domainEventBus,
  initializeDomainEventListeners,
} from './domain';
import { getCurrentUserId } from './utils/auth';
import { soundManager } from './utils/audio';
import { SoundEvent } from './types';
import { useI18n } from './i18n';

export const STORAGE_KEY_SETTINGS = 'solo_system_user_settings';

export default function App() {
  const { t } = useI18n();
  // Navigation Tab State
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [currentUserId, setCurrentUserIdState] = useState<string>(() => stateAuthority.getCurrentUserId());

  // User Settings State (authoritative)
  const [settings, setSettings] = useState<UserSettings>(() => stateAuthority.getState().settings);

  // Anti-Duplication Reward Transactions Ledger
  const [rewardTransactions, setRewardTransactions] = useState<RewardTransaction[]>(() =>
    stateAuthority.getState().rewardTransactions
  );

  // Core RPG & Productivity States (single source of truth: StateAuthority)
  const [player, setPlayer] = useState<PlayerStats>(() => stateAuthority.getState().player);
  const [quests, setQuests] = useState<Quest[]>(() => stateAuthority.getState().quests);
  const [skills, setSkills] = useState<SkillNode[]>(() => stateAuthority.getState().skills);
  const [achievements, setAchievements] = useState<Achievement[]>(() => stateAuthority.getState().achievements);
  const [history, setHistory] = useState<XPHistoryEntry[]>(() => stateAuthority.getState().history);
  const [logs, setLogs] = useState<SystemLog[]>(() => stateAuthority.getState().logs);
  const [goals, setGoals] = useState<HunterGoal[]>(() => stateAuthority.getState().goals);
  const [projects, setProjects] = useState<HunterProject[]>(() => stateAuthority.getState().projects);
  const [milestones, setMilestones] = useState<HunterMilestone[]>(() => stateAuthority.getState().milestones);
  const [questModalPreset, setQuestModalPreset] = useState<{ projectId?: string; goalId?: string } | undefined>(undefined);

  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());

  // System Notification Banner State
  const [systemNotification, setSystemNotification] = useState<SystemNotification | null>(null);

  // Focus Mode Overlay
  const [isFocusModeOpen, setIsFocusModeOpen] = useState<boolean>(false);

  // Modal States
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPublicProfileOpen, setIsPublicProfileOpen] = useState(false);

  // Hunter Awakening / First-Launch Discovery State
  const [isAwakeningOpen, setIsAwakeningOpen] = useState<boolean>(() => {
    try {
      const completed = localStorage.getItem('solo_hunter_awakening_completed');
      return completed !== 'true';
    } catch {
      return false;
    }
  });
  const [isAwakeningReplay, setIsAwakeningReplay] = useState<boolean>(false);

  // Floating Rewards
  const [floatingRewards, setFloatingRewards] = useState<FloatingReward[]>([]);

  // Apply theme, accent, and dir to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    document.documentElement.setAttribute('data-accent', settings.accentColor || 'purple');
    document.documentElement.setAttribute('dir', settings.direction || 'ltr');
    document.documentElement.setAttribute('lang', settings.language || 'en');
  }, [settings]);

  const showSystemNotification = (notif: Omit<SystemNotification, 'id'>) => {
    const id = `sys-notif-${Date.now()}`;
    setSystemNotification({ ...notif, id });
    setTimeout(() => {
      setSystemNotification((curr) => (curr?.id === id ? null : curr));
    }, 4000);
  };

  // Handle Atomic User Switching through StateAuthority
  const handleSwitchUser = (newUserId: string) => {
    setCurrentUserIdState(newUserId);
    const newState = stateAuthority.switchUser(newUserId);
    showSystemNotification({
      type: 'general',
      title: `Hunter Profile Loaded: ${newState.player.name}`,
      subtitle: `Rank: ${newState.player.rank}-Rank Awakened • Level ${newState.player.level}`,
    });
  };

  // Handle Mute Toggle
  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    stateAuthority.updateSettings({ soundEnabled: !muted }, 'user');
  };

  // Add Log Entry through StateAuthority
  const addSystemLog = (message: string, type: SystemLog['type']) => {
    stateAuthority.addSystemLog(message, type);
  };

  // Connect State Authority & Domain Event Bus
  useEffect(() => {
    initializeDomainEventListeners(showSystemNotification);

    // Subscribe to State Authority updates
    const unsubscribeState = stateAuthority.subscribe((newState) => {
      setPlayer(newState.player);
      setQuests(newState.quests);
      setSkills(newState.skills);
      setAchievements(newState.achievements);
      setHistory(newState.history);
      setLogs(newState.logs);
      setGoals(newState.goals);
      setProjects(newState.projects);
      setMilestones(newState.milestones);
      setRewardTransactions(newState.rewardTransactions);
      setSettings(newState.settings);
    });

    // Subscribe to Domain Events for UI feedback & modals
    const unsubscribeEvents = domainEventBus.subscribe('*', (evt) => {
      if (evt.type === 'LEVEL_UP' || evt.type === 'RANK_UP') {
        setIsLevelUpOpen(true);
      }
      if (evt.type === 'REWARD_GRANTED' && evt.payload) {
        const xp = evt.payload.xp || 0;
        const gold = evt.payload.gold || 0;
        const statPoints = evt.payload.statPoints || 0;
        if (xp > 0 || gold > 0) {
          const newFloating: FloatingReward = {
            id: `float-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            xp,
            gold,
            statPoints,
            x: window.innerWidth * 0.5,
            y: window.innerHeight * 0.45,
          };
          setFloatingRewards((prev) => [...prev, newFloating]);
          setTimeout(() => {
            setFloatingRewards((prev) => prev.filter((r) => r.id !== newFloating.id));
          }, 1500);
        }
      }
    });

    // Synchronize recurring quest cycles on mount & interval
    stateAuthority.synchronizeRecurringCycles();

    const handleCycleSync = () => {
      stateAuthority.synchronizeRecurringCycles();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleCycleSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(handleCycleSync, 60000);

    return () => {
      unsubscribeState();
      unsubscribeEvents();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  // Handle Focus Work Session Complete via State Authority
  const handleSessionComplete = (
    durationSeconds: number,
    _xpEarned: number,
    mode: string,
    tag: string
  ) => {
    stateAuthority.recordFocusSession(durationSeconds, mode, tag, 'timer');
  };

  const handleTimerStarted = (tag: string) => {
    domainEventBus.emit('FOCUS_STARTED', { tag }, 'timer');
    showSystemNotification({
      type: 'focus_start',
      title: 'Focus Chamber Online',
      subtitle: `Focus Engine locked onto: [${tag}]. Distractions silenced.`,
    });
  };

  // Toggle Quest Completion with Strict Anti-Duplication Reward Transaction Architecture
  const handleToggleQuest = (questId: string) => {
    const targetQuest = quests.find((q) => q.id === questId);
    if (!targetQuest) return;

    if (targetQuest.completed) {
      stateAuthority.uncompleteQuest(questId, 'user');
    } else {
      stateAuthority.atomicCompleteQuest(questId, 'user');
    }
  };

  // Delete Quest
  const handleDeleteQuest = (questId: string) => {
    stateAuthority.deleteQuest(questId, 'user');
  };

  // Add New Custom Quest
  const handleAddQuest = (newQuestData: Omit<Quest, 'id' | 'completed'>) => {
    stateAuthority.createQuest(newQuestData, 'user');
  };

  // Safe and Comprehensive Factory Reset
  const handleFactoryReset = () => {
    stateAuthority.factoryReset();
    showSystemNotification({
      type: 'general',
      title: 'FACTORY RESET EXECUTED',
      subtitle: 'System wiped and initialized to pristine status.',
    });
  };

  // Upgrade Skill with Stat Point
  const handleUpgradeSkill = (skillId: string) => {
    stateAuthority.upgradeSkill(skillId, 'user');
  };

  // Delete Skill with Stat Points refund
  const handleDeleteSkill = (skillId: string) => {
    const res = stateAuthority.deleteSkill(skillId, 'user');
    if (res.success) {
      setSystemNotification({
        isOpen: true,
        type: 'general',
        title: t('skillDeleted'),
        subtitle: `${res.deletedSkill?.name || 'Skill'}${res.refundedStatPoints > 0 ? ` (+${res.refundedStatPoints} SP refunded)` : ''}`,
      });
    }
  };

  // Awaken / Add Skill
  const handleAddSkill = (skillData: Partial<SkillNode>) => {
    stateAuthority.unlockSkill(skillData, 'user');
  };

  // Allocate Stat Points in Status Window
  const handleAllocateStat = (statKey: keyof PlayerStats['stats']) => {
    stateAuthority.distributeStatPoint(statKey, 'user');
  };

  // Update Profile Name & Title
  const handleUpdateProfile = (name: string, title: string) => {
    stateAuthority.updatePlayerProfile({ name, title }, 'user');
  };

  // Autonomous System AI Action Handlers
  const handleExecuteAction = (action: SystemAction) => {
    stateAuthority.dispatch(action as any, 'ai');
  };

  const handleExecuteActions = (actions: SystemAction[]) => {
    actions.forEach((act) => stateAuthority.dispatch(act as any, 'ai'));
  };

  // Strategic Objectives & Hierarchy Handlers
  const handleSaveGoal = (goal: Partial<HunterGoal>) => {
    if (goal.id) {
      stateAuthority.dispatch({ type: 'UPDATE_GOAL', payload: { goalId: goal.id, updates: goal } }, 'user');
    } else {
      stateAuthority.dispatch({ type: 'CREATE_GOAL', payload: goal }, 'user');
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    stateAuthority.dispatch({ type: 'DELETE_GOAL', payload: { goalId } }, 'user');
  };

  const handleSaveProject = (project: Partial<HunterProject>) => {
    if (project.id) {
      stateAuthority.dispatch({ type: 'UPDATE_PROJECT', payload: { projectId: project.id, updates: project } }, 'user');
    } else {
      stateAuthority.dispatch({ type: 'CREATE_PROJECT', payload: project }, 'user');
    }
  };

  const handleDeleteProject = (projectId: string) => {
    stateAuthority.dispatch({ type: 'DELETE_PROJECT', payload: { projectId } }, 'user');
  };

  const handleSaveMilestone = (milestone: Partial<HunterMilestone>) => {
    if (milestone.id) {
      stateAuthority.dispatch({ type: 'UPDATE_MILESTONE', payload: { milestoneId: milestone.id, updates: milestone } }, 'user');
    } else {
      stateAuthority.dispatch({ type: 'CREATE_MILESTONE', payload: milestone }, 'user');
    }
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    stateAuthority.dispatch({ type: 'DELETE_MILESTONE', payload: { milestoneId } }, 'user');
  };

  const handleCompleteMilestone = (milestoneId: string) => {
    stateAuthority.dispatch({ type: 'COMPLETE_MILESTONE', payload: { milestoneId } }, 'user');
  };

  // Handler for Hunter Awakening Completion / Profile Synthesis
  const handleCompleteAwakening = (data: {
    name: string;
    avatar: string;
    title: string;
    stats?: PlayerStats['stats'];
    skills?: SkillNode[];
    quests?: Quest[];
  }) => {
    try {
      localStorage.setItem('solo_hunter_awakening_completed', 'true');
    } catch (e) {
      console.error('Failed to save awakening completion status:', e);
    }

    setIsAwakeningOpen(false);
    setIsAwakeningReplay(false);

    stateAuthority.completeAwakening(
      {
        name: data.name,
        avatar: data.avatar,
        title: data.title,
        quests: data.quests,
        skills: data.skills,
      },
      'user'
    );

    showSystemNotification({
      type: 'general',
      title: 'HUNTER AWAKENING COMPLETE',
      subtitle: `Welcome to the Solo System, ${data.name}. Your journey begins now.`,
      badge: 'AWAKENED',
    });
  };

  // Reload all data after GitHub or JSON Import
  const handleDataReloaded = () => {
    stateAuthority.reloadFromStorage();
  };

  const activeQuestsCount = quests.filter((q) => !q.completed).length;

  // Calculate today's focus minutes from history
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntry = history.find((h) => h.date === todayStr);
  const todayFocusMinutes = todayEntry?.focusMinutes ?? 0;

  return (
    <div
      id="solo-system-root"
      data-theme={settings.theme || 'dark'}
      className={`min-h-screen flex relative transition-colors duration-200 ${
        settings.theme === 'light'
          ? 'bg-[#fbfbfa] text-zinc-900 selection:bg-purple-600 selection:text-white'
          : settings.theme === 'midnight'
          ? 'bg-[#050508] text-slate-100 selection:bg-purple-600 selection:text-white'
          : settings.theme === 'cyber'
          ? 'bg-[#0a0f1d] text-slate-100 selection:bg-cyan-600 selection:text-white'
          : 'bg-[#0d0b14] text-slate-100 selection:bg-purple-600 selection:text-white'
      }`}
    >
      {/* Floating XP Canvas layer */}
      <FloatingXP rewards={floatingRewards} />

      {/* System Notification Banner (HUD Top) */}
      <SystemNotificationBanner
        notification={systemNotification}
        onDismiss={() => setSystemNotification(null)}
      />

      {/* Subtle Grid Background Texture */}
      <div
        className={`fixed inset-0 pointer-events-none -z-10 transition-opacity duration-300 ${
          settings.theme === 'light' ? 'opacity-25' : 'opacity-20'
        }`}
        style={{
          backgroundImage:
            settings.theme === 'light'
              ? `linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(0, 0, 0, 0.04) 1px, transparent 1px)`
              : `linear-gradient(to right, rgba(168, 85, 247, 0.08) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(168, 85, 247, 0.08) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Persistent Navigation (Desktop Sidebar & Mobile Bottom Bar) */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        player={player}
        unreadLogsCount={logs.length > 0 ? 1 : 0}
        activeQuestsCount={activeQuestsCount}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenSyncModal={() => setIsSyncOpen(true)}
        onOpenLogsModal={() => setIsLogsOpen(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'home' && (
            <HomePage
              player={player}
              quests={quests}
              todayFocusMinutes={todayFocusMinutes}
              onToggleQuest={handleToggleQuest}
              onOpenNewQuestModal={() => setIsQuestModalOpen(true)}
              onOpenStatsModal={() => setIsStatsOpen(true)}
              onNavigateTab={setCurrentTab}
              onSessionComplete={handleSessionComplete}
              onEnterFocusMode={() => setIsFocusModeOpen(true)}
              onTimerStarted={handleTimerStarted}
            />
          )}

          {currentTab === 'quests' && (
            <QuestsPage
              quests={quests}
              goals={goals}
              projects={projects}
              milestones={milestones}
              onToggleQuest={handleToggleQuest}
              onDeleteQuest={handleDeleteQuest}
              onOpenNewQuestModal={(preset) => {
                setQuestModalPreset(preset);
                setIsQuestModalOpen(true);
              }}
              onSaveGoal={handleSaveGoal}
              onDeleteGoal={handleDeleteGoal}
              onSaveProject={handleSaveProject}
              onDeleteProject={handleDeleteProject}
              onSaveMilestone={handleSaveMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onCompleteMilestone={handleCompleteMilestone}
            />
          )}

          {currentTab === 'system-ai' && (
            <SystemAIPage
              player={player}
              quests={quests}
              skills={skills}
              achievements={achievements}
              history={history}
              logs={logs}
              goals={goals}
              projects={projects}
              onExecuteActions={handleExecuteActions}
              onExecuteSingleAction={handleExecuteAction}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsPage
              player={player}
              history={history}
              quests={quests}
              logs={logs}
              todayFocusMinutes={todayFocusMinutes}
            />
          )}

          {currentTab === 'character' && (
            <CharacterPage
              player={player}
              skills={skills}
              achievements={achievements}
              onUpgradeSkill={handleUpgradeSkill}
              onDeleteSkill={handleDeleteSkill}
              onAddSkill={handleAddSkill}
              onAllocateStat={handleAllocateStat}
              onOpenStatsModal={() => setIsStatsOpen(true)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              player={player}
              settings={settings}
              achievements={achievements}
              skills={skills}
              onUpdatePlayer={(updates) => stateAuthority.updatePlayerProfile(updates, 'user')}
              onUpdateSettings={(updates) => stateAuthority.updateSettings(updates, 'user')}
              onOpenAuthModal={() => setIsAuthOpen(true)}
              onOpenPublicProfileModal={() => setIsPublicProfileOpen(true)}
              onOpenSyncModal={() => setIsSyncOpen(true)}
              onReplayAwakening={() => {
                setIsAwakeningReplay(true);
                setIsAwakeningOpen(true);
              }}
              onFactoryReset={handleFactoryReset}
            />
          )}
        </main>
      </div>

      {/* Hunter Awakening First-Launch & Replay Experience */}
      <HunterAwakeningModal
        isOpen={isAwakeningOpen}
        isReplay={isAwakeningReplay}
        onComplete={handleCompleteAwakening}
        onClose={() => {
          setIsAwakeningOpen(false);
          setIsAwakeningReplay(false);
        }}
      />

      {/* Fullscreen Immersion Focus Mode */}
      <FocusMode
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
        onSessionComplete={handleSessionComplete}
        hunterName={player.name}
      />

      {/* Level Up Ascension Modal */}
      <LevelUpModal
        isOpen={isLevelUpOpen}
        onClose={() => setIsLevelUpOpen(false)}
        player={player}
        onOpenStatsModal={() => setIsStatsOpen(true)}
      />

      {/* Status Window Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        player={player}
        onAllocateStat={handleAllocateStat}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Quest Commission Modal */}
      <QuestModal
        isOpen={isQuestModalOpen}
        onClose={() => {
          setIsQuestModalOpen(false);
          setQuestModalPreset(undefined);
        }}
        onAddQuest={handleAddQuest}
        goals={goals}
        projects={projects}
        initialPreset={questModalPreset}
      />

      {/* Cloud & Local Sync Modal */}
      <SyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        onDataReloaded={handleDataReloaded}
      />

      {/* System Logs Modal */}
      <LogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
        onClearLogs={() => stateAuthority.clearLogs('user')}
      />

      {/* Local Hunter Profile / Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUserId={currentUserId}
        onSwitchUser={handleSwitchUser}
      />

      {/* Public Profile Modal */}
      <PublicProfileModal
        isOpen={isPublicProfileOpen}
        onClose={() => setIsPublicProfileOpen(false)}
        player={player}
        achievements={achievements}
        skills={skills}
        settings={settings}
        onUpdateSettings={(updates) => stateAuthority.updateSettings(updates, 'user')}
      />

      {/* Offline PWA Network Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}