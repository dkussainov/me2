import * as SQLite from 'expo-sqlite';

const DB_NAME = 'me2.db';

type Migration = {
  version: number;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
};

const migrations: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'open',
          priority TEXT,
          category TEXT,
          due_date TEXT,
          reminder_date TEXT,
          recurrence_rule TEXT,
          source TEXT NOT NULL,
          source_url TEXT,
          assignee_name TEXT,
          routed_to TEXT,
          ai_confidence REAL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS tasks_user_status_idx ON tasks(user_id, status);
        CREATE INDEX IF NOT EXISTS tasks_user_due_date_idx ON tasks(user_id, due_date);
        CREATE INDEX IF NOT EXISTS tasks_user_updated_at_idx ON tasks(user_id, updated_at);
        CREATE INDEX IF NOT EXISTS tasks_user_active_idx ON tasks(user_id) WHERE deleted_at IS NULL;

        CREATE TABLE IF NOT EXISTS subtasks (
          id TEXT PRIMARY KEY NOT NULL,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          order_index INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS subtasks_task_order_idx ON subtasks(task_id, order_index);
        CREATE INDEX IF NOT EXISTS subtasks_task_active_idx ON subtasks(task_id) WHERE deleted_at IS NULL;

        CREATE TABLE IF NOT EXISTS attachments (
          id TEXT PRIMARY KEY NOT NULL,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          url TEXT,
          content TEXT,
          mime_type TEXT,
          size_bytes INTEGER,
          file_path TEXT,
          line_number INTEGER,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS attachments_task_idx ON attachments(task_id);

        CREATE TABLE IF NOT EXISTS pending_sync (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL,
          next_attempt_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS pending_sync_user_created_idx ON pending_sync(user_id, created_at);
        CREATE INDEX IF NOT EXISTS pending_sync_next_attempt_idx ON pending_sync(next_attempt_at);

        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          local_version TEXT NOT NULL,
          remote_version TEXT NOT NULL,
          resolved INTEGER NOT NULL DEFAULT 0,
          resolved_at TEXT,
          resolved_version TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sync_conflicts_user_unresolved_idx ON sync_conflicts(user_id) WHERE resolved = 0;
        CREATE INDEX IF NOT EXISTS sync_conflicts_entity_idx ON sync_conflicts(entity_type, entity_id);
      `);
    },
  },
];

let cachedDb: SQLite.SQLiteDatabase | null = null;

async function applyMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;
  const pending = migrations
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}

export async function openMigratedDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (cachedDb) return cachedDb;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await applyMigrations(db);
  cachedDb = db;
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!cachedDb) {
    throw new Error('Database not initialised — call openMigratedDatabase() first.');
  }
  return cachedDb;
}

export async function resetDatabaseForTests(): Promise<void> {
  if (cachedDb) {
    await cachedDb.closeAsync();
    cachedDb = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME);
}
