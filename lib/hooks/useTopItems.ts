/**
 * SWR Hook for Dashboard Top Items
 * Fase 2 Sprint 2: Caching Layer
 *
 * BEFORE: fetchAllTopItems() called fresh each time
 * AFTER: Automatic cache + background revalidation
 *
 * Features:
 * - Shared cache across components (no dupes)
 * - Stale-while-revalidate strategy
 * - Auto-revalidate on campaign change
 * - Manual refresh via mutate()
 */

import useSWR from "swr";
import { fetchAllTopItems } from "@/lib/queries/dashboard-optimized";
import type { TopItem } from "@/lib/queries/dashboard-optimized";

export type TopItemsData = {
  municipios: TopItem[];
  bairros: TopItem[];
  zonas: TopItem[];
  secoes: TopItem[];
};

/**
 * Hook: useTopItems
 *
 * @param campanhaId - Campaign ID to fetch for
 * @param limit - Max items per category (default: 5)
 * @returns { data, isLoading, error, mutate }
 */
export function useTopItems(campanhaId: string | null, limit = 5) {
  const { data, error, isLoading, mutate } = useSWR<TopItemsData>(
    campanhaId ? `${campanhaId}/${limit}` : null,
    campanhaId ? async () => fetchAllTopItems(campanhaId, limit) : null,
    {
      // Stale-while-revalidate: serve stale data while fetching fresh
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute dedup window
      focusThrottleInterval: 300000, // 5 minute focus revalidation
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
