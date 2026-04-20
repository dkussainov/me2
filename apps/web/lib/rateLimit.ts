import { kv } from '@vercel/kv';

export interface RateLimitOptions {
  limit: number;
  window: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

const WINDOW_UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function parseWindow(window: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(window);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid rate-limit window: "${window}" — expected e.g. "1h" or "30s".`);
  }
  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof WINDOW_UNITS;
  const scale = WINDOW_UNITS[unit];
  if (scale === undefined) {
    throw new Error(`Unsupported rate-limit window unit: "${unit}".`);
  }
  return amount * scale;
}

export async function rateLimit(
  userId: string,
  action: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const windowMs = parseWindow(options.window);
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const key = `ratelimit:${action}:${userId}:${bucket}`;

  const count = await kv.incr(key);
  if (count === 1) {
    await kv.pexpire(key, windowMs);
  }

  const resetAt = (bucket + 1) * windowMs;
  return {
    success: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    resetAt,
  };
}
