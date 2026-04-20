import { NextResponse, type NextRequest } from 'next/server';
import { and, desc, eq, isNull, lt } from 'drizzle-orm';
import { z } from 'zod';
import { tasks, type TaskRow, type NewTaskRow } from '@me2/db';
import {
  CreateTaskInputSchema,
  TaskStatusSchema,
  type Task,
} from '@me2/types';
import { getDb } from '@/lib/db';
import { getUserId } from '@/lib/requireUser';

export const runtime = 'nodejs';

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().datetime().optional(),
  status: TaskStatusSchema.optional(),
});

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    status: row.status as Task['status'],
    priority: (row.priority as Task['priority']) ?? undefined,
    category: (row.category as Task['category']) ?? undefined,
    due_date: row.dueDate?.toISOString(),
    reminder_date: row.reminderDate?.toISOString(),
    recurrence_rule: row.recurrenceRule ?? undefined,
    source: row.source as Task['source'],
    source_url: row.sourceUrl ?? undefined,
    assignee_name: row.assigneeName ?? undefined,
    routed_to: (row.routedTo as Task['routed_to']) ?? undefined,
    ai_confidence: row.aiConfidence ?? undefined,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    completed_at: row.completedAt?.toISOString(),
    deleted_at: row.deletedAt?.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = ListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { limit, cursor, status } = parsed.data;
  const db = getDb();

  const conditions = [eq(tasks.userId, userId), isNull(tasks.deletedAt)];
  if (status) conditions.push(eq(tasks.status, status));
  if (cursor) conditions.push(lt(tasks.updatedAt, new Date(cursor)));

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.updatedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.updatedAt.toISOString() : null;

  return NextResponse.json({
    tasks: page.map(rowToTask),
    next_cursor: nextCursor,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = CreateTaskInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const row: NewTaskRow = {
    id: input.id,
    userId,
    title: input.title,
    notes: input.notes ?? null,
    status: input.status,
    priority: input.priority ?? null,
    category: input.category ?? null,
    dueDate: input.due_date ? new Date(input.due_date) : null,
    reminderDate: input.reminder_date ? new Date(input.reminder_date) : null,
    recurrenceRule: input.recurrence_rule ?? null,
    source: input.source,
    sourceUrl: input.source_url ?? null,
    assigneeName: input.assignee_name ?? null,
    aiConfidence: input.ai_confidence ?? null,
  };

  const db = getDb();
  try {
    const [inserted] = await db.insert(tasks).values(row).returning();
    if (!inserted) {
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }
    return NextResponse.json(rowToTask(inserted), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    if (message.includes('duplicate key')) {
      return NextResponse.json({ error: 'task_exists', code: 'duplicate_id' }, { status: 409 });
    }
    throw err;
  }
}
