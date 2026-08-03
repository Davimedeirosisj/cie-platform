"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { MetaNivel } from "@/lib/types/territorio";
import {
  fetchMetasPlanejamento,
  salvarMetasLote,
  type MetaPlanejamentoRow,
} from "@/lib/queries/metas-planejamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Campanha = {
  id: string;
  nome: string;
  ano: number;
  cargo: string;
  is_campanha_meta: boolean;
};

const NIVEIS: { valor: MetaNivel; rotulo: string }[] = [
  { valor: "municipio", rotulo: "Municípios" },
  { valor: "bairro", rotulo: "Bairros" },
  { valor: "zona", rotulo: "Zonas" },
];

export function MetasEditor() {
  const [campanhaMeta, setCampanhaMeta] = useState<Campanha | null>(null);
  const [campanhaBase, setCampanhaBase] = useState<Campanha | null>(null);
  const [nivel, setNivel] = useState<MetaNivel>("municipio");
  // Guarda só o que foi editado. O valor exibido cai de volta no que está no
  // banco quando não houve edição — assim não existe efeito sincronizando dois
  // estados, que é onde nascem telas mostrando número velho depois de salvar.
  const [edicoes, setEdicoes] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState("");
  const [percentual, setPercentual] = useState("20");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("campanhas")
      .select("id, nome, ano, cargo, is_campanha_meta")
      .order("ano")
      .then(({ data }) => {
        const lista = (data ?? []) as Campanha[];
        const meta = lista.find((c) => c.is_campanha_meta) ?? null;
        setCampanhaMeta(meta);

        // A referência é a última eleição para o MESMO CARGO, não a mais
        // recente. 2026 é Deputada Federal, então a base é 2022 -- 2024 foi
        // Vereadora, com eleitorado e disputa diferentes, e comparar meta de
        // deputada federal com votação de vereadora não diz nada.
        setCampanhaBase(
          lista
            .filter((c) => !c.is_campanha_meta && c.cargo === meta?.cargo)
            .sort((a, b) => b.ano - a.ano)[0] ?? null,
        );
      });
  }, []);

  const { data: linhas, mutate } = useSWR(
    campanhaMeta && campanhaBase ? ["metas", campanhaMeta.id, campanhaBase.id, nivel] : null,
    () => fetchMetasPlanejamento(campanhaMeta!.id, campanhaBase!.id, nivel),
  );

  const valorDe = (r: MetaPlanejamentoRow) =>
    edicoes[r.territorio_id] ?? (r.meta_atual == null ? "" : String(r.meta_atual));

  const visiveis = useMemo(() => {
    if (!linhas) return [];
    const termo = filtro.trim().toLowerCase();
    if (!termo) return linhas;
    return linhas.filter(
      (r) => r.nome.toLowerCase().includes(termo) || r.contexto.toLowerCase().includes(termo),
    );
  }, [linhas, filtro]);

  const somaMetas = useMemo(
    () =>
      (linhas ?? []).reduce((s, r) => {
        const v = edicoes[r.territorio_id] ?? (r.meta_atual == null ? "" : String(r.meta_atual));
        return s + (v === "" ? 0 : Number(v) || 0);
      }, 0),
    [linhas, edicoes],
  );
  const somaBase = useMemo(
    () => (linhas ?? []).reduce((s, r) => s + r.votos_base, 0),
    [linhas],
  );

  /** Preenche só o que está visível, para o filtro servir de recorte. */
  function aplicarPercentual() {
    const pct = Number(percentual);
    if (!Number.isFinite(pct)) return;
    setEdicoes((atual) => {
      const novo = { ...atual };
      for (const r of visiveis) {
        if (r.votos_base > 0) {
          novo[r.territorio_id] = String(Math.round(r.votos_base * (1 + pct / 100)));
        }
      }
      return novo;
    });
    setAviso(null);
  }

  function limparVisiveis() {
    setEdicoes((atual) => {
      const novo = { ...atual };
      for (const r of visiveis) novo[r.territorio_id] = "";
      return novo;
    });
  }

  async function salvar() {
    if (!campanhaMeta || !linhas) return;
    setSalvando(true);
    setAviso(null);

    // Só o que mudou: mandar 1.196 linhas sem necessidade sobrecarrega e polui
    // a auditoria com atualizações que não alteraram nada.
    const alterados = linhas
      .filter((r) => {
        const antigo = r.meta_atual == null ? "" : String(r.meta_atual);
        return valorDe(r) !== antigo;
      })
      .map((r) => ({
        id: r.territorio_id,
        valor: valorDe(r) === "" ? null : Number(valorDe(r)),
      }));

    if (alterados.length === 0) {
      setSalvando(false);
      setAviso("Nada mudou desde o último carregamento.");
      return;
    }

    const { salvas, erro } = await salvarMetasLote(campanhaMeta.id, nivel, alterados);
    setSalvando(false);

    if (erro) {
      setAviso(`Não foi possível salvar: ${erro}`);
      return;
    }
    setAviso(`${salvas} meta(s) gravada(s) em ${campanhaMeta.nome}.`);
    setEdicoes({});
    await mutate();
  }

  if (!campanhaMeta) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Metas</CardTitle>
          <CardDescription>
            Nenhuma campanha está marcada como campanha de metas. Marque uma em Configurações ›
            Campanhas para poder planejar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Metas — {campanhaMeta.nome}</CardTitle>
          <CardDescription>
            Defina quantos votos a campanha quer em cada território.
            {campanhaBase && ` A coluna de referência é a ${campanhaBase.nome}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Tabs value={nivel} onValueChange={(v) => setNivel(v as MetaNivel)}>
            <TabsList>
              {NIVEIS.map((n) => (
                <TabsTrigger key={n.valor} value={n.valor}>
                  {n.rotulo}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro">Buscar</Label>
              <Input
                id="filtro"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Filtrar por nome..."
                className="w-56"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pct">Preencher com % sobre a referência</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pct"
                  type="number"
                  value={percentual}
                  onChange={(e) => setPercentual(e.target.value)}
                  className="w-24"
                />
                <Button variant="outline" onClick={aplicarPercentual} disabled={!linhas}>
                  Aplicar
                </Button>
                <Button variant="ghost" onClick={limparVisiveis} disabled={!linhas}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">Soma das metas</span>
              <span className="text-2xl font-semibold tabular-nums">
                {somaMetas.toLocaleString("pt-BR")}
              </span>
              {somaBase > 0 && (
                <span className="text-xs text-muted-foreground">
                  {campanhaBase?.nome}: {somaBase.toLocaleString("pt-BR")} (
                  {somaMetas > 0 ? `${Math.round((somaMetas / somaBase - 1) * 100)}%` : "—"})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={salvar} disabled={salvando || !linhas}>
              {salvando ? "Salvando..." : "Salvar metas"}
            </Button>
            {aviso && <span className="text-sm text-muted-foreground">{aviso}</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            &quot;Aplicar&quot; e &quot;Limpar&quot; agem apenas sobre o que o filtro está
            mostrando. Campo vazio remove a meta; zero é uma meta de não disputar ali.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {!linhas ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Território</TableHead>
                  <TableHead className="text-right">{campanhaBase?.nome ?? "Referência"}</TableHead>
                  <TableHead className="text-right">Penetração</TableHead>
                  <TableHead className="text-right w-36">Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((r) => (
                  <TableRow key={r.territorio_id}>
                    <TableCell>
                      <span className="font-medium">{r.nome}</span>
                      {r.contexto && (
                        <span className="ml-2 text-xs text-muted-foreground">{r.contexto}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.votos_base.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.penetracao == null ? "—" : `${r.penetracao.toLocaleString("pt-BR")}%`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        value={valorDe(r)}
                        onChange={(e) =>
                          setEdicoes((v) => ({ ...v, [r.territorio_id]: e.target.value }))
                        }
                        className="ml-auto w-32 text-right"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {visiveis.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum território encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
