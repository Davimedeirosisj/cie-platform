"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAnaliseCampanha,
  fetchRetencaoBairros,
  lerConcentracao,
  lerDispersao,
  type RetencaoBairro,
} from "@/lib/queries/analise";
import type { Campanha } from "@/lib/types/campanha";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TOM_CLASSE = {
  alerta: "border-amber-500/40 bg-amber-500/5",
  neutro: "border-border bg-muted/40",
  bom: "border-emerald-500/40 bg-emerald-500/5",
} as const;

export function AnalisePanel({ campanhaId }: { campanhaId: string | null }) {
  // SWR (as in useTopItems) rather than an effect: it keeps the fetch out of
  // render, shares the cache with the retention pass below, and revalidates
  // when the campaign changes.
  const { data: analise, isLoading: carregando } = useSWR(
    campanhaId ? `analise/${campanhaId}` : null,
    campanhaId ? () => fetchAnaliseCampanha(campanhaId) : null,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );

  const [retencao, setRetencao] = useState<RetencaoBairro[]>([]);
  const [contexto, setContexto] = useState<{
    base: Campanha | null;
    recente: Campanha | null;
    municipio: string | null;
  }>({ base: null, recente: null, municipio: null });

  // Retention needs two campaigns with real votes. Rather than hardcoding
  // which, pick the two most-voted -- so this keeps working as campaigns are
  // added and 2026 eventually replaces 2024 as the recent one.
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const supabase = createClient();
      const { data: campanhas } = await supabase
        .from("campanhas")
        .select("id, nome, cargo, ano, status, is_campanha_meta")
        .order("ano");

      const lista = (campanhas ?? []) as Campanha[];
      if (lista.length < 2) return;

      const totais = await Promise.all(
        lista.map(async (c) => ({ c, a: await fetchAnaliseCampanha(c.id) })),
      );
      const comVotos = totais
        .filter((t) => (t.a?.total_votos ?? 0) > 0)
        .sort((x, y) => x.c.ano - y.c.ano);
      if (comVotos.length < 2 || cancelado) return;

      const base = comVotos[0].c;
      const recente = comVotos[comVotos.length - 1].c;

      // Scope to the município that dominates the base campaign: ranking
      // bairros from different cities compares territories that never
      // contested the same race.
      const topMunicipio = comVotos[0].a?.top_municipio ?? null;
      const { data: mun } = topMunicipio
        ? await supabase.from("municipios").select("id").eq("nome", topMunicipio).maybeSingle()
        : { data: null };

      const linhas = await fetchRetencaoBairros(base.id, recente.id, mun?.id ?? null);
      if (cancelado) return;

      setContexto({ base, recente, municipio: topMunicipio });
      setRetencao(linhas);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  const leitura = useMemo(() => (analise ? lerDispersao(analise) : null), [analise]);
  const concentracao = useMemo(() => (analise ? lerConcentracao(analise) : null), [analise]);

  // Bairros above the overall retention rate held their vote better than the
  // campaign as a whole -- that comparison is what makes the list meaningful.
  const mediaRetencao = useMemo(() => {
    const base = retencao.reduce((s, r) => s + r.votos_base, 0);
    const rec = retencao.reduce((s, r) => s + r.votos_recente, 0);
    return base > 0 ? (rec / base) * 100 : 0;
  }, [retencao]);

  const destaques = useMemo(
    () => retencao.filter((r) => r.votos_base >= 150).slice(0, 8),
    [retencao],
  );

  if (!campanhaId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Análise da campanha</CardTitle>
        <CardDescription>
          Calculada a partir dos dados carregados — cada importação atualiza a leitura.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {carregando && !analise && (
          <p className="text-sm text-muted-foreground">Analisando...</p>
        )}

        {leitura && (
          <div className={`rounded-lg border p-4 ${TOM_CLASSE[leitura.tom]}`}>
            <p className="text-sm font-medium">{leitura.titulo}</p>
            <p className="mt-1 text-sm text-muted-foreground">{leitura.texto}</p>
          </div>
        )}

        {concentracao && (
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">Concentração geográfica</p>
            <p className="mt-1 text-sm text-muted-foreground">{concentracao}</p>
          </div>
        )}

        {destaques.length > 0 && contexto.base && contexto.recente && (
          <div>
            <p className="text-sm font-medium">
              Bairros que mais seguraram a votação
              {contexto.municipio ? ` em ${contexto.municipio}` : ""}
            </p>
            <p className="mb-2 text-sm text-muted-foreground">
              {contexto.base.nome} → {contexto.recente.nome}. A média geral foi{" "}
              {mediaRetencao.toFixed(1)}%; quem está acima disso resistiu melhor que a campanha
              como um todo.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bairro</TableHead>
                  <TableHead className="text-right">{contexto.base.ano}</TableHead>
                  <TableHead className="text-right">{contexto.recente.ano}</TableHead>
                  <TableHead className="text-right">Retenção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destaques.map((r) => (
                  <TableRow key={r.bairro_id}>
                    <TableCell>
                      <Link
                        href={`/bairros/${r.bairro_id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {r.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.votos_base.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.votos_recente.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        r.retencao_pct >= mediaRetencao ? "text-emerald-600" : ""
                      }`}
                    >
                      {r.retencao_pct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
