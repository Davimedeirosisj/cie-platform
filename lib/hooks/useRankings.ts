/**
 * SWR Hook for Rankings Data
 * Fase 2 Sprint 2: Caching Layer
 *
 * Similar to useTopItems but for full ranking tables
 * Caches rankings by nivel + campanhaId
 */

import useSWR from "swr";
import { fetchAllRankings } from "@/lib/queries/rankings-optimized";
import type { RankingRow } from "@/lib/queries/rankings-optimized";

export type RankingsData = {
  municipios: RankingRow[];
  bairros: RankingRow[];
  zonas: RankingRow[];
  secoes: RankingRow[];
};

/**
 * Hook: useRankings
 *
 * Fetches all ranking levels for a campaign
 * Maintains separate caches per campaign
 *
 * @param campanhaId - Campaign ID
 * @returns { data, isLoading, error, mutate }
 */
export function useRankings(campanhaId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RankingsData>(
    campanhaId ? `/api/rankings/${campanhaId}` : null,
    campanhaId ? async () => fetchAllRankings(campanhaId) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 120000, // 2 minute dedup (rankings update less frequently)
      focusThrottleInterval: 600000, // 10 minute focus revalidation
      errorRetryCount: 2,
      errorRetryInterval: 5000,
    }
  );

  return {
    data: data || {
      municipios: [],
      bairros: [],
      zonas: [],
      secoes: [],
    },
    isLoading,
    error,
    mutate,
  };
}
