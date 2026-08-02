export type Estado = {
  id: string;
  sigla: string;
  nome: string;
};

export type Municipio = {
  id: string;
  estado_id: string;
  nome: string;
  ibge_code: string | null;
  latitude: number | null;
  longitude: number | null;
  observacoes: string | null;
};

export type Bairro = {
  id: string;
  municipio_id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  observacoes: string | null;
};

/**
 * A zona eleitoral is scoped to the estado, not to a município or bairro: TSE
 * numbers them uniquely per UF and one zona can serve several municípios. The
 * municípios and bairros it covers are derived from its seções (0024).
 */
export type Zona = {
  id: string;
  estado_id: string;
  numero_zona: number;
};

/** A seção sits in both groupings at once: a zona and a bairro. */
export type Secao = {
  id: string;
  zona_id: string;
  bairro_id: string | null;
  numero_secao: number;
  local_votacao: string | null;
  endereco_local: string | null;
};

export type MetaNivel = "municipio" | "bairro" | "zona" | "secao";

export type Meta = {
  id: string;
  campanha_id: string;
  nivel: MetaNivel;
  municipio_id: string | null;
  bairro_id: string | null;
  zona_id: string | null;
  secao_id: string | null;
  valor_meta: number;
  observacoes: string | null;
};
