import { createClient } from "@/lib/supabase/client";
import type { MetaNivel } from "@/lib/types/territorio";

export type MetaPlanejamentoRow = {
  territorio_id: string;
  nome: string;
  contexto: string;
  votos_base: number;
  total_territorio: number | null;
  penetracao: number | null;
  meta_atual: number | null;
};

export async function fetchMetasPlanejamento(
  campanhaMetaId: string,
  campanhaBaseId: string,
  nivel: MetaNivel,
  municipioId?: string | null,
): Promise<MetaPlanejamentoRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_metas_planejamento", {
    p_campanha_meta_id: campanhaMetaId,
    p_campanha_base_id: campanhaBaseId,
    p_nivel: nivel,
    p_municipio_id: municipioId ?? null,
  });

  if (error) {
    console.error("Erro ao carregar planejamento de metas:", error.message);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    territorio_id: String(r.territorio_id),
    nome: String(r.nome),
    contexto: String(r.contexto ?? ""),
    votos_base: Number(r.votos_base ?? 0),
    total_territorio: r.total_territorio == null ? null : Number(r.total_territorio),
    penetracao: r.penetracao == null ? null : Number(r.penetracao),
    meta_atual: r.meta_atual == null ? null : Number(r.meta_atual),
  }));
}

/**
 * Grava várias metas de uma vez.
 *
 * `valor: null` apaga a meta daquele território. Zero é meta legítima — "não
 * vamos disputar aqui" — então não pode significar "sem meta".
 */
export async function salvarMetasLote(
  campanhaId: string,
  nivel: MetaNivel,
  itens: { id: string; valor: number | null }[],
): Promise<{ salvas: number; erro: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_salvar_metas_lote", {
    p_campanha_id: campanhaId,
    p_nivel: nivel,
    p_itens: itens,
  });

  if (error) return { salvas: 0, erro: error.message };
  return { salvas: Number(data ?? 0), erro: null };
}
