import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { users } from '@me2/db';
import { getDb } from '@/lib/db';
import { signApiToken } from '@/lib/apiToken';

export const runtime = 'nodejs';

const InputSchema = z.object({
  github_token: z.string().min(8).max(500),
});

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

async function fetchGithubUser(token: string): Promise<GithubUser | null> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'me2-web',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as GithubUser;
}

async function fetchPrimaryVerifiedEmail(token: string): Promise<string | null> {
  const res = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'me2-web',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const emails = (await res.json()) as GithubEmail[];
  const primary = emails.find((e) => e.primary && e.verified);
  if (primary) return primary.email;
  const verified = emails.find((e) => e.verified);
  return verified?.email ?? null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const githubToken = parsed.data.github_token.trim();

  try {
    const ghUser = await fetchGithubUser(githubToken);
    if (!ghUser) {
      return NextResponse.json(
        { error: 'invalid_github_token' },
        { status: 401 }
      );
    }

    const email = ghUser.email ?? (await fetchPrimaryVerifiedEmail(githubToken));
    if (!email) {
      return NextResponse.json(
        {
          error: 'github_email_unavailable',
          code: 'missing_email_scope',
          details: 'Token needs at least "user:email" scope with a verified primary email.',
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;
    let isNew = false;

    if (existing) {
      userId = existing.id;
    } else {
      const [inserted] = await db
        .insert(users)
        .values({
          email,
          name: ghUser.name ?? ghUser.login,
          avatarUrl: ghUser.avatar_url,
        })
        .returning({ id: users.id });
      if (!inserted) {
        return NextResponse.json({ error: 'user_upsert_failed' }, { status: 500 });
      }
      userId = inserted.id;
      isNew = true;
    }

    const { token, expiresAt } = await signApiToken({ userId });

    return NextResponse.json(
      {
        token,
        expires_at: expiresAt,
        user: {
          id: userId,
          email,
          name: ghUser.name ?? ghUser.login,
          avatar_url: ghUser.avatar_url,
        },
        created: isNew,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[POST /api/v1/auth/token]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
