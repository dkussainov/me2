import { NextResponse } from 'next/server';
import { and, count, eq, isNull } from 'drizzle-orm';
import { tasks } from '@me2/db';
import { getDb } from '@/lib/db';
import { getUserId } from '@/lib/requireUser';

export const runtime = 'nodejs';

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'open'),
          isNull(tasks.deletedAt)
        )
      );

    return NextResponse.json({ count: row?.value ?? 0 });
  } catch (err) {
    console.error('[GET /api/v1/tasks/count]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
