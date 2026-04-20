import type {
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '@me2/types';
import { getDatabase } from './migrate';

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  status: string;
  priority: string | null;
  category: string | null;
  due_date: string | null;
  reminder_date: string | null;
  recurrence_rule: string | null;
  source: string;
  source_url: string | null;
  assignee_name: string | null;
  routed_to: string | null;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  limit?: number;
  includeDeleted?: boolean;
}

const UPDATABLE_COLUMNS = new Set([
  'title',
  'notes',
  'status',
  'priority',
  'category',
  'due_date',
  'reminder_date',
  'recurrence_rule',
  'assignee_name',
  'routed_to',
  'completed_at',
]);

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    status: row.status as Task['status'],
    priority: (row.priority as Task['priority']) ?? undefined,
    category: (row.category as Task['category']) ?? undefined,
    due_date: row.due_date ?? undefined,
    reminder_date: row.reminder_date ?? undefined,
    recurrence_rule: row.recurrence_rule ?? undefined,
    source: row.source as Task['source'],
    source_url: row.source_url ?? undefined,
    assignee_name: row.assignee_name ?? undefined,
    routed_to: (row.routed_to as Task['routed_to']) ?? undefined,
    ai_confidence: row.ai_confidence ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
  };
}

export class TaskRepository {
  async insert(task: Task, userId: string): Promise<Task> {
    const db = getDatabase();
    await db.runAsync(
      `INSERT INTO tasks
       (id, user_id, title, notes, status, priority, category, due_date, reminder_date,
        recurrence_rule, source, source_url, assignee_name, routed_to, ai_confidence,
        created_at, updated_at, completed_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        userId,
        task.title,
        task.notes ?? null,
        task.status,
        task.priority ?? null,
        task.category ?? null,
        task.due_date ?? null,
        task.reminder_date ?? null,
        task.recurrence_rule ?? null,
        task.source,
        task.source_url ?? null,
        task.assignee_name ?? null,
        task.routed_to ?? null,
        task.ai_confidence ?? null,
        task.created_at,
        task.updated_at,
        task.completed_at ?? null,
        task.deleted_at ?? null,
      ]
    );
    return task;
  }

  async listForUser(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const db = getDatabase();
    const where: string[] = ['user_id = ?'];
    const args: (string | number)[] = [userId];

    if (!filters.includeDeleted) where.push('deleted_at IS NULL');
    if (filters.status) {
      where.push('status = ?');
      args.push(filters.status);
    }
    if (filters.category) {
      where.push('category = ?');
      args.push(filters.category);
    }
    if (filters.priority) {
      where.push('priority = ?');
      args.push(filters.priority);
    }

    const limit = filters.limit ?? 200;
    args.push(limit);

    const rows = await db.getAllAsync<TaskRow>(
      `SELECT * FROM tasks WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`,
      args
    );
    return rows.map(rowToTask);
  }

  async getById(id: string): Promise<Task | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<TaskRow>(
      `SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return row ? rowToTask(row) : null;
  }

  async update(id: string, fields: UpdateTaskInput): Promise<Task | null> {
    const entries = Object.entries(fields).filter(([key, value]) => {
      if (value === undefined) return false;
      return UPDATABLE_COLUMNS.has(key);
    });
    if (entries.length === 0) return this.getById(id);

    const db = getDatabase();
    const now = new Date().toISOString();
    const sets = entries.map(([key]) => `${key} = ?`);
    const values = entries.map(([, value]) => (value === null ? null : (value as string | number)));

    await db.runAsync(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [...values, now, id]
    );
    return this.getById(id);
  }

  async softDelete(id: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
      [now, now, id]
    );
  }
}

export const taskRepository = new TaskRepository();
