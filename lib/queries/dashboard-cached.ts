/**
 * Cached Dashboard Queries - Fase 3 Sprint 2
 *
 * Wraps dashboard-optimized.ts with Redis caching
 * Caches top items per campaign with intelligent invalidation
 */

import { fetchTop, fetchAllTopItems, TopItem } from "@/lib/queries/dashboard-optimized";
import { withCache, cacheDeletePattern } from "@/lib/redis/redis-client";
import type { MetaNivel } from "@/lib/types/territorio";

export type TopItemsData = {
  municipios: TopItem[];
  bairros: TopItem[];
  zonas: TopItem[];
  secoes: TopItem[];
};

/**
 * Get top items for a level with Redis caching
 *
 * Cache key: top:campanhaId:nivel:limit
 * TTL: 5 minutes
 */
export async function fetchTopCached(
  campanhaId: string,
  nivel: MetaNivel,
  limit = 5
): Promise<TopItem[]> {
  const cacheKey = `top:${campanhaId}:${nivel}:${limit}`;

  return withCache(cacheKey, () => fetchTop(campanhaId, nivel, limit), 300);
}

/**
 * Get all top items for dashboard with caching
 *
 * Single cache entry for entire dashboard view
 * Much faster than 4 separate queries
 */
export async function fetchAllTopItemsCached(
  campanhaId: string,
  limit = 5
): Promise<TopItemsData> {
  const cacheKey = `top_all:${campanhaId}:${limit}`;

  return withCache(
    cacheKey,
    async () => {
      const result = await fetchAllTopItems(campanhaId, limit);
      return result;
    },
    300 // 5 minutes
  );
}

/**
 * Invalidate top items cache
 */
export async function invalidateTopItemsCache(campanhaId: string): Promise<number> {
  // Delete all top item keys for this campaign
  return cacheDeletePattern(`top:${campanhaId}:*`);
}

/**
 * Convenience exports matching original API
 */
export async function fetchTopMunicipiosCached(campanhaId: string, limit = 5): Promise<TopItem[]> {
  return fetchTopCached(campanhaId, "municipio", limit);
}

export async function fetchTopBairrosCached(campanhaId: string, limit = 5): Promise<TopItem[]> {
  return fetchTopCached(campanhaId, "bairro", limit);
}

export async function fetchTopZonasCached(campanhaId: string, limit = 5): Promise<TopItem[]> {
  return fetchTopCached(campanhaId, "zona", limit);
}

export async function fetchTopSecoesCached(campanhaId: string, limit = 5): Promise<TopItem[]> {
  return fetchTopCached(campanhaId, "secao", limit);
}
