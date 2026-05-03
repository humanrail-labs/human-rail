/**
 * Rate-limit placeholder for Mandara Agent API.
 *
 * P6: No-op / simple in-memory counter disabled by default.
 * Future: Redis-backed sliding-window rate limits per API key.
 */

interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
}

const defaultConfig: RateLimitConfig = {
  enabled: false,
  windowMs: 60_000,
  maxRequests: 100,
};

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remaining: number; resetAt: number } {
  const cfg = { ...defaultConfig, ...config };
  const now = Date.now();

  if (!cfg.enabled) {
    return { allowed: true, remaining: cfg.maxRequests, resetAt: now + cfg.windowMs };
  }

  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return { allowed: true, remaining: cfg.maxRequests - 1, resetAt: now + cfg.windowMs };
  }

  if (entry.count >= cfg.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: cfg.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function resetRateLimit(key: string): void {
  memoryStore.delete(key);
}
