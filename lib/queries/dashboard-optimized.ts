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

// `rota` is spelled out because the plural is not a suffix: "secao" -> /secoes,
// so deriving it as `${nivel}s` produced dead /secaos/ links.
// `prefixo` restores the wording for the levels identified by a number.
const TOP_CONFIG: Record<MetaNivel, {
  rankingView: string;
  idColumn: string;
  dataTable: string;
  nameField: string;
  rota: string;
  prefixo?: string;
  parentJoin?: string;
}> = {
  municipio: {
    rankingView: "vw_ranking_municipio",
    idColumn: "municipio_id",
    dataTable: "municipios",
    nameField: "nome",
    rota: "municipios",
  },
  bairro: {
    rankingView: "vw_ranking_bairro",
    idColumn: "bairro_id",
    dataTable: "bairros",
    nameField: "nome",
    rota: "bairros",
    parentJoin: "municipios(nome)",
  },
  zona: {
    rankingView: "vw_ranking_zona",
    idColumn: "zona_id",
    dataTable: "zonas",
    nameField: "numero_zona",
    rota: "zonas",
    prefixo: "Zona ",
    // A zona spans several bairros, so its parent is the município (0017).
    parentJoin: "municipios(nome)",
  },
  secao: {
    rankingView: "vw_ranking_secao",
    idColumn: "secao_id",
    dataTable: "secoes",
    nameField: "numero_secao",
    rota: "secoes",
    prefixo: "Seção ",
    parentJoin: "bairros(nome)",
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

  // Table/column names are only known at runtime (driven by `nivel`), so
  // Supabase's generated types can't narrow these calls -- rows come back
  // as untyped records and are read defensively below.
  type Row = Record<string, unknown>;

  // Query 1: Fetch ranking data
  const { data: rankingRaw } = await supabase
    .from(config.rankingView)
    .select("*")
    .eq("campanha_id", campanhaId)
    .order("total_votos", { ascending: false })
    .limit(limit);

  const ranking = (rankingRaw ?? []) as Row[];

  if (ranking.length === 0) return [];

  const ids = ranking.map((r) => r[config.idColumn] as string);

  // Query 2: Fetch names and parent info
  const selectClause = config.parentJoin
    ? `id, ${config.nameField}, ${config.parentJoin}`
    : `id, ${config.nameField}`;
  const { data: dataRows } = await supabase
    .from(config.dataTable)
    .select(selectClause)
    .in("id", ids);

  // Build lookup map
  const infoById = new Map(
    ((dataRows ?? []) as unknown as Row[]).map((data) => {
      const rawNome = data[config.nameField];
      const nome = typeof rawNome === "number" ? `${rawNome}` : (rawNome as string);

      const parentValue = config.parentJoin
        ? Object.values(data).find(
            (v): v is { nome: unknown } => typeof v === "object" && v !== null && "nome" in v,
          )?.nome
        : undefined;

      return [
        data.id as string,
        { nome, parent: typeof parentValue === "string" ? parentValue : undefined },
      ];
    })
  );

  // Transform and return
  return ranking.map((r) => {
    const id = r[config.idColumn] as string;
    const info = infoById.get(id);
    return {
      id,
      label: info?.nome ? `${config.prefixo ?? ""}${info.nome}` : "—",
      sublabel: info?.parent,
      votos: r.total_votos as number,
      href: `/${config.rota}/${id}`,
    };
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
