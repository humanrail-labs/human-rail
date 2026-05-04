/**
 * Redis-backed rate limiter for Mandara API.
 *
 * Uses a sliding window counter stored in Redis so rate limits
 * work correctly across multiple API server instances.
 */

import { Redis } from "ioredis";
import { env } from "../config.js";

const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within the rate limit.
 *
 * @param key - Unique identifier for the limit bucket (e.g. `apikey:${prefix}` or `ip:${ip}`)
 * @param maxRequests - Maximum allowed requests in the window
 * @param windowMs - Window size in milliseconds
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const redisKey = `ratelimit:${key}:${windowStart}`;

  const pipeline = redis.pipeline();
  pipeline.incr(redisKey);
  pipeline.pexpire(redisKey, windowMs);

  const results = await pipeline.exec();
  const currentCount = (results?.[0]?.[1] as number) ?? 1;

  const allowed = currentCount <= maxRequests;
  const remaining = Math.max(0, maxRequests - currentCount);
  const resetAt = windowStart + windowMs;

  return { allowed, remaining, resetAt };
}

/**
 * Reset the rate limit counter for a given key.
 */
export async function resetRateLimit(key: string): Promise<void> {
  const pattern = `ratelimit:${key}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
