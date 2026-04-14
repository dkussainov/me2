import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type Schema = typeof schema;
export type DB = NeonHttpDatabase<Schema>;

function getConnectionString(): string {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'NEON_DATABASE_URL environment variable is not set — required to initialise the Neon client.'
    );
  }
  return connectionString;
}

export function createDb(connectionString: string = getConnectionString()): DB {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

let cachedDb: DB | null = null;

export function getDb(): DB {
  if (cachedDb) return cachedDb;
  cachedDb = createDb();
  return cachedDb;
}
