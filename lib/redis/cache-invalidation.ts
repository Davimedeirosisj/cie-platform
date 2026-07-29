/**
 * Cache Invalidation Strategy - Fase 3 Sprint 2
 *
 * Centralized cache busting when data changes
 * Prevents stale data while maintaining cache benefits
 *
 * Invalidation triggers:
 * 1. Vote import completion
 * 2. Manual vote entry/update
 * 3. Goal (meta) creation/update
 * 4. Territory changes
 * 5. Campaign status change
 */

import { cacheDeletePattern, cacheClearCampaign } from "@/lib/redis/redis-client";

/**
 * Invalidate rankings when votes change
 *
 * Called by: importacao.ts (runImport), votos actions
 */
export async function invalidateRankingsOnVoteChange(campanhaId: string): Promise<number> {
  console.log(`[Cache] Invalidating rankings for campaign ${campanhaId}`);

  return cacheDeletePattern(`ranking:${campanhaId}:*`);
}

/**
 * Invalidate top items when votes change
 *
 * Called by: importacao.ts (runImport), votos actions
 */
export async function invalidateTopItemsOnVoteChange(campanhaId: string): Promise<number> {
  console.log(`[Cache] Invalidating top items for campaign ${campanhaId}`);

  return cacheDeletePattern(`top:${campanhaId}:*`);
}

/**
 * Invalidate metas when goals change
 *
 * Called by: metas.ts (createMeta, updateMeta, deleteMeta)
 */
export async function invalidateMetasOnChange(campanhaId: string): Promise<number> {
  console.log(`[Cache] Invalidating metas for campaign ${campanhaId}`);

  return cacheDeletePattern(`metas:${campanhaId}:*`);
}

/**
 * Complete cascade invalidation for campaign
 *
 * Called by:
 * - Import completion
 * - Campaign status change
 * - Manual data correction
 */
export async function invalidateCampaignFull(campanhaId: string): Promise<number> {
  console.log(`[Cache] Full invalidation for campaign ${campanhaId}`);

  return cacheClearCampaign(campanhaId);
}

/**
 * Invalidate when territory structure changes
 *
 * Called by: territorio.ts (create/update/delete municipio, bairro, etc)
 */
export async function invalidateTerritoryCache(campanhaId: string): Promise<number> {
  console.log(`[Cache] Invalidating territory cache for campaign ${campanhaId}`);

  // Clear rankings and aggregations that depend on territory structure
  return cacheDeletePattern(`ranking:${campanhaId}:*`);
}

/**
 * Strategic cache invalidation based on change type
 *
 * Minimizes cache busting - only clear affected data
 */
export async function invalidateCacheByChangeType(
  changeType: "vote" | "meta" | "territory" | "campaign",
  campanhaId: string
): Promise<number> {
  switch (changeType) {
    case "vote":
      // Votes affect rankings and top items
      const r = await invalidateRankingsOnVoteChange(campanhaId);
      const t = await invalidateTopItemsOnVoteChange(campanhaId);
      return r + t;

    case "meta":
      // Metas are independent
      return invalidateMetasOnChange(campanhaId);

    case "territory":
      // Territory changes affect all aggregations
      return invalidateTerritoryCache(campanhaId);

    case "campaign":
      // Campaign status changes require full invalidation
      return invalidateCampaignFull(campanhaId);

    default:
      return 0;
  }
}

/**
 * Prefetch cache on campaign load
 *
 * Warm up cache with commonly accessed data
 * Called when user selects campaign
 */
export async function prefetchCampaignCache(campanhaId: string): Promise<void> {
  // Note: This is optional - cache will populate on first request
  // Implement if you want to proactively load data
  console.log(`[Cache] Ready to prefetch campaign ${campanhaId}`);
  // Could fetch rankings, metas, top items here
}

/**
 * Clear all application cache
 *
 * Used for maintenance, debugging, or complete cache reset
 */
export async function clearAllCache(): Promise<void> {
  console.warn("[Cache] Clearing ALL cache - this may cause temporary slowness");

  // Delete all app cache keys
  const patterns = ["ranking:*", "top:*", "metas:*", "rankings_all:*", "top_all:*"];

  for (const pattern of patterns) {
    await cacheDeletePattern(pattern);
  }
}
