export type SystemField = "municipio" | "bairro" | "zona" | "secao" | "local_votacao" | "votos";

export const SYSTEM_FIELDS: { field: SystemField; label: string; required: boolean }[] = [
  { field: "municipio", label: "Município", required: true },
  { field: "bairro", label: "Bairro", required: true },
  { field: "zona", label: "Zona Eleitoral", required: true },
  { field: "secao", label: "Seção Eleitoral", required: true },
  { field: "local_votacao", label: "Local de Votação", required: false },
  { field: "votos", label: "Quantidade de Votos", required: true },
];

export type ColumnMapping = Partial<Record<SystemField, string>>;

export type MappedRow = Partial<Record<SystemField, string>>;

export type ImportBatch = {
  id: string;
  campanha_id: string;
  nome_arquivo: string;
  status: "pendente" | "processando" | "validado" | "importado" | "erro";
  total_linhas: number;
  linhas_sucesso: number;
  linhas_erro: number;
  created_at: string;
  completed_at: string | null;
};
