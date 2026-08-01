import { createClient } from "@/lib/supabase/client";

// Top-N per-level fetchers live in dashboard-optimized.ts (used via the
// useTopItems hook); this file keeps the campaign-wide aggregates that
// aren't part of that batch.

export async function fetchTotalVotosPorCampanha(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("vw_votos_municipio").select("campanha_id, total_votos");
  if (error) console.error("[fetchTotalVotosPorCampanha]", error);
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    totals[row.campanha_id] = (totals[row.campanha_id] ?? 0) + row.total_votos;
  }
  return totals;
}

export async function fetchMetaTotalMunicipio(campanhaMetaId: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("metas")
    .select("valor_meta")
    .eq("campanha_id", campanhaMetaId)
    .eq("nivel", "municipio");
  return (data ?? []).reduce((sum, m) => sum + m.valor_meta, 0);
}

export type ComparacaoRow = {
  territorio_id: string;
  votos_a: number;
  votos_b: number;
  variacao_absoluta: number;
  variacao_percentual: number | null;
};

export async function fetchComparacaoMunicipios(
  campanhaAId: string,
  campanhaBId: string,
): Promise<(ComparacaoRow & { nome: string })[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("fn_comparar_campanhas", {
    p_nivel: "municipio",
    p_campanha_a: campanhaAId,
    p_campanha_b: campanhaBId,
  });
  const rows = (data ?? []) as ComparacaoRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.territorio_id);
  const { data: municipios } = await supabase.from("municipios").select("id, nome").in("id", ids);
  const nomeById = new Map((municipios ?? []).map((m) => [m.id, m.nome]));

  return rows.map((r) => ({ ...r, nome: nomeById.get(r.territorio_id) ?? "—" }));
}
