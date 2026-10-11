/**
 * Storage Schema Definitions & Version Control
 * Every persisted domain state entry is wrapped in a versioned envelope.
 */

export const CURRENT_SCHEMA_VERSION = 1;

export interface StorageEnvelope<T> {
  schemaVersion: number;
  data: T;
  updatedAt: string;
}

/**
 * Type guard to check if an arbitrary object is a StorageEnvelope
 */
export function isStorageEnvelope(value: unknown): value is StorageEnvelope<unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.schemaVersion === 'number' && 'data' in candidate;
}
