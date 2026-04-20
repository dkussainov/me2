import * as dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'NEON_DATABASE_URL is not set — required by drizzle-kit. Add it to your .env.local.'
  );
}

export default {
  schema: './src/schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  strict: true,
  verbose: true,
} satisfies Config;
