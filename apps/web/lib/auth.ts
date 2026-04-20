import NextAuth, { type DefaultSession } from 'next-auth';
import GitHub from 'next-auth/providers/github';
// TODO(auth): Re-enable Apple Sign In once Apple Developer Program enrollment completes.
// See ticket PADA-AUTH-APPLE. Do not remove — keeping the stub preserves the final provider
// layout and the `appleId` upsert path below.
// import Apple from 'next-auth/providers/apple';
import type {} from 'next-auth/jwt';
import { eq } from 'drizzle-orm';
import { users } from '@me2/db';
import { getDb } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    // TODO(auth): Re-enable once Apple Developer enrollment completes.
    // Apple({
    //   clientId: process.env.AUTH_APPLE_ID,
    //   clientSecret: process.env.AUTH_APPLE_SECRET,
    // }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      try {
        const db = getDb();
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(users).values({
            email: user.email,
            name: user.name ?? null,
            avatarUrl: user.image ?? null,
            appleId: account?.provider === 'apple' ? account.providerAccountId : null,
          });
        }
        return true;
      } catch (err) {
        console.error('[auth.signIn]', err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (!user?.email) return token;
      try {
        const [row] = await getDb()
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);
        if (row) token.userId = row.id;
      } catch (err) {
        console.error('[auth.jwt]', err);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
