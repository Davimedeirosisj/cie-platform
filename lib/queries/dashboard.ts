import { createClient } from "@/lib/supabase/client";

export type TopItem = { id: string; label: string; sublabel?: string; votos: number; href: string };

export async function fetchTopMunicipios(campanhaId: string, limit = 5): Promise<TopItem[]> {
  const supabase = createClient();
  const { data: ranking } = await supabase
    .from("vw_ranking_municipio")
    .select("municipio_id, total_votos")
    .eq("campanha_id", campanhaId)
    .order("total_votos", { ascending: false })
    .limit(limit);
  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => r.municipio_id);
  const { data: municipios } = await supabase.from("municipios").select("id, nome").in("id", ids);
  const nomeById = new Map((municipios ?? []).map((m) => [m.id, m.nome]));

  return ranking.map((r) => ({
    id: r.municipio_id,
    label: nomeById.get(r.municipio_id) ?? "—",
    votos: r.total_votos,
    href: `/municipios/${r.municipio_id}`,
  }));
}

export async function fetchTopBairros(campanhaId: string, limit = 5): Promise<TopItem[]> {
  const supabase = createClient();
  const { data: ranking } = await supabase
    .from("vw_ranking_bairro")
    .select("bairro_id, total_votos")
    .eq("campanha_id", campanhaId)
    .order("total_votos", { ascending: false })
    .limit(limit);
  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => r.bairro_id);
  const { data: bairros } = await supabase
    .from("bairros")
    .select("id, nome, municipios(nome)")
    .in("id", ids);
  const infoById = new Map(
    (bairros ?? []).map((b) => [
      b.id,
      { nome: b.nome, municipio: (b.municipios as unknown as { nome: string } | null)?.nome },
    ]),
  );

  return ranking.map((r) => ({
    id: r.bairro_id,
    label: infoById.get(r.bairro_id)?.nome ?? "—",
    sublabel: infoById.get(r.bairro_id)?.municipio,
    votos: r.total_votos,
    href: `/bairros/${r.bairro_id}`,
  }));
}

export async function fetchTopZonas(campanhaId: string, limit = 5): Promise<TopItem[]> {
  const supabase = createClient();
  const { data: ranking } = await supabase
    .from("vw_ranking_zona")
    .select("zona_id, total_votos")
    .eq("campanha_id", campanhaId)
    .order("total_votos", { ascending: false })
    .limit(limit);
  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => r.zona_id);
  const { data: zonas } = await supabase.from("zonas").select("id, numero_zona").in("id", ids);
  const numeroById = new Map((zonas ?? []).map((z) => [z.id, z.numero_zona]));

  return ranking.map((r) => ({
    id: r.zona_id,
    label: `Zona ${numeroById.get(r.zona_id) ?? "—"}`,
    votos: r.total_votos,
    href: `/zonas/${r.zona_id}`,
  }));
}

export async function fetchTopSecoes(campanhaId: string, limit = 5): Promise<TopItem[]> {
  const supabase = createClient();
  const { data: votos } = await supabase
    .from("votos_secao")
    .select("secao_id, quantidade_votos")
    .eq("campanha_id", campanhaId)
    .order("quantidade_votos", { ascending: false })
    .limit(limit);
  if (!votos || votos.length === 0) return [];

  const ids = votos.map((v) => v.secao_id);
  const { data: secoes } = await supabase
    .from("secoes")
    .select("id, numero_secao, local_votacao")
    .in("id", ids);
  const infoById = new Map((secoes ?? []).map((s) => [s.id, s]));

  return votos.map((v) => ({
    id: v.secao_id,
    label: `Seção ${infoById.get(v.secao_id)?.numero_secao ?? "—"}`,
    sublabel: infoById.get(v.secao_id)?.local_votacao ?? undefined,
    votos: v.quantidade_votos,
    href: `/secoes/${v.secao_id}`,
  }));
}

export async function fetchTotalVotosPorCampanha(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data } = await supabase.from("vw_votos_municipio").select("campanha_id, total_votos");
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
