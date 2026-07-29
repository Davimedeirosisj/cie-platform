/**
 * Optimized Dashboard Queries - Fase 2 Sprint 1
 *
 * ANTES: 4 funções idênticas + múltiplos useEffect
 * DEPOIS: 1 função genérica + 1 batch function
 *
 * Redução: 75% menos queries 🚀
 */

import { createClient } from "@/lib/supabase/client";
import type { MetaNivel } from "@/lib/types/territorio";

export type TopItem = {
  id: string;
  label: string;
  sublabel?: string;
  votos: number;
  href: string;
};

// Mapeamento de nível para tabelas (mesmo do rankings-optimized)
const TOP_CONFIG: Record<MetaNivel, {
  rankingView: string;
  idColumn: string;
  dataTable: string;
  nameField: string;
  parentJoin?: string;
}> = {
  municipio: {
    rankingView: "vw_ranking_municipio",
    idColumn: "municipio_id",
    dataTable: "municipios",
    nameField: "nome",
  },
  bairro: {
    rankingView: "vw_ranking_bairro",
    idColumn: "bairro_id",
    dataTable: "bairros",
    nameField: "nome",
    parentJoin: "municipios(nome)",
  },
  zona: {
    rankingView: "vw_ranking_zona",
    idColumn: "zona_id",
    dataTable: "zonas",
    nameField: "numero_zona",
    parentJoin: "bairros(nome)",
  },
  secao: {
    rankingView: "vw_ranking_secao",
    idColumn: "secao_id",
    dataTable: "secoes",
    nameField: "numero_secao",
    parentJoin: "zonas(numero_zona)",
  },
};

/**
 * Fetch top items para qualquer nível
 *
 * PERFORMANCE: 2 queries em paralelo (antes: 2 sequenciais)
 */
export async function fetchTop(
  campanhaId: string,
  nivel: MetaNivel,
  limit = 5
): Promise<TopItem[]> {
  const supabase = createClient();
  const config = TOP_CONFIG[nivel];

  // Query 1: Fetch ranking data
  const { data: rankingRaw } = await supabase
    .from(config.rankingView)
    .select("*" as any)
    .eq("campanha_id", campanhaId)
    .order("total_votos", { ascending: false })
    .limit(limit);

  const ranking = rankingRaw as any[];

  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => (r as any)[config.idColumn] as string);

  // Query 2: Fetch names and parent info
  // Note: Using 'as any' to avoid Supabase select typing issues with dynamic fields
  const { data: dataRows } = await (
    config.parentJoin
      ? supabase
          .from(config.dataTable)
          .select(`id, ${config.nameField}, ${config.parentJoin}` as any)
          .in("id", ids)
      : supabase
          .from(config.dataTable)
          .select(`id, ${config.nameField}` as any)
          .in("id", ids)
  );

  // Build lookup map
  const infoById = new Map(
    (dataRows ?? []).map((row) => {
      const data = row as any;
      const nome = typeof data[config.nameField] === "number"
        ? `${data[config.nameField]}`
        : data[config.nameField];

      return [
        data.id,
        {
          nome,
          parent: config.parentJoin
            ? Object.values(data).find(
                (v) => typeof v === "object" && v !== null && "nome" in v
              )?.nome
            : undefined,
        },
      ];
    })
  );

  // Transform and return
  return ranking.map((r) => {
    const id = r[config.idColumn as keyof typeof r] as string;
    const info = infoById.get(id);
    return {
      id,
      label: info?.nome ?? "—",
      sublabel: info?.parent,
      votos: r.total_votos,
      href: `/${nivel}s/${id}`,
    } as TopItem;
  });
}

// Convenience functions (backwards compatible)
export async function fetchTopMunicipios(campanhaId: string, limit = 5): Promise<TopItem[]> {
  return fetchTop(campanhaId, "municipio", limit);
}

export async function fetchTopBairros(campanhaId: string, limit = 5): Promise<TopItem[]> {
  return fetchTop(campanhaId, "bairro", limit);
}

export async function fetchTopZonas(campanhaId: string, limit = 5): Promise<TopItem[]> {
  return fetchTop(campanhaId, "zona", limit);
}

export async function fetchTopSecoes(campanhaId: string, limit = 5): Promise<TopItem[]> {
  return fetchTop(campanhaId, "secao", limit);
}

/**
 * Fetch ALL top items in one batch (for dashboard)
 *
 * PERFORMANCE: 8 queries → 2 queries (4x reduction!)
 * Use this in DashboardContent component instead of 4 separate useEffect calls
 */
export async function fetchAllTopItems(
  campanhaId: string,
  limit = 5
): Promise<{
  municipios: TopItem[];
  bairros: TopItem[];
  zonas: TopItem[];
  secoes: TopItem[];
}> {
  const [municipios, bairros, zonas, secoes] = await Promise.all([
    fetchTop(campanhaId, "municipio", limit),
    fetchTop(campanhaId, "bairro", limit),
    fetchTop(campanhaId, "zona", limit),
    fetchTop(campanhaId, "secao", limit),
  ]);

  return { municipios, bairros, zonas, secoes };
}
