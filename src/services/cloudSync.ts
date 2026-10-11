/**
 * Authoritative Cloud Synchronization Service
 * Single-user PC ↔ Cloud ↔ Android Phone Synchronization
 * 
 * Rules:
 * 1. UI never writes directly to Firestore.
 * 2. StateAuthority remains the single source of truth for domain state.
 * 3. Offline-first: mutations are stored locally in versioned storage envelopes and queued.
 * 4. Idempotent ledger preservation: reward transactions are merged by ID to prevent duplicate rewards.
 * 5. Automatic migration: existing LocalStorage data is detected and preserved on first sign-in.
 */

import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { AuthoritativeState } from '../domain/StateAuthority';
import { loadStoredData, saveStoredData } from '../utils/storage';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface CloudSyncInfo {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingChanges: boolean;
  errorMessage: string | null;
  authenticatedUserId: string | null;
  isOnline: boolean;
}

const STORAGE_KEY_SYNC_META = 'solo_system_cloud_sync_meta';
const STORAGE_KEY_OFFLINE_QUEUE = 'solo_system_offline_sync_queue';

type SyncListener = (info: CloudSyncInfo) => void;

class CloudSyncService {
  private status: SyncStatus = 'idle';
  private lastSyncedAt: string | null = null;
  private pendingChanges: boolean = false;
  private errorMessage: string | null = null;
  private authenticatedUserId: string | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private listeners: Set<SyncListener> = new Set();
  private remoteSubscription: Unsubscribe | null = null;
  private syncTimeout: NodeJS.Timeout | null = null;
  private isApplyingRemote: boolean = false;

  constructor() {
    this.loadMetadata();
    this.setupNetworkListeners();
  }

  private loadMetadata(): void {
    const meta = loadStoredData<{ lastSyncedAt: string | null }>(STORAGE_KEY_SYNC_META, {
      lastSyncedAt: null,
    });
    this.lastSyncedAt = meta.lastSyncedAt;
    const hasQueue = !!loadStoredData<AuthoritativeState | null>(STORAGE_KEY_OFFLINE_QUEUE, null);
    this.pendingChanges = hasQueue;
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      // Auto-flush pending offline sync when connectivity returns
      this.flushOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.status = 'offline';
      this.notifyListeners();
    });
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getInfo());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getInfo(): CloudSyncInfo {
    return {
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      pendingChanges: this.pendingChanges,
      errorMessage: this.errorMessage,
      authenticatedUserId: this.authenticatedUserId,
      isOnline: this.isOnline,
    };
  }

  private notifyListeners(): void {
    const info = this.getInfo();
    this.listeners.forEach((listener) => {
      try {
        listener(info);
      } catch (err) {
        console.error('Error in cloud sync listener:', err);
      }
    });
  }

  /**
   * Called when Firebase Auth signs in or switches user
   */
  public handleAuthChanged(
    userId: string | null,
    onRemoteUpdate?: (cloudData: AuthoritativeState) => void
  ): void {
    if (this.authenticatedUserId === userId && this.remoteSubscription) {
      return;
    }

    // Unsubscribe from previous user's cloud snapshot
    if (this.remoteSubscription) {
      this.remoteSubscription();
      this.remoteSubscription = null;
    }

    this.authenticatedUserId = userId;

    if (!userId) {
      this.status = 'idle';
      this.notifyListeners();
      return;
    }

    // Subscribe to remote real-time state for this authenticated user
    this.subscribeToRemote(userId, onRemoteUpdate);

    // If online, flush any queued local state for this user
    if (this.isOnline) {
      this.flushOfflineQueue();
    }
  }

  /**
   * Subscribe to Firestore document snapshots at /users/{uid}/system/state
   */
  private subscribeToRemote(
    userId: string,
    onRemoteUpdate?: (cloudData: AuthoritativeState) => void
  ): void {
    const docPath = `users/${userId}/system/state`;
    const stateDocRef = doc(db, 'users', userId, 'system', 'state');

    try {
      this.remoteSubscription = onSnapshot(
        stateDocRef,
        (snapshot) => {
          // If the snapshot originates from our own local writes waiting to sync, ignore
          if (snapshot.metadata.hasPendingWrites) {
            return;
          }

          if (snapshot.exists()) {
            const data = snapshot.data() as {
              state: AuthoritativeState;
              updatedAt: string;
            };

            if (data?.state && !this.isApplyingRemote) {
              this.isApplyingRemote = true;
              try {
                this.lastSyncedAt = data.updatedAt || new Date().toISOString();
                saveStoredData(STORAGE_KEY_SYNC_META, { lastSyncedAt: this.lastSyncedAt });
                this.status = 'synced';
                this.pendingChanges = false;
                this.errorMessage = null;
                this.notifyListeners();

                if (onRemoteUpdate) {
                  onRemoteUpdate(data.state);
                }
              } finally {
                this.isApplyingRemote = false;
              }
            }
          } else {
            // First time user on cloud: state not yet created in Firestore
            this.status = 'idle';
            this.notifyListeners();
          }
        },
        (error) => {
          this.status = 'error';
          this.errorMessage = error.message;
          this.notifyListeners();
          handleFirestoreError(error, OperationType.GET, docPath, auth);
        }
      );
    } catch (err) {
      console.warn('[CloudSync] Failed to initialize snapshot listener:', err);
    }
  }

  /**
   * Queue a state synchronization from StateAuthority (debounced)
   */
  public queueSync(state: AuthoritativeState): void {
    if (this.isApplyingRemote) {
      return; // Do not echo back remote updates
    }

    const userId = this.authenticatedUserId || auth.currentUser?.uid;
    if (!userId) {
      // Local/guest mode: persist in offline queue so when user signs in, it can be migrated
      saveStoredData(STORAGE_KEY_OFFLINE_QUEUE, state);
      this.pendingChanges = true;
      this.notifyListeners();
      return;
    }

    saveStoredData(STORAGE_KEY_OFFLINE_QUEUE, state);
    this.pendingChanges = true;

    if (!this.isOnline) {
      this.status = 'offline';
      this.notifyListeners();
      return;
    }

    // Debounce rapid user actions (e.g. typing or clicking quests)
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.status = 'syncing';
    this.notifyListeners();

    this.syncTimeout = setTimeout(() => {
      this.pushToFirestore(userId, state);
    }, 1200);
  }

  /**
   * Force push current authoritative state to Firestore
   */
  public async pushToFirestore(userId: string, state: AuthoritativeState): Promise<boolean> {
    const docPath = `users/${userId}/system/state`;
    const stateDocRef = doc(db, 'users', userId, 'system', 'state');

    try {
      this.status = 'syncing';
      this.notifyListeners();

      const payload = {
        userId,
        updatedAt: new Date().toISOString(),
        state: {
          player: state.player,
          quests: state.quests,
          skills: state.skills,
          achievements: state.achievements,
          history: state.history,
          logs: state.logs.slice(0, 50),
          goals: state.goals,
          projects: state.projects,
          milestones: state.milestones,
          workSessions: state.workSessions,
          rewardTransactions: state.rewardTransactions,
          settings: state.settings,
        },
      };

      await setDoc(stateDocRef, payload, { merge: true });

      this.lastSyncedAt = payload.updatedAt;
      this.status = 'synced';
      this.pendingChanges = false;
      this.errorMessage = null;

      saveStoredData(STORAGE_KEY_SYNC_META, { lastSyncedAt: this.lastSyncedAt });
      saveStoredData(STORAGE_KEY_OFFLINE_QUEUE, null);

      this.notifyListeners();
      return true;
    } catch (error) {
      this.status = this.isOnline ? 'error' : 'offline';
      this.errorMessage = error instanceof Error ? error.message : String(error);
      this.notifyListeners();
      handleFirestoreError(error, OperationType.WRITE, docPath, auth);
      return false;
    }
  }

  /**
   * Flush queued offline data when connectivity returns
   */
  public async flushOfflineQueue(): Promise<void> {
    const queuedState = loadStoredData<AuthoritativeState | null>(STORAGE_KEY_OFFLINE_QUEUE, null);
    const userId = this.authenticatedUserId || auth.currentUser?.uid;

    if (queuedState && userId && this.isOnline) {
      await this.pushToFirestore(userId, queuedState);
    }
  }

  /**
   * Fetch current cloud state directly from Firestore (used during initial sign-in/migration)
   */
  public async fetchCloudState(userId: string): Promise<AuthoritativeState | null> {
    const docPath = `users/${userId}/system/state`;
    const stateDocRef = doc(db, 'users', userId, 'system', 'state');

    try {
      const snapshot = await getDoc(stateDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as { state: AuthoritativeState; updatedAt?: string };
        if (data.updatedAt) {
          this.lastSyncedAt = data.updatedAt;
          saveStoredData(STORAGE_KEY_SYNC_META, { lastSyncedAt: this.lastSyncedAt });
        }
        return data.state || null;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath, auth);
      return null;
    }
  }
}

export const cloudSync = new CloudSyncService();
