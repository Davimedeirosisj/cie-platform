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

export async function fetchRankingMunicipios(campanhaId: string): Promise<RankingRow[]> {
  const supabase = createClient();
  const { data: ranking } = await supabase
    .from("vw_ranking_municipio")
    .select("municipio_id, total_votos, ranking")
    .eq("campanha_id", campanhaId)
    .order("ranking")
    .limit(LIMIT);
  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => r.municipio_id);
  const [{ data: municipios }, { data: metas }] = await Promise.all([
    supabase.from("municipios").select("id, nome").in("id", ids),
    supabase.from("metas").select("municipio_id, valor_meta").eq("campanha_id", campanhaId).eq("nivel", "municipio").in("municipio_id", ids),
  ]);
  const nomeById = new Map((municipios ?? []).map((m) => [m.id, m.nome]));
  const metaById = new Map((metas ?? []).map((m) => [m.municipio_id, m.valor_meta]));

  return ranking.map((r) => ({
    id: r.municipio_id,
    ranking: r.ranking,
    label: nomeById.get(r.municipio_id) ?? "—",
    votos: r.total_votos,
    meta: metaById.get(r.municipio_id) ?? null,
    href: `/municipios/${r.municipio_id}`,
  }));
}

export async function fetchRankingBairros(campanhaId: string): Promise<RankingRow[]> {
  const supabase = createClient();
  const { data: ranking } = await supabase
    .from("vw_ranking_bairro")
    .select("bairro_id, total_votos, ranking")
    .eq("campanha_id", campanhaId)
    .order("ranking")
    .limit(LIMIT);
  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => r.bairro_id);
  const [{ data: bairros }, { data: metas }] = await Promise.all([
    supabase.from("bairros").select("id, nome, municipios(nome)").in("id", ids),
    supabase.from("metas").select("bairro_id, valor_meta").eq("campanha_id", campanhaId).eq("nivel", "bairro").in("bairro_id", ids),
  ]);
  const infoById = new Map(
    (bairros ?? []).map((b) => [
      b.id,
      { nome: b.nome, municipio: (b.municipios as unknown as { nome: string } | null)?.nome },
    ]),
  );
  const metaById = new Map((metas ?? []).map((m) => [m.bairro_id, m.valor_meta]));

  return ranking.map((r) => ({
    id: r.bairro_id,
    ranking: r.ranking,
    label: infoById.get(r.bairro_id)?.nome ?? "—",
    sublabel: infoById.get(r.bairro_id)?.municipio,
    votos: r.total_votos,
    meta: metaById.get(r.bairro_id) ?? null,
    href: `/bairros/${r.bairro_id}`,
  }));
}

export async function fetchRankingZonas(campanhaId: string): Promise<RankingRow[]> {
  const supabase = createClient();
  const { data: ranking } = await supabase
    .from("vw_ranking_zona")
    .select("zona_id, total_votos, ranking")
    .eq("campanha_id", campanhaId)
    .order("ranking")
    .limit(LIMIT);
  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => r.zona_id);
  const [{ data: zonas }, { data: metas }] = await Promise.all([
    supabase.from("zonas").select("id, numero_zona").in("id", ids),
    supabase.from("metas").select("zona_id, valor_meta").eq("campanha_id", campanhaId).eq("nivel", "zona").in("zona_id", ids),
  ]);
  const numeroById = new Map((zonas ?? []).map((z) => [z.id, z.numero_zona]));
  const metaById = new Map((metas ?? []).map((m) => [m.zona_id, m.valor_meta]));

  return ranking.map((r) => ({
    id: r.zona_id,
    ranking: r.ranking,
    label: `Zona ${numeroById.get(r.zona_id) ?? "—"}`,
    votos: r.total_votos,
    meta: metaById.get(r.zona_id) ?? null,
    href: `/zonas/${r.zona_id}`,
  }));
}

export async function fetchRankingSecoes(campanhaId: string): Promise<RankingRow[]> {
  const supabase = createClient();
  const { data: ranking } = await supabase
    .from("vw_ranking_secao")
    .select("secao_id, total_votos, ranking")
    .eq("campanha_id", campanhaId)
    .order("ranking")
    .limit(LIMIT);
  if (!ranking || ranking.length === 0) return [];

  const ids = ranking.map((r) => r.secao_id);
  const [{ data: secoes }, { data: metas }] = await Promise.all([
    supabase.from("secoes").select("id, numero_secao, local_votacao").in("id", ids),
    supabase.from("metas").select("secao_id, valor_meta").eq("campanha_id", campanhaId).eq("nivel", "secao").in("secao_id", ids),
  ]);
  const infoById = new Map((secoes ?? []).map((s) => [s.id, s]));
  const metaById = new Map((metas ?? []).map((m) => [m.secao_id, m.valor_meta]));

  return ranking.map((r) => ({
    id: r.secao_id,
    ranking: r.ranking,
    label: `Seção ${infoById.get(r.secao_id)?.numero_secao ?? "—"}`,
    sublabel: infoById.get(r.secao_id)?.local_votacao ?? undefined,
    votos: r.total_votos,
    meta: metaById.get(r.secao_id) ?? null,
    href: `/secoes/${r.secao_id}`,
  }));
}

export const RANKING_FETCHERS: Record<MetaNivel, (campanhaId: string) => Promise<RankingRow[]>> = {
  municipio: fetchRankingMunicipios,
  bairro: fetchRankingBairros,
  zona: fetchRankingZonas,
  secao: fetchRankingSecoes,
};
