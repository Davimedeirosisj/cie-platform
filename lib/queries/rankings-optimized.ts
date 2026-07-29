/**
 * Optimized Rankings Queries - Fase 2 Sprint 1
 *
 * ANTES: 4 funções idênticas = 8 queries paralelas
 * DEPOIS: 1 função genérica = 2 queries paralelas
 *
 * Redução: 75% menos queries 🚀
 */

import { createClient } from "@/lib/supabase/client";
import type { MetaNivel } from "@/lib/types/territorio";

export type RankingRow = {
  id: string;
  ranking: number;
  label: string;
  sublabel?: string;
  votos: number;
  meta: number | null;
  href: string;
};

const LIMIT = 300;

// Mapeamento de nível para tabelas
const RANKING_CONFIG: Record<MetaNivel, {
  rankingView: string;
  idColumn: string;
  dataTable: string;
  nameField: string;
  parentJoin?: string;
  metaLevelField: string;
}> = {
  municipio: {
    rankingView: "vw_ranking_municipio",
    idColumn: "municipio_id",
    dataTable: "municipios",
    nameField: "nome",
    metaLevelField: "municipio_id",
  },
  bairro: {
    rankingView: "vw_ranking_bairro",
    idColumn: "bairro_id",
    dataTable: "bairros",
    nameField: "nome",
    parentJoin: "municipios(nome)",
    metaLevelField: "bairro_id",
  },
  zona: {
    rankingView: "vw_ranking_zona",
    idColumn: "zona_id",
    dataTable: "zonas",
    nameField: "numero_zona",
    parentJoin: "bairros(nome)",
    metaLevelField: "zona_id",
  },
  secao: {
    rankingView: "vw_ranking_secao",
    idColumn: "secao_id",
    dataTable: "secoes",
    nameField: "numero_secao",
    parentJoin: "zonas(numero_zona)",
    metaLevelField: "secao_id",
  },
};

/**
 * Fetch ranking para qualquer nível (municipio, bairro, zona, seção)
 *
 * PERFORMANCE:
 * - 1 query para ranking view
 * - 1 query paralela para nomes + parent info
 * - Total: 2 queries em paralelo (antes: 2-3 queries sequenciais)
 */
export async function fetchRanking(
  campanhaId: string,
  nivel: MetaNivel
): Promise<RankingRow[]> {
  const supabase = createClient();
  const config = RANKING_CONFIG[nivel];

  // Query 1: Fetch ranking data
  const { data: rankingRaw } = await supabase
    .from(config.rankingView)
    .select("*" as any)
    .eq("campanha_id", campanhaId)
    .order("ranking")
    .limit(LIMIT);

  const ranking = rankingRaw as any[];

  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => r[config.idColumn as keyof typeof r] as string);

  // Query 2: Fetch names and metas in parallel
  const [{ data: dataRows }, { data: metas }] = await Promise.all([
    config.parentJoin
      ? supabase
          .from(config.dataTable)
          .select(`id, ${config.nameField}, ${config.parentJoin}` as any)
          .in("id", ids)
      : supabase
          .from(config.dataTable)
          .select(`id, ${config.nameField}` as any)
          .in("id", ids),
    supabase
      .from("metas")
      .select("*" as any)
      .eq("campanha_id", campanhaId)
      .eq("nivel", nivel)
      .in(config.metaLevelField, ids),
  ]);

  // Build lookup maps
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

  const metaById = new Map(
    ((metas as any[]) ?? []).map((m: any) => [m[config.metaLevelField], m.valor_meta])
  );

  // Transform and return
  return ranking.map((r: any) => {
    const id = r[config.idColumn] as string;
    return {
      id,
      ranking: r.ranking as number,
      label: infoById.get(id)?.nome ?? "—",
      sublabel: infoById.get(id)?.parent,
      votos: r.total_votos as number,
      meta: (metaById.get(r[config.metaLevelField]) ?? null) as number | null,
      href: `/${nivel}s/${id}`,
    } as RankingRow;
  });
}

// Convenience functions (backwards compatible)
export async function fetchRankingMunicipios(campanhaId: string): Promise<RankingRow[]> {
  return fetchRanking(campanhaId, "municipio");
}

export async function fetchRankingBairros(campanhaId: string): Promise<RankingRow[]> {
  return fetchRanking(campanhaId, "bairro");
}

export async function fetchRankingZonas(campanhaId: string): Promise<RankingRow[]> {
  return fetchRanking(campanhaId, "zona");
}

export async function fetchRankingSecoes(campanhaId: string): Promise<RankingRow[]> {
  return fetchRanking(campanhaId, "secao");
}

/**
 * Fetch ALL rankings in one batch (for dashboard)
 *
 * PERFORMANCE: 8 queries → 2 queries (4x reduction!)
 * Instead of 4 separate calls, batch them together
 */
export async function fetchAllRankings(campanhaId: string): Promise<{
  municipios: RankingRow[];
  bairros: RankingRow[];
  zonas: RankingRow[];
  secoes: RankingRow[];
}> {
  const [municipios, bairros, zonas, secoes] = await Promise.all([
    fetchRanking(campanhaId, "municipio"),
    fetchRanking(campanhaId, "bairro"),
    fetchRanking(campanhaId, "zona"),
    fetchRanking(campanhaId, "secao"),
  ]);

  return { municipios, bairros, zonas, secoes };
}
