/**
 * Redis Client Wrapper - Fase 3 Sprint 2
 *
 * Distributed caching layer for:
 * - Ranking queries (municipios, bairros, zonas, secoes)
 * - Goal (metas) aggregations
 * - Campaign statistics
 * - Vote counts per territory
 *
 * Benefits over in-memory SWR cache:
 * - Shared across multiple server instances
 * - Survives server restarts
 * - Centralized invalidation
 * - Metrics & monitoring
 */

import { Redis } from "@upstash/redis";

// Initialize Redis client (via environment variable)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export type CacheKey = {
  ranking: `ranking:${string}:${string}`; // ranking:campanhaId:nivel
  metas: `metas:${string}:${string}`; // metas:campanhaId:nivel
  votos: `votos:${string}:${string}`; // votos:campanhaId:nivel
  territory: `territory:${string}`; // territory:id
  campaign: `campaign:${string}`; // campaign:id
  search: `search:${string}`; // search:term
};

export type CacheTTL = {
  rankings: number; // 5 minutes
  metas: number; // 30 minutes (less frequent change)
  votos: number; // 10 minutes (changes with imports)
  territory: number; // 1 hour (rarely changes)
  campaign: number; // 1 day (very stable)
};

// Default TTLs (in seconds)
const DEFAULT_TTLS: CacheTTL = {
  rankings: 300, // 5 min - updates frequently
  metas: 1800, // 30 min - less frequent
  votos: 600, // 10 min - changes with imports
  territory: 3600, // 1 hour
  campaign: 86400, // 1 day
};

/**
 * Cache a value with automatic TTL based on key type
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttl?: number
): Promise<void> {
  if (!redis) {
    console.warn("Redis not configured, skipping cache");
    return;
  }

  try {
    const actualTTL = ttl || determineTTL(key);
    await redis.setex(key, actualTTL, JSON.stringify(value));
  } catch (err) {
    console.error("Cache set error:", err);
    // Fail silently - cache miss is better than app crash
  }
}

/**
 * Retrieve cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const cached = await redis.get(key);
    if (!cached) return null;

    return JSON.parse(cached as string) as T;
  } catch (err) {
    console.error("Cache get error:", err);
    return null;
  }
}

/**
 * Delete cache key (invalidation)
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (err) {
    console.error("Cache delete error:", err);
  }
}

/**
 * Delete multiple cache keys (pattern-based invalidation)
 */
export async function cacheDeletePattern(pattern: string): Promise<number> {
  if (!redis) return 0;

  try {
    // Get all keys matching pattern
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    // Delete in batches (avoid timeout on large patterns)
    let deleted = 0;
    for (let i = 0; i < keys.length; i += 100) {
      const batch = keys.slice(i, i + 100);
      deleted += await redis.del(...batch);
    }

    return deleted;
  } catch (err) {
    console.error("Cache delete pattern error:", err);
    return 0;
  }
}

/**
 * Clear all cache for a campaign (cascade invalidation)
 */
export async function cacheClearCampaign(campanhaId: string): Promise<number> {
  if (!redis) return 0;

  const patterns = [
    `ranking:${campanhaId}:*`,
    `metas:${campanhaId}:*`,
    `votos:${campanhaId}:*`,
  ];

  let total = 0;
  for (const pattern of patterns) {
    total += await cacheDeletePattern(pattern);
  }

  return total;
}

/**
 * Determine TTL based on key type
 */
function determineTTL(key: string): number {
  if (key.startsWith("ranking:")) return DEFAULT_TTLS.rankings;
  if (key.startsWith("metas:")) return DEFAULT_TTLS.metas;
  if (key.startsWith("votos:")) return DEFAULT_TTLS.votos;
  if (key.startsWith("territory:")) return DEFAULT_TTLS.territory;
  if (key.startsWith("campaign:")) return DEFAULT_TTLS.campaign;
  return 300; // Default 5 minutes
}

/**
 * Cache statistics tracking
 */
export class CacheStats {
  private hits = 0;
  private misses = 0;

  async recordHit(): Promise<void> {
    this.hits++;
    if (redis) {
      await redis.incr("cache:stats:hits");
    }
  }

  async recordMiss(): Promise<void> {
    this.misses++;
    if (redis) {
      await redis.incr("cache:stats:misses");
    }
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  async getServerStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    if (!redis) {
      return { hits: 0, misses: 0, hitRate: 0 };
    }

    try {
      const hits = (await redis.get("cache:stats:hits")) ?? 0;
      const misses = (await redis.get("cache:stats:misses")) ?? 0;
      const total = Number(hits) + Number(misses);

      return {
        hits: Number(hits),
        misses: Number(misses),
        hitRate: total === 0 ? 0 : (Number(hits) / total) * 100,
      };
    } catch {
      return { hits: 0, misses: 0, hitRate: 0 };
    }
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

export const cacheStats = new CacheStats();

/**
 * Wrap a function with caching
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached) {
    await cacheStats.recordHit();
    return cached;
  }

  // Cache miss - fetch fresh
  await cacheStats.recordMiss();
  const data = await fetcher();

  // Store in cache
  await cacheSet(key, data, ttl);

  return data;
}

/**
 * Health check - verify Redis connectivity
 */
export async function cacheHealthCheck(): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export default redis;
