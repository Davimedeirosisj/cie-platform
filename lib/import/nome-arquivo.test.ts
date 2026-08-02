import { describe, expect, it } from "vitest";
import { sanitizarNomeArquivo } from "./nome-arquivo";

// Regression: uploading a TSE export failed with
//   Invalid key: <uuid>/<uuid>-trece-ele2022-votacao-CEARÁ-1T-SECAO-...csv
// because the storage key was built straight from file.name.
describe("sanitizarNomeArquivo", () => {
  it("remove acentos mantendo a letra base", () => {
    expect(sanitizarNomeArquivo("trece-ele2022-votacao-CEARÁ-1T-SECAO.csv")).toBe(
      "trece-ele2022-votacao-CEARA-1T-SECAO.csv",
    );
  });

  it("troca espaços e parênteses por sublinhado", () => {
    expect(sanitizarNomeArquivo("Votação Seção São João (2024).xlsx")).toBe(
      "Votacao_Secao_Sao_Joao__2024_.xlsx",
    );
  });

  it("preserva ponto, hífen e sublinhado, que a Storage aceita", () => {
    expect(sanitizarNomeArquivo("a-b_c.d.csv")).toBe("a-b_c.d.csv");
  });

  it("produz apenas caracteres aceitos pela Storage", () => {
    const saida = sanitizarNomeArquivo("ÁÉÍÓÚ ção/ç\\ñ*?<>|.csv");
    expect(saida).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it("não deixa o nome vazio", () => {
    expect(sanitizarNomeArquivo("ção.csv").length).toBeGreaterThan(0);
  });
});
