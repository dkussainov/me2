import NextAuth, { type DefaultSession } from 'next-auth';
import Apple from 'next-auth/providers/apple';
import GitHub from 'next-auth/providers/github';
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
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
    GitHub,
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
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
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const [row] = await getDb()
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);
        if (row) token.userId = row.id;
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
