/**
 * Authentication Service for Hunter Life System
 * Private Single-User Google Sign-In & Profile Synchronization
 */

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { stateAuthority } from '../domain';
import { cloudSync } from './cloudSync';
import { UserAccount } from '../types';
import { getRegisteredUsers, saveUserData, setCurrentUserId, STORAGE_KEY_USERS_LIST } from '../utils/auth';
import { saveStoredData } from '../utils/storage';

export interface AuthState {
  user: FirebaseUser | null;
  account: UserAccount | null;
  loading: boolean;
  error: string | null;
  isCloudLinked: boolean;
}

type AuthListener = (state: AuthState) => void;

class AuthService {
  private currentUser: FirebaseUser | null = null;
  private currentAccount: UserAccount | null = null;
  private loading: boolean = true;
  private error: string | null = null;
  private listeners: Set<AuthListener> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    this.initAuthObserver();
  }

  private initAuthObserver(): void {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      this.loading = false;
      this.error = null;

      if (user) {
        // Find or create local UserAccount for this Google user
        const account = this.syncLocalUserAccount(user);
        this.currentAccount = account;

        // Perform initial cloud migration or cloud state synchronization
        await this.handleUserSignIn(user.uid, account);

        // Bind cloud sync listener for remote updates from other devices (PC ↔ Phone)
        cloudSync.handleAuthChanged(user.uid, (cloudData) => {
          stateAuthority.applyCloudState(cloudData);
        });
      } else {
        this.currentAccount = null;
        cloudSync.handleAuthChanged(null);
      }

      this.isInitialized = true;
      this.notifyListeners();
    });
  }

  private syncLocalUserAccount(user: FirebaseUser): UserAccount {
    const users = getRegisteredUsers();
    const existing = users.find((u) => u.id === user.uid || u.email === user.email);

    const account: UserAccount = {
      id: user.uid,
      email: user.email || 'hunter@system.solo',
      username: user.displayName || user.email?.split('@')[0] || 'Awakened Hunter',
      displayName: user.displayName || user.email?.split('@')[0] || 'Awakened Hunter',
      avatar: existing?.avatar || 'monarch',
      createdAt: existing?.createdAt || new Date().toISOString(),
      isGuest: false,
    };

    const updatedUsers = users.filter((u) => u.id !== user.uid);
    updatedUsers.unshift(account);
    saveStoredData(STORAGE_KEY_USERS_LIST, updatedUsers);
    setCurrentUserId(user.uid);

    return account;
  }

  /**
   * Handle first-time migration or merging when user signs in
   */
  private async handleUserSignIn(uid: string, account: UserAccount): Promise<void> {
    const currentState = stateAuthority.getState();

    // 1. Check if cloud state already exists for this account
    const remoteState = await cloudSync.fetchCloudState(uid);

    if (!remoteState) {
      // FIRST-TIME SIGN IN: Migrate existing local data to cloud profile
      console.log('[AuthService] First-time sign in detected. Migrating local state to cloud profile...');

      // Update player name to Google displayName if player has default name
      const playerProfile = {
        ...currentState.player,
        name:
          currentState.player.name === 'Sung Jin-Woo' && account.displayName
            ? account.displayName
            : currentState.player.name,
      };

      const migratedState = {
        ...currentState,
        player: playerProfile,
      };

      // Save to partitioned user storage
      saveUserData(uid, {
        profile: migratedState.player,
        quests: migratedState.quests,
        skills: migratedState.skills,
        achievements: migratedState.achievements,
        history: migratedState.history,
        logs: migratedState.logs,
        goals: migratedState.goals,
        projects: migratedState.projects,
        milestones: migratedState.milestones,
        workSessions: migratedState.workSessions,
        rewardTransactions: migratedState.rewardTransactions,
        settings: migratedState.settings,
      });

      // Switch StateAuthority to this authenticated partition
      stateAuthority.switchUser(uid);

      // Force push migrated state to Firestore
      await cloudSync.pushToFirestore(uid, migratedState);
    } else {
      // CLOUD STATE EXISTS: Merge deterministic state (e.g. from PC to Android phone)
      console.log('[AuthService] Existing cloud state found. Merging local and cloud records...');
      stateAuthority.mergeCloudAndLocal(remoteState, uid);
    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AuthState {
    return {
      user: this.currentUser,
      account: this.currentAccount,
      loading: this.loading,
      error: this.error,
      isCloudLinked: !!this.currentUser,
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  /**
   * Google Sign-In Flow
   */
  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    this.loading = true;
    this.error = null;
    this.notifyListeners();

    try {
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google Sign-In failed';
      this.error = message;
      this.loading = false;
      this.notifyListeners();
      return { success: false, error: message };
    }
  }

  /**
   * Sign Out Flow
   */
  public async signOut(): Promise<void> {
    this.loading = true;
    this.notifyListeners();

    try {
      await firebaseSignOut(auth);
      // Switch back to local guest partition safely without deleting user data
      stateAuthority.switchUser('guest');
    } catch (err) {
      console.error('[AuthService] Sign out error:', err);
    } finally {
      this.loading = false;
      this.notifyListeners();
    }
  }
}

export const authService = new AuthService();
