import { describe, expect, it } from "vitest";
import { lerConcentracao, lerDispersao } from "./analise";
import type { AnaliseCampanha } from "./analise";

function analise(over: Partial<AnaliseCampanha> = {}): AnaliseCampanha {
  return {
    total_votos: 29323,
    secoes_com_voto: 8859,
    media_por_secao: 3.3,
    maior_secao: 29,
    secoes_para_50pct: 1831,
    secoes_10_ou_mais: 399,
    municipios_com_voto: 166,
    municipios_para_80pct: 4,
    top_municipio: "FORTALEZA",
    top_municipio_pct: 63.9,
    ...over,
  };
}

// The dashboard states a conclusion, not just numbers. These thresholds are
// what let that conclusion change as data arrives instead of repeating a
// reading that was true for one import.
describe("lerDispersao", () => {
  it("lê a campanha real de 2022 como voto disperso", () => {
    const r = lerDispersao(analise());
    expect(r.tom).toBe("alerta");
    expect(r.titulo).toMatch(/disperso/i);
    expect(r.texto).toContain("8.859");
  });

  it("muda a leitura quando a campanha constrói redutos", () => {
    const r = lerDispersao(
      analise({ media_por_secao: 22, secoes_10_ou_mais: 700, secoes_para_50pct: 120 }),
    );
    expect(r.tom).toBe("bom");
    expect(r.titulo).toMatch(/concentrado/i);
  });

  it("reconhece o caso intermediário", () => {
    const r = lerDispersao(
      analise({ media_por_secao: 8, secoes_10_ou_mais: 1500, secoes_para_50pct: 900 }),
    );
    expect(r.tom).toBe("neutro");
    expect(r.titulo).toMatch(/intermediária/i);
  });

  it("não inventa leitura quando não há voto por seção", () => {
    const r = lerDispersao(analise({ secoes_com_voto: 0, media_por_secao: 0 }));
    expect(r.tom).toBe("neutro");
    expect(r.texto).toMatch(/importe uma planilha/i);
  });
});

describe("lerConcentracao", () => {
  it("descreve a concentração geográfica", () => {
    const texto = lerConcentracao(analise());
    expect(texto).toContain("FORTALEZA");
    expect(texto).toContain("63.9%");
    expect(texto).toContain("162"); // 166 - 4 restantes
  });

  it("concorda no singular quando um município responde por 80%", () => {
    const texto = lerConcentracao(
      analise({ municipios_com_voto: 1, municipios_para_80pct: 1, top_municipio_pct: 100 }),
    );
    expect(texto).toContain("1 município responde");
    expect(texto).not.toContain("respondem");
  });

  it("devolve nulo sem dados", () => {
    expect(lerConcentracao(analise({ top_municipio: null, municipios_com_voto: 0 }))).toBeNull();
  });
});
