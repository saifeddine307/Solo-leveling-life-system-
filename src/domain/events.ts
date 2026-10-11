// Central Domain Event System for Solo Leveling Life System
// Real Domain Events drive UI feedback, audio, notifications, analytics, and history.
// No sounds or progression mutations should ever be triggered from React render passes.

export type DomainEventType =
  | 'QUEST_CREATED'
  | 'QUEST_UPDATED'
  | 'QUEST_DELETED'
  | 'QUEST_COMPLETED'
  | 'QUEST_UNCOMPLETED'
  | 'REWARD_GRANTED'
  | 'FOCUS_STARTED'
  | 'FOCUS_PAUSED'
  | 'FOCUS_COMPLETED'
  | 'BOSS_STARTED'
  | 'BOSS_INTERRUPTED'
  | 'BOSS_DEFEATED'
  | 'LEVEL_UP'
  | 'RANK_UP'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'SHADOW_EXTRACTED'
  | 'GOLD_EARNED'
  | 'REWARD_REDEEMED'
  | 'PENALTY_STARTED'
  | 'PENALTY_COMPLETED'
  | 'AI_ACTION_EXECUTED'
  | 'AI_ACTION_REJECTED'
  | 'PLAYER_STATE_UPDATED'
  | 'SKILL_POINTS_DISTRIBUTED'
  | 'SKILL_UNLOCKED'
  | 'SKILL_UPGRADED'
  | 'SKILL_DELETED'
  | 'GOAL_CREATED'
  | 'GOAL_UPDATED'
  | 'GOAL_DELETED'
  | 'MILESTONE_CREATED'
  | 'MILESTONE_UPDATED'
  | 'MILESTONE_COMPLETED'
  | 'USER_SWITCHED'
  | 'SETTINGS_UPDATED';

export type EventSource = 'user' | 'ai' | 'system' | 'timer';

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  payload: T;
  timestamp: string;
  source: EventSource;
  transactionId?: string;
}

export type DomainEventListener<T = any> = (event: DomainEvent<T>) => void;

class DomainEventBusClass {
  private listeners: Map<DomainEventType | '*', Set<DomainEventListener>> = new Map();
  private eventHistory: DomainEvent[] = [];
  private readonly maxHistoryLength = 200;

  /**
   * Subscribe to a specific domain event or '*' for all events.
   * Returns an unsubscribe function.
   */
  public subscribe<T = any>(
    eventType: DomainEventType | '*',
    listener: DomainEventListener<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const set = this.listeners.get(eventType)!;
    set.add(listener as DomainEventListener);

    return () => {
      set.delete(listener as DomainEventListener);
      if (set.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  /**
   * Dispatches a domain event to all registered listeners.
   */
  public emit<T = any>(
    type: DomainEventType,
    payload: T,
    source: EventSource = 'system',
    transactionId?: string
  ): DomainEvent<T> {
    const event: DomainEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      source,
      transactionId,
    };

    // Store in historical buffer
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistoryLength) {
      this.eventHistory.pop();
    }

    // Call specific listeners
    const specificListeners = this.listeners.get(type);
    if (specificListeners) {
      specificListeners.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.error(`Error in DomainEvent listener for ${type}:`, err);
        }
      });
    }

    // Call wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((fn) => {
        try {
          fn(event);
        } catch (err) {
          console.error(`Error in wildcard DomainEvent listener for ${type}:`, err);
        }
      });
    }

    return event;
  }

  /**
   * Get recent domain events for audit or telemetry
   */
  public getRecentEvents(limit: number = 50): DomainEvent[] {
    return this.eventHistory.slice(0, limit);
  }

  /**
   * Clear event history (used in Factory Reset)
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }
}

export const domainEventBus = new DomainEventBusClass();
