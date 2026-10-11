// Domain Event Subscribers: Audio & Notification Side-Effects
// Mandate: Do NOT trigger sounds or rewards from React renders.
// Trigger them strictly from real domain events.
// This completely shields against React StrictMode duplicate events and double audio triggers.

import { domainEventBus, DomainEvent } from './events';
import { soundManager } from '../utils/audio';
import { SoundEvent } from '../types';

export interface DomainNotificationPayload {
  type: 'general' | 'level_up' | 'quest_complete' | 'achievement_unlocked' | 'focus_start' | 'focus_complete';
  title: string;
  subtitle: string;
  badge?: string;
  xpReward?: number;
  goldReward?: number;
}

let initialized = false;

export function initializeDomainEventListeners(
  showNotificationCallback?: (notif: DomainNotificationPayload) => void
) {
  if (initialized) return;
  initialized = true;

  // 1. QUEST_CREATED
  domainEventBus.subscribe('QUEST_CREATED', (evt: DomainEvent) => {
    soundManager.playQuestCreated();
    if (showNotificationCallback && evt.source === 'ai') {
      showNotificationCallback({
        type: 'general',
        title: `System Quest Issued: ${evt.payload.quest.title}`,
        subtitle: `Rank: ${evt.payload.quest.rank}-Rank • Reward: +${evt.payload.quest.xpReward} XP`,
        badge: `${evt.payload.quest.rank}-RANK`,
      });
    }
  });

  // 2. QUEST_COMPLETED
  domainEventBus.subscribe('QUEST_COMPLETED', (evt: DomainEvent) => {
    const { quest, alreadyClaimed, rewardGranted } = evt.payload;
    if (rewardGranted) {
      soundManager.playQuestComplete();
      if (showNotificationCallback) {
        showNotificationCallback({
          type: 'quest_complete',
          title: `Quest Cleared: ${quest.title}`,
          subtitle: `Rank: ${quest.rank}-Rank • Category: ${quest.category}`,
          xpReward: quest.xpReward,
          goldReward: quest.goldReward,
          badge: `${quest.rank}-RANK`,
        });
      }
    } else if (alreadyClaimed) {
      soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
      if (showNotificationCallback) {
        showNotificationCallback({
          type: 'general',
          title: `Quest Checked: ${quest.title}`,
          subtitle: `Verified. Reward was already recorded in ledger for this cycle.`,
          badge: `${quest.rank}-RANK`,
        });
      }
    }
  });

  // 3. QUEST_UNCOMPLETED
  domainEventBus.subscribe('QUEST_UNCOMPLETED', () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
  });

  // 4. LEVEL_UP
  domainEventBus.subscribe('LEVEL_UP', (evt: DomainEvent) => {
    soundManager.playLevelUp();
    if (showNotificationCallback) {
      showNotificationCallback({
        type: 'level_up',
        title: `LEVEL ASCENSION: Level ${evt.payload.newLevel}!`,
        subtitle: '+5 Stat Points available for distribution in Status Window.',
        badge: 'LEVEL UP',
      });
    }
  });

  // 5. RANK_UP
  domainEventBus.subscribe('RANK_UP', (evt: DomainEvent) => {
    soundManager.playRankUp();
    if (showNotificationCallback) {
      showNotificationCallback({
        type: 'level_up',
        title: `RANK PROMOTION: ${evt.payload.newRank}-RANK!`,
        subtitle: `Hunter Title: ${evt.payload.title}`,
        badge: `${evt.payload.newRank}-RANK`,
      });
    }
  });

  // 6. ACHIEVEMENT_UNLOCKED
  domainEventBus.subscribe('ACHIEVEMENT_UNLOCKED', (evt: DomainEvent) => {
    soundManager.playSound(SoundEvent.ACHIEVEMENT_UNLOCK);
    if (showNotificationCallback) {
      showNotificationCallback({
        type: 'achievement_unlocked',
        title: `Achievement Unlocked: ${evt.payload.achievement.title}`,
        subtitle: evt.payload.achievement.description,
      });
    }
  });

  // 7. FOCUS_COMPLETED
  domainEventBus.subscribe('FOCUS_COMPLETED', (evt: DomainEvent) => {
    soundManager.playQuestComplete();
    if (showNotificationCallback) {
      showNotificationCallback({
        type: 'general',
        title: 'Focus Work Concluded',
        subtitle: `Logged ${evt.payload.minutes} mins (+${evt.payload.xpEarned} XP, +${evt.payload.goldEarned} G)`,
        xpReward: evt.payload.xpEarned,
        goldReward: evt.payload.goldEarned,
      });
    }
  });

  // 8. PENALTY_STARTED
  domainEventBus.subscribe('PENALTY_STARTED', (evt: DomainEvent) => {
    soundManager.playPenaltyWarning();
    if (showNotificationCallback) {
      showNotificationCallback({
        type: 'general',
        title: 'PENALTY PROTOCOL ACTIVATED',
        subtitle: evt.payload.quest.title,
        badge: 'PENALTY',
      });
    }
  });

  // 9. AI_ACTION_REJECTED
  domainEventBus.subscribe('AI_ACTION_REJECTED', (evt: DomainEvent) => {
    soundManager.playSound(SoundEvent.ERROR);
    if (showNotificationCallback) {
      showNotificationCallback({
        type: 'general',
        title: 'System Directive Intercepted',
        subtitle: evt.payload.reason || 'Unauthorized state modification prevented.',
        badge: 'SECURITY',
      });
    }
  });

  // 10. AI_ACTION_EXECUTED
  domainEventBus.subscribe('AI_ACTION_EXECUTED', () => {
    soundManager.playSound(SoundEvent.SYSTEM_AI_PING);
  });

  // 11. SKILL_POINTS_DISTRIBUTED
  domainEventBus.subscribe('SKILL_POINTS_DISTRIBUTED', () => {
    soundManager.playSound(SoundEvent.BUTTON_CONFIRM);
  });
}
