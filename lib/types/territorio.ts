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

export type Zona = {
  id: string;
  bairro_id: string;
  numero_zona: number;
};

export type Secao = {
  id: string;
  zona_id: string;
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
