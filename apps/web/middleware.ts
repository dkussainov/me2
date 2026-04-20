import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((req) => {
  const path = req.nextUrl.pathname;

  if (path.startsWith('/api/auth/')) return;
  if (path.startsWith('/api/v1/webhook/')) return;

  if (path.startsWith('/api/v1/') && !req.auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
});

export const config = {
  matcher: ['/api/v1/:path*', '/api/auth/:path*'],
};
