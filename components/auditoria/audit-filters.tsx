"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const TABELAS = [
  { value: "municipios", label: "Município" },
  { value: "bairros", label: "Bairro" },
  { value: "zonas", label: "Zona" },
  { value: "secoes", label: "Seção" },
  { value: "votos_secao", label: "Votos" },
  { value: "metas", label: "Meta" },
];

const ACOES = [
  { value: "insert", label: "Criação" },
  { value: "update", label: "Atualização" },
  { value: "delete", label: "Exclusão" },
];

export function AuditFilters({ tabela, acao }: { tabela?: string; acao?: string }) {
  const router = useRouter();

  function updateParam(key: "tabela" | "acao", value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/configuracoes/auditoria?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      <Select value={tabela ?? ALL} onValueChange={(v) => v && updateParam("tabela", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tabela" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as tabelas</SelectItem>
          {TABELAS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={acao ?? ALL} onValueChange={(v) => v && updateParam("acao", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Ação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as ações</SelectItem>
          {ACOES.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
