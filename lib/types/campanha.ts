export type Campanha = {
  id: string;
  nome: string;
  cargo: string;
  ano: number;
  status: "planejamento" | "ativa" | "encerrada";
  is_campanha_meta: boolean;
};
