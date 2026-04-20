import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { verifyApiToken } from '@/lib/apiToken';
import { ME2_USER_HEADER } from '@/lib/requireUser';

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) {
      const payload = await verifyApiToken(token);
      return payload?.userId ?? null;
    }
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;

  if (path.startsWith('/api/auth/')) return NextResponse.next();
  if (path.startsWith('/api/v1/auth/')) return NextResponse.next();
  if (path.startsWith('/api/v1/webhook/')) return NextResponse.next();

  if (!path.startsWith('/api/v1/')) return NextResponse.next();

  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.delete(ME2_USER_HEADER);
  forwardHeaders.set(ME2_USER_HEADER, userId);

  return NextResponse.next({ request: { headers: forwardHeaders } });
}

export const config = {
  matcher: ['/api/v1/:path*', '/api/auth/:path*'],
};
