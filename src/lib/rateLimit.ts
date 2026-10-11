import { prisma } from "./prisma";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// In-memory fallback cache preserved across module reloads
const globalForRateLimit = globalThis as unknown as {
  __prepTrackRateLimitStore?: Map<string, { count: number; resetAt: number }>;
};
const memoryStore =
  globalForRateLimit.__prepTrackRateLimitStore ||
  new Map<string, { count: number; resetAt: number }>();
globalForRateLimit.__prepTrackRateLimitStore = memoryStore;

// Optional Upstash Redis limiter if environment variables are provided
let upstashLimiter: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const redis = Redis.fromEnv();
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "preptrack:ratelimit",
    });
  } catch (err) {
    console.warn("Failed to initialize Upstash Ratelimit:", err);
  }
}

let dbCheckCooldownUntil = 0;
let dbTableAvailable = false;

async function ensureDbRateLimitTable(): Promise<boolean> {
  const now = Date.now();
  if (dbTableAvailable) return true;
  if (now < dbCheckCooldownUntil) return false;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_RateLimit" (
        "key" VARCHAR(255) PRIMARY KEY,
        "count" INT NOT NULL DEFAULT 1,
        "resetAt" BIGINT NOT NULL
      );
    `);
    dbTableAvailable = true;
    return true;
  } catch (e) {
    dbCheckCooldownUntil = now + 60000;
    dbTableAvailable = false;
    return false;
  }
}

/**
 * Extract true client IP safely behind reverse proxies (Vercel, Cloudflare, etc.)
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks if a key has exceeded rate limit. Does NOT automatically increment.
 */
export async function checkLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<RateLimitResult> {
  const now = Date.now();

  // 1. Upstash Redis check if configured
  if (upstashLimiter) {
    try {
      const res = await upstashLimiter.limit(key);
      return {
        allowed: res.success,
        remaining: res.remaining,
        resetInSeconds: Math.ceil(res.reset / 1000),
      };
    } catch (e) {
      // Fallback to DB/memory on Redis error
    }
  }

  // 2. Try DB check
  try {
    const hasTable = await ensureDbRateLimitTable();
    if (hasTable) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "count", "resetAt" FROM "_RateLimit" WHERE "key" = $1 LIMIT 1`,
        key
      );

      if (rows && rows.length > 0) {
        const row = rows[0];
        const resetAt = Number(row.resetAt);
        const count = Number(row.count);

        if (now > resetAt) {
          return { allowed: true, remaining: maxRequests, resetInSeconds: 0 };
        }

        if (count >= maxRequests) {
          const resetInSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
          return { allowed: false, remaining: 0, resetInSeconds };
        }

        return {
          allowed: true,
          remaining: Math.max(0, maxRequests - count),
          resetInSeconds: Math.max(0, Math.ceil((resetAt - now) / 1000)),
        };
      }
    }
  } catch (dbErr) {
    // Fall back to memoryStore
  }

  // 3. In-memory check fallback
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    return { allowed: true, remaining: maxRequests, resetInSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - entry.count),
    resetInSeconds: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

/**
 * Increments failed attempt count for a key.
 */
export async function recordFailedAttempt(
  key: string,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<number> {
  const now = Date.now();
  const resetAt = now + windowMs;

  // 1. Update in-memory
  const currentMem = memoryStore.get(key);
  let memCount = 1;
  if (currentMem && now <= currentMem.resetAt) {
    memCount = currentMem.count + 1;
    memoryStore.set(key, { count: memCount, resetAt: currentMem.resetAt });
  } else {
    memoryStore.set(key, { count: 1, resetAt });
  }

  // 2. Update DB and get actual database count
  let dbCount: number | null = null;
  try {
    const hasTable = await ensureDbRateLimitTable();
    if (hasTable) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `INSERT INTO "_RateLimit" ("key", "count", "resetAt")
         VALUES ($1, 1, $2)
         ON CONFLICT ("key") DO UPDATE 
         SET "count" = CASE 
           WHEN "_RateLimit"."resetAt" < $3 THEN 1 
           ELSE "_RateLimit"."count" + 1 
         END,
         "resetAt" = CASE 
           WHEN "_RateLimit"."resetAt" < $3 THEN $2 
           ELSE "_RateLimit"."resetAt" 
         END
         RETURNING "count", "resetAt"`,
        key,
        resetAt,
        now
      );
      if (rows && rows.length > 0 && rows[0]?.count !== undefined) {
        dbCount = Number(rows[0].count);
        const actualReset = Number(rows[0].resetAt || resetAt);
        memoryStore.set(key, { count: dbCount, resetAt: actualReset });
      }
    }
  } catch (e) {
    // Memory counter already set
  }

  return dbCount !== null ? dbCount : memCount;
}

/**
 * Reset failed attempts on successful login.
 */
export async function resetAttempts(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    const hasTable = await ensureDbRateLimitTable();
    if (hasTable) {
      await prisma.$executeRawUnsafe(`DELETE FROM "_RateLimit" WHERE "key" = $1`, key);
    }
  } catch (e) {}
}

/**
 * Standard request rate limit helper for general endpoints
 */
export function checkRateLimit(
  ipOrKey: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryStore.get(ipOrKey);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(ipOrKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}
