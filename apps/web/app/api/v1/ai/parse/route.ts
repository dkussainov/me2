import { NextResponse, type NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { taskParseV2 } from '@me2/ai-prompts';
import { TaskParseOutputSchema } from '@me2/types';
import { rateLimit } from '@/lib/rateLimit';
import { getUserId } from '@/lib/requireUser';

export const runtime = 'nodejs';

const ParseInputSchema = z.object({
  input: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const gate = await rateLimit(userId, 'ai:parse', { limit: 60, window: '1h' });
  if (!gate.success) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', code: 'ai_rate_limit', details: { reset_at: gate.resetAt } },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((gate.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = ParseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: TaskParseOutputSchema,
    prompt: taskParseV2(parsed.data.input),
  });

  return NextResponse.json(object);
}
