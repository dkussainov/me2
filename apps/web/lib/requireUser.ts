import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export const ME2_USER_HEADER = 'x-me2-user-id';

export async function getUserId(): Promise<string | null> {
  const headersList = await headers();
  const fromMiddleware = headersList.get(ME2_USER_HEADER);
  if (fromMiddleware && fromMiddleware.length > 0) return fromMiddleware;

  const session = await auth();
  return session?.user?.id ?? null;
}
