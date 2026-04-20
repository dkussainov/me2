import { getDb as getSharedDb, type DB, type Schema } from '@me2/db';

let cached: DB | null = null;

export function getDb(): DB {
  if (cached) return cached;
  cached = getSharedDb();
  return cached;
}

export type { DB, Schema };
