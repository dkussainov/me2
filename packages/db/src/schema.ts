import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  boolean,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    appleId: text('apple_id'),
    timezone: text('timezone').notNull().default('UTC'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    emailUniqueIdx: uniqueIndex('users_email_unique_idx')
      .on(t.email)
      .where(sql`${t.deletedAt} IS NULL`),
    appleIdUniqueIdx: uniqueIndex('users_apple_id_unique_idx')
      .on(t.appleId)
      .where(sql`${t.appleId} IS NOT NULL AND ${t.deletedAt} IS NULL`),
  })
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    notes: text('notes'),
    status: text('status').notNull().default('open'),
    priority: text('priority'),
    category: text('category'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    reminderDate: timestamp('reminder_date', { withTimezone: true }),
    recurrenceRule: text('recurrence_rule'),
    source: text('source').notNull(),
    sourceUrl: text('source_url'),
    assigneeName: text('assignee_name'),
    routedTo: text('routed_to'),
    aiConfidence: real('ai_confidence'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('tasks_user_idx').on(t.userId),
    userStatusIdx: index('tasks_user_status_idx').on(t.userId, t.status),
    userDueDateIdx: index('tasks_user_due_date_idx').on(t.userId, t.dueDate),
    userUpdatedAtIdx: index('tasks_user_updated_at_idx').on(t.userId, t.updatedAt),
    userActiveIdx: index('tasks_user_active_idx')
      .on(t.userId)
      .where(sql`${t.deletedAt} IS NULL`),
  })
);

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    service: text('service').notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userServiceUniqueIdx: uniqueIndex('integrations_user_service_unique_idx').on(
      t.userId,
      t.service
    ),
    userActiveIdx: index('integrations_user_active_idx')
      .on(t.userId)
      .where(sql`${t.isActive} = true`),
  })
);

export const pendingSync = pgTable(
  'pending_sync',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    operation: text('operation').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    payload: jsonb('payload').notNull(),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index('pending_sync_user_created_idx').on(t.userId, t.createdAt),
    nextAttemptIdx: index('pending_sync_next_attempt_idx').on(t.nextAttemptAt),
  })
);

export const syncConflicts = pgTable(
  'sync_conflicts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    localVersion: jsonb('local_version').notNull(),
    remoteVersion: jsonb('remote_version').notNull(),
    resolved: boolean('resolved').notNull().default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedVersion: jsonb('resolved_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUnresolvedIdx: index('sync_conflicts_user_unresolved_idx')
      .on(t.userId)
      .where(sql`${t.resolved} = false`),
    entityIdx: index('sync_conflicts_entity_idx').on(t.entityType, t.entityId),
  })
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

export type IntegrationRow = typeof integrations.$inferSelect;
export type NewIntegrationRow = typeof integrations.$inferInsert;

export type PendingSyncRow = typeof pendingSync.$inferSelect;
export type NewPendingSyncRow = typeof pendingSync.$inferInsert;

export type SyncConflictRow = typeof syncConflicts.$inferSelect;
export type NewSyncConflictRow = typeof syncConflicts.$inferInsert;
