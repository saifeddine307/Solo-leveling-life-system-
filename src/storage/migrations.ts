/**
 * Storage Migrations Engine
 * Handles deterministic, safe migrations across schema versions.
 * Unversioned data (Version 0) is seamlessly upgraded to Version 1 without loss.
 */

import { CURRENT_SCHEMA_VERSION, isStorageEnvelope, StorageEnvelope } from './schema';

export type MigrationStep = (data: any, storageKey: string) => any;

/**
 * Migration 0 -> 1:
 * Upgrades legacy unversioned raw records to Schema Version 1.
 * Validates baseline shapes and normalizes missing defaults.
 */
function migrateV0ToV1(rawData: any, storageKey: string): any {
  if (rawData === null || rawData === undefined) {
    return rawData;
  }

  // Key-specific normalization if required
  if (storageKey.includes('player') && typeof rawData === 'object') {
    return {
      ...rawData,
      level: Math.max(1, Number(rawData.level) || 1),
      currentXP: Math.max(0, Number(rawData.currentXP) || 0),
      totalXPEarned: Math.max(0, Number(rawData.totalXPEarned) || 0),
      gold: Math.max(0, Number(rawData.gold) || 0),
      statPoints: Math.max(0, Number(rawData.statPoints) || 0),
      streak: Math.max(0, Number(rawData.streak) || 0),
      rank: rawData.rank || 'E',
      stats: rawData.stats || {
        strength: 10,
        agility: 10,
        intelligence: 10,
        perception: 10,
        vitality: 10,
      },
    };
  }

  if (storageKey.includes('quests') || storageKey.includes('skills') || storageKey.includes('transactions') || storageKey.includes('history')) {
    if (!Array.isArray(rawData)) {
      return [];
    }
  }

  return rawData;
}

/**
 * Registry of version migrations.
 * Each entry migrations[N] transforms data from version N-1 to version N.
 */
export const migrationRegistry: Record<number, MigrationStep> = {
  1: migrateV0ToV1,
};

export interface MigrationResult<T> {
  data: T;
  needsSave: boolean;
}

/**
 * Executes stepwise migrations from existing version to CURRENT_SCHEMA_VERSION.
 * Fails safely without corrupting data if an error occurs.
 */
export function runMigrations<T>(
  rawParsed: unknown,
  storageKey: string,
  defaultValue: T
): MigrationResult<T> {
  if (rawParsed === null || rawParsed === undefined) {
    return { data: defaultValue, needsSave: false };
  }

  try {
    if (!isStorageEnvelope(rawParsed)) {
      // Unversioned data (Version 0) -> Run migration to Version 1
      const step1 = migrationRegistry[1];
      const migrated = step1 ? step1(rawParsed, storageKey) : rawParsed;
      return {
        data: migrated as T,
        needsSave: true,
      };
    }

    const envelope = rawParsed as StorageEnvelope<T>;
    const version = envelope.schemaVersion;

    if (version === CURRENT_SCHEMA_VERSION) {
      return { data: envelope.data, needsSave: false };
    }

    if (version < CURRENT_SCHEMA_VERSION) {
      let currentData: any = envelope.data;
      for (let v = version + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
        const step = migrationRegistry[v];
        if (step) {
          currentData = step(currentData, storageKey);
        }
      }
      return { data: currentData as T, needsSave: true };
    }

    // version > CURRENT_SCHEMA_VERSION: Newer schema from future build
    console.warn(
      `[StorageMigration] Key [${storageKey}] has newer schema version ${version} (expected <= ${CURRENT_SCHEMA_VERSION}). Reading safely.`
    );
    return { data: envelope.data, needsSave: false };
  } catch (err) {
    console.error(`[StorageMigration] Migration failed safely for [${storageKey}]:`, err);
    // Safe fallback: return raw data or defaultValue without crashing
    if (isStorageEnvelope(rawParsed)) {
      return { data: (rawParsed as StorageEnvelope<T>).data, needsSave: false };
    }
    return { data: (rawParsed as T) || defaultValue, needsSave: false };
  }
}
