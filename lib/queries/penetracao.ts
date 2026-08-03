import { createClient } from "@/lib/supabase/client";

export type PenetracaoNivel = "municipio" | "bairro";

export type PenetracaoRow = {
  nome: string;
  contexto: string;
  votos: number;
  total_territorio: number;
  penetracao: number;
  posicao_volume: number;
};

/**
 * Penetração = votos da campanha ÷ votos totais do cargo naquele território,
 * com o denominador vindo dos dados abertos do TSE.
 *
 * É a leitura que o ranking por volume não dá. Messejana lidera em votos e
 * também é forte (3,85%), mas Guajeru tem 5,86% e aparecia só em 17º — bairro
 * pequeno onde a campanha é dominante fica invisível quando se ordena por
 * volume.
 *
 * O corte de votos mínimos não é detalhe: sem ele, um território com 3 votos em
 * 20 eleitores encabeça o ranking com 15% e não significa nada.
 */
export async function fetchPenetracao(
  campanhaId: string,
  nivel: PenetracaoNivel,
  minVotos = 20,
  limite = 10,
): Promise<PenetracaoRow[]> {
  const supabase = createClient();
  // Ano e cargo do denominador saem da própria campanha (0038). Passá-los aqui
  // era o que permitia dividir votos de vereadora pelo total de deputado
  // federal e mostrar um número que não significava nada.
  const { data, error } = await supabase.rpc("fn_penetracao", {
    p_campanha_id: campanhaId,
    p_nivel: nivel,
    p_min_votos: minVotos,
    p_limite: limite,
  });

  if (error) {
    console.error("Erro ao buscar penetração:", error.message);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    nome: String(r.nome),
    contexto: String(r.contexto ?? ""),
    votos: Number(r.votos),
    total_territorio: Number(r.total_territorio),
    penetracao: Number(r.penetracao),
    posicao_volume: Number(r.posicao_volume),
  }));
}
