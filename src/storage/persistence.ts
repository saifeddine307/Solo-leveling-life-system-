/**
 * Storage Persistence Module
 * The authoritative layer for reading and writing versioned storage envelopes to LocalStorage.
 */

import { CURRENT_SCHEMA_VERSION, StorageEnvelope, isStorageEnvelope } from './schema';
import { runMigrations } from './migrations';

/**
 * Loads and unwraps versioned data for a key.
 * Automatically runs migrations for legacy/unversioned data and commits the upgraded envelope.
 */
export function loadStoredData<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage === 'undefined') {
      return defaultValue;
    }
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) {
      return defaultValue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(item);
    } catch {
      // If it's a raw unquoted string, e.g. guest ID
      return (item as unknown as T) || defaultValue;
    }

    const { data, needsSave } = runMigrations<T>(parsed, key, defaultValue);

    if (needsSave) {
      saveStoredData(key, data);
    }

    return data;
  } catch (err) {
    console.error(`[StoragePersistence] Failed to load key [${key}]:`, err);
    return defaultValue;
  }
}

/**
 * Persists data wrapped inside the versioned StorageEnvelope.
 */
export function saveStoredData<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const envelope: StorageEnvelope<T> = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      data: value,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    console.error(`[StoragePersistence] Error saving key [${key}]:`, err);
  }
}

/**
 * Read the raw StorageEnvelope without unwrapping (for audits and migration tests).
 */
export function loadRawEnvelope<T>(key: string): StorageEnvelope<T> | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (isStorageEnvelope(parsed)) {
      return parsed as StorageEnvelope<T>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Remove an item from LocalStorage
 */
export function removeStoredData(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error(`[StoragePersistence] Error removing key [${key}]:`, err);
  }
}
