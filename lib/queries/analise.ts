import { createClient } from "@/lib/supabase/client";

/**
 * Reading of how a campaign's vote is spread. Everything here is derived from
 * the data at query time, so an import immediately changes the conclusion --
 * no figure is written by hand.
 */
export type AnaliseCampanha = {
  total_votos: number;
  secoes_com_voto: number;
  media_por_secao: number;
  maior_secao: number;
  secoes_para_50pct: number;
  secoes_10_ou_mais: number;
  municipios_com_voto: number;
  municipios_para_80pct: number;
  top_municipio: string | null;
  top_municipio_pct: number | null;
};

export type RetencaoBairro = {
  bairro_id: string;
  nome: string;
  votos_base: number;
  votos_recente: number;
  retencao_pct: number;
};

export async function fetchAnaliseCampanha(
  campanhaId: string,
): Promise<AnaliseCampanha | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("fn_analise_campanha", { p_campanha_id: campanhaId })
    .single();

  if (error) {
    console.error("[fetchAnaliseCampanha]", error.message);
    return null;
  }
  return data as AnaliseCampanha;
}

export async function fetchRetencaoBairros(
  campanhaBase: string,
  campanhaRecente: string,
  municipioId: string | null,
): Promise<RetencaoBairro[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_analise_retencao", {
    p_campanha_base: campanhaBase,
    p_campanha_recente: campanhaRecente,
    p_municipio_id: municipioId,
  });

  if (error) {
    console.error("[fetchRetencaoBairros]", error.message);
    return [];
  }
  return (data ?? []) as RetencaoBairro[];
}

/**
 * Turns the numbers into a sentence. The thresholds are what make this survive
 * new data: a campaign that builds real strongholds crosses them and the
 * reading changes, rather than the dashboard repeating a conclusion that was
 * true for one import.
 */
export function lerDispersao(a: AnaliseCampanha): {
  titulo: string;
  texto: string;
  tom: "alerta" | "neutro" | "bom";
} {
  if (a.secoes_com_voto === 0) {
    return {
      titulo: "Sem votos por seção",
      texto:
        "Esta campanha ainda não tem votos gravados no nível de seção. Importe uma planilha com zona e seção para ver a análise de dispersão.",
      tom: "neutro",
    };
  }

  const media = Number(a.media_por_secao);
  const pctFortes = (a.secoes_10_ou_mais / a.secoes_com_voto) * 100;

  if (media < 5 && pctFortes < 10) {
    return {
      titulo: "Voto disperso, sem redutos",
      texto:
        `A votação está espalhada por ${a.secoes_com_voto.toLocaleString("pt-BR")} seções, ` +
        `com média de ${media} votos em cada e apenas ${a.secoes_10_ou_mais.toLocaleString("pt-BR")} ` +
        `seções acima de 10 votos. São necessárias ${a.secoes_para_50pct.toLocaleString("pt-BR")} seções ` +
        `para somar metade da votação. Esse perfil indica voto vindo de rede pessoal, não de território ` +
        `organizado — mobilização por local de votação tende a não se pagar.`,
      tom: "alerta",
    };
  }

  if (media >= 15 || pctFortes >= 30) {
    return {
      titulo: "Voto concentrado em redutos",
      texto:
        `Média de ${media} votos por seção e ${a.secoes_10_ou_mais.toLocaleString("pt-BR")} seções ` +
        `acima de 10 votos. Metade da votação sai de apenas ${a.secoes_para_50pct.toLocaleString("pt-BR")} seções — ` +
        `há território consolidado, onde estrutura física no dia da eleição se paga.`,
      tom: "bom",
    };
  }

  return {
    titulo: "Concentração intermediária",
    texto:
      `Média de ${media} votos por seção, com ${a.secoes_10_ou_mais.toLocaleString("pt-BR")} seções ` +
      `acima de 10 votos. Metade da votação vem de ${a.secoes_para_50pct.toLocaleString("pt-BR")} seções. ` +
      `Há núcleos formados, mas boa parte do voto ainda é pulverizada.`,
    tom: "neutro",
  };
}

export function lerConcentracao(a: AnaliseCampanha): string | null {
  if (!a.top_municipio || a.municipios_com_voto === 0) return null;

  const resto = a.municipios_com_voto - a.municipios_para_80pct;
  return (
    `${a.top_municipio} concentra ${a.top_municipio_pct}% da votação. ` +
    `${a.municipios_para_80pct} ${a.municipios_para_80pct === 1 ? "município responde" : "municípios respondem"} ` +
    `por 80% do total` +
    (resto > 0
      ? `, enquanto os outros ${resto.toLocaleString("pt-BR")} somam o restante.`
      : `.`)
  );
}
