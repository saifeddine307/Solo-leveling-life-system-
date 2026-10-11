// Domain Actions & Strict Action Validation Pipeline
// The AI must NEVER directly mutate arbitrary player state (XP, Gold, Level, Rank, Achievements).
// Every state modification must flow through this controlled pipeline:
// AI intent -> Action parser -> Action validator -> State Authority -> Transaction validation -> Persistence -> Event emission -> UI feedback

import { Quest, HunterGoal, RankTier, QuestType, QuestCategory } from '../types';

export type DomainActionType =
  | 'CREATE_QUEST'
  | 'UPDATE_QUEST'
  | 'DELETE_QUEST'
  | 'COMPLETE_QUEST'
  | 'UNCOMPLETE_QUEST'
  | 'CREATE_GOAL'
  | 'UPDATE_GOAL'
  | 'DELETE_GOAL'
  | 'CREATE_PROJECT'
  | 'UPDATE_PROJECT'
  | 'DELETE_PROJECT'
  | 'CREATE_MILESTONE'
  | 'UPDATE_MILESTONE'
  | 'COMPLETE_MILESTONE'
  | 'DELETE_MILESTONE'
  | 'START_FOCUS_SESSION'
  | 'END_FOCUS_SESSION'
  | 'DISTRIBUTE_SKILL_POINTS'
  | 'CREATE_REWARD'
  | 'REDEEM_REWARD'
  | 'CREATE_PENALTY'
  | 'COMPLETE_PENALTY'
  | 'UPDATE_PLAYER_STATE'
  // Legacy aliases supported for AI prompt compatibility
  | 'ADD_QUEST'
  | 'BATCH_ADD_QUESTS'
  | 'ADD_SKILL'
  | 'UNLOCK_SKILL'
  | 'UPGRADE_SKILL'
  | 'DELETE_SKILL'
  | 'REMOVE_SKILL'
  | 'APPLY_PENALTY'
  | 'ADD_XP'
  | 'GRANT_REWARDS'
  | 'UPDATE_PLAYER_STATS';

export interface DomainAction<TPayload = any> {
  id?: string;
  type: DomainActionType;
  payload: TPayload;
  timestamp?: string;
}

export interface ActionValidationResult {
  isValid: boolean;
  normalizedAction?: DomainAction;
  rejectionReason?: string;
  isArbitraryProgressionAttempt?: boolean;
}

/**
 * Validates any incoming domain action before State Authority execution.
 * Enforces strict domain rules:
 * - AI cannot directly increment or set XP, Gold, Level, Rank, Achievements, Streaks
 * - Direct calls to ADD_XP or GRANT_REWARDS from AI without verified source events are REJECTED
 * - Completed quests must reference real, existing quests
 * - Quest rewards are sanitized to rational, balanced bounds
 */
export function validateDomainAction(
  action: DomainAction,
  source: 'user' | 'ai' | 'system' | 'timer',
  currentContext: {
    quests: Quest[];
    goals?: HunterGoal[];
    statPoints: number;
  }
): ActionValidationResult {
  if (!action || !action.type) {
    return {
      isValid: false,
      rejectionReason: 'Invalid action structure: action type missing.',
    };
  }

  const payload = action.payload || {};

  // Rule 1: STRICT ARBITRARY PROGRESSION REJECTION FOR AI
  // If the action originates from AI and attempts direct progression tampering:
  if (source === 'ai') {
    if (action.type === 'ADD_XP' || action.type === 'GRANT_REWARDS') {
      return {
        isValid: false,
        isArbitraryProgressionAttempt: true,
        rejectionReason:
          'Direct progression mutation rejected: Progression must come from real completed actions (quest completion, verified focus session, or milestone).',
      };
    }

    if (action.type === 'UPDATE_PLAYER_STATE' || action.type === 'UPDATE_PLAYER_STATS') {
      // Check if payload attempts to directly modify XP, Gold, Level, Rank, or StatPoints
      const forbiddenFields = ['currentXP', 'totalXPEarned', 'xp', 'gold', 'level', 'rank', 'statPoints', 'streak'];
      const attemptedForbidden = forbiddenFields.filter((field) => field in payload);
      if (attemptedForbidden.length > 0) {
        return {
          isValid: false,
          isArbitraryProgressionAttempt: true,
          rejectionReason: `Direct alteration of [${attemptedForbidden.join(', ')}] rejected. All progression attributes are mathematically derived from verified events.`,
        };
      }
    }
  }

  // Rule 2: COMPLETE_QUEST Validation
  if (action.type === 'COMPLETE_QUEST') {
    const questId = payload.questId || payload.id;
    const titleMatch = (payload.title || '').trim().toLowerCase();

    const targetQuest = currentContext.quests.find((q) => {
      if (questId && q.id === questId) return true;
      if (titleMatch && q.title.toLowerCase() === titleMatch) return true;
      if (titleMatch && q.title.toLowerCase().includes(titleMatch)) return true;
      return false;
    });

    if (!targetQuest) {
      return {
        isValid: false,
        rejectionReason: `Target quest [${questId || payload.title || 'unspecified'}] does not exist in the active quest matrix.`,
      };
    }

    return {
      isValid: true,
      normalizedAction: {
        type: 'COMPLETE_QUEST',
        payload: {
          questId: targetQuest.id,
          title: targetQuest.title,
        },
      },
    };
  }

  // Rule 3: UNCOMPLETE_QUEST Validation
  if (action.type === 'UNCOMPLETE_QUEST') {
    const questId = payload.questId || payload.id;
    const targetQuest = currentContext.quests.find((q) => q.id === questId);
    if (!targetQuest) {
      return {
        isValid: false,
        rejectionReason: `Target quest [${questId}] not found.`,
      };
    }
    return {
      isValid: true,
      normalizedAction: {
        type: 'UNCOMPLETE_QUEST',
        payload: { questId: targetQuest.id },
      },
    };
  }

  // Rule 4: CREATE_QUEST / ADD_QUEST Normalization & Bounds Sanitization
  if (action.type === 'CREATE_QUEST' || action.type === 'ADD_QUEST') {
    const title = (payload.title || '').trim();
    if (!title) {
      return {
        isValid: false,
        rejectionReason: 'Quest title is required.',
      };
    }

    // Sanitize rewards: ensure positive, cap excessive values from hallucinations
    const rawXP = Number(payload.xpReward) || Number(payload.xp) || 50;
    const rawGold = Number(payload.goldReward) || Number(payload.gold) || 40;
    const rawSP = Number(payload.statPointsReward) || Number(payload.statPoints) || 0;

    const sanitizedXP = Math.max(10, Math.min(500, Math.round(rawXP)));
    const sanitizedGold = Math.max(5, Math.min(500, Math.round(rawGold)));
    const sanitizedSP = Math.max(0, Math.min(2, Math.round(rawSP)));

    const validTypes: QuestType[] = ['daily', 'weekly', 'monthly', 'penalty', 'boss'];
    const type: QuestType = validTypes.includes(payload.type) ? payload.type : 'daily';

    const validRanks: RankTier[] = ['E', 'D', 'C', 'B', 'A', 'S', 'National', 'Monarch'];
    const rank: RankTier = validRanks.includes(payload.rank) ? payload.rank : 'E';

    return {
      isValid: true,
      normalizedAction: {
        type: 'CREATE_QUEST',
        payload: {
          id: payload.id || `quest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title,
          description: (payload.description || '').trim(),
          type,
          rank,
          category: payload.category || 'General',
          xpReward: sanitizedXP,
          goldReward: sanitizedGold,
          statPointsReward: sanitizedSP,
          dueDate: payload.dueDate,
          targetCount: payload.targetCount ? Number(payload.targetCount) : undefined,
          unit: payload.unit,
          goalId: payload.goalId,
          projectId: payload.projectId,
          milestoneId: payload.milestoneId,
        },
      },
    };
  }

  // Rule 5: BATCH_ADD_QUESTS Normalization
  if (action.type === 'BATCH_ADD_QUESTS') {
    const rawQuests = Array.isArray(payload.quests) ? payload.quests : [];
    if (rawQuests.length === 0) {
      return {
        isValid: false,
        rejectionReason: 'No quests supplied in batch payload.',
      };
    }

    const validatedQuests: any[] = [];
    for (const q of rawQuests) {
      const v = validateDomainAction(
        { type: 'CREATE_QUEST', payload: q },
        source,
        currentContext
      );
      if (v.isValid && v.normalizedAction) {
        validatedQuests.push(v.normalizedAction.payload);
      }
    }

    if (validatedQuests.length === 0) {
      return {
        isValid: false,
        rejectionReason: 'All quests in batch failed validation.',
      };
    }

    return {
      isValid: true,
      normalizedAction: {
        type: 'BATCH_ADD_QUESTS',
        payload: { quests: validatedQuests },
      },
    };
  }

  // Rule 6: DELETE_QUEST Validation
  if (action.type === 'DELETE_QUEST') {
    const questId = payload.questId || payload.id;
    if (!questId && !payload.title) {
      return {
        isValid: false,
        rejectionReason: 'Quest ID or title is required for deletion.',
      };
    }
    return {
      isValid: true,
      normalizedAction: action,
    };
  }

  // Rule 6.5: DELETE_SKILL Validation
  if (action.type === 'DELETE_SKILL' || action.type === 'REMOVE_SKILL') {
    const skillId = payload.skillId || payload.id;
    const skillName = payload.skillName || payload.name;
    if (!skillId && !skillName) {
      return {
        isValid: false,
        rejectionReason: 'Skill ID or name is required for deletion.',
      };
    }
    return {
      isValid: true,
      normalizedAction: {
        type: 'DELETE_SKILL',
        payload: { skillId, skillName: skillName || payload.title },
      },
    };
  }

  // Rule 7: DISTRIBUTE_SKILL_POINTS Validation
  if (action.type === 'DISTRIBUTE_SKILL_POINTS') {
    if (currentContext.statPoints <= 0) {
      return {
        isValid: false,
        rejectionReason: 'Insufficient stat points available.',
      };
    }
    const statKey = payload.statKey || payload.key;
    const validStats = ['strength', 'agility', 'intelligence', 'perception', 'vitality'];
    if (!validStats.includes(statKey)) {
      return {
        isValid: false,
        rejectionReason: `Invalid attribute [${statKey}]. Must be one of: ${validStats.join(', ')}.`,
      };
    }
    return {
      isValid: true,
      normalizedAction: {
        type: 'DISTRIBUTE_SKILL_POINTS',
        payload: { statKey },
      },
    };
  }

  // Rule 8: END_FOCUS_SESSION Validation
  if (action.type === 'END_FOCUS_SESSION') {
    const durationSeconds = Number(payload.durationSeconds) || 0;
    if (durationSeconds <= 0) {
      return {
        isValid: false,
        rejectionReason: 'Focus session duration must be greater than zero.',
      };
    }
    return {
      isValid: true,
      normalizedAction: action,
    };
  }

  // Rule 9: CREATE_PENALTY / APPLY_PENALTY Validation
  if (action.type === 'CREATE_PENALTY' || action.type === 'APPLY_PENALTY') {
    const penaltyTitle = (payload.title || 'Corrective Discipline Directive').trim();
    return {
      isValid: true,
      normalizedAction: {
        type: 'CREATE_PENALTY',
        payload: {
          title: penaltyTitle.startsWith('[PENALTY]') ? penaltyTitle : `[PENALTY] ${penaltyTitle}`,
          description: payload.description || 'Mandatory corrective focus session.',
          xpReward: Math.max(10, Math.min(60, Number(payload.xpReward) || 30)),
          goldReward: Math.max(5, Math.min(40, Number(payload.goldReward) || 20)),
          durationMinutes: Number(payload.durationMinutes) || 20,
        },
      },
    };
  }

  // Default: pass through action if structurally intact
  return {
    isValid: true,
    normalizedAction: action,
  };
}
