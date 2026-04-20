import { NextResponse } from 'next/server';
import { and, count, eq, isNull } from 'drizzle-orm';
import { tasks } from '@me2/db';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, session.user.id),
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
