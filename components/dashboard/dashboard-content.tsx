"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaignStore } from "@/stores/campaign-store";
import type { Campanha } from "@/lib/types/campanha";
import {
  fetchTotalVotosPorCampanha,
  fetchMetaTotalMunicipio,
  fetchComparacao,
  type ComparacaoNivel,
  type ComparacaoRow,
} from "@/lib/queries/dashboard";
import { useTopItems } from "@/lib/hooks";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TopList } from "@/components/dashboard/top-list";
import { AnalisePanel } from "@/components/dashboard/analise-panel";
import { VotesBarChart } from "@/components/dashboard/votes-bar-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Counts = { municipios: number; bairros: number; zonas: number; secoes: number };

// Base UI reads the trigger label from this map.
const NIVEIS_COMPARACAO: Record<string, string> = {
  municipio: "Municípios",
  bairro: "Bairros de Fortaleza",
};

export function DashboardContent({ counts }: { counts: Counts }) {
  const campanhaId = useCampaignStore((s) => s.selectedCampanhaId);

  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [totaisPorCampanha, setTotaisPorCampanha] = useState<Record<string, number>>({});
  const [metaTotal, setMetaTotal] = useState<number | null>(null);

  // Caching layer via SWR hook (Fase 2 Sprint 2)
  const { data: topItems, isLoading: isLoadingTopItems } = useTopItems(campanhaId);

  const [campanhaA, setCampanhaA] = useState<string>("");
  const [campanhaB, setCampanhaB] = useState<string>("");
  const [nivelComparacao, setNivelComparacao] = useState<ComparacaoNivel>("municipio");
  const [comparacao, setComparacao] = useState<(ComparacaoRow & { nome: string })[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("campanhas")
      .select("id, nome, cargo, ano, status, is_campanha_meta")
      .order("ano")
      .then(({ data }) => {
        const lista = (data ?? []) as Campanha[];
        setCampanhas(lista);
        if (lista.length >= 2) {
          setCampanhaA((prev) => prev || lista[0].id);
          setCampanhaB((prev) => prev || lista[1].id);
        }
      });

    fetchTotalVotosPorCampanha().then(setTotaisPorCampanha);
  }, []);

  useEffect(() => {
    const campanhaMeta = campanhas.find((c) => c.is_campanha_meta);
    if (!campanhaMeta) return;
    fetchMetaTotalMunicipio(campanhaMeta.id).then(setMetaTotal);
  }, [campanhas]);


  useEffect(() => {
    if (!campanhaA || !campanhaB) return;
    fetchComparacao(nivelComparacao, campanhaA, campanhaB).then(setComparacao);
  }, [nivelComparacao, campanhaA, campanhaB]);

  const totalSelecionada = campanhaId ? totaisPorCampanha[campanhaId] ?? 0 : 0;
  const percentualMeta =
    metaTotal && metaTotal > 0 ? Math.round((totalSelecionada / metaTotal) * 100) : null;

  const handleCampanhaAChange = useCallback((v: string | null) => {
    if (v) setCampanhaA(v);
  }, []);

  const handleCampanhaBChange = useCallback((v: string | null) => {
    if (v) setCampanhaB(v);
  }, []);

  const maioresCrescimentos = useMemo(
    () =>
      [...comparacao]
        .sort((a, b) => b.variacao_absoluta - a.variacao_absoluta)
        .slice(0, 5),
    [comparacao]
  );

  const maioresQuedas = useMemo(
    () =>
      [...comparacao]
        .filter((r) => r.variacao_absoluta < 0)
        .sort((a, b) => a.variacao_absoluta - b.variacao_absoluta)
        .slice(0, 5),
    [comparacao]
  );

  const rotuloTerritorio = nivelComparacao === "bairro" ? "Bairro" : "Município";

  // Base UI needs an items map to render labels (not raw ids) in the trigger.
  const campanhaItems = useMemo(
    () => Object.fromEntries(campanhas.map((c) => [c.id, c.nome])),
    [campanhas]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {campanhas.map((c) => (
          <KpiCard
            key={c.id}
            label={`Votos — ${c.nome}`}
            value={(totaisPorCampanha[c.id] ?? 0).toLocaleString("pt-BR")}
            hint={c.cargo}
          />
        ))}
        <KpiCard
          label="Meta Total 2026"
          value={metaTotal !== null ? metaTotal.toLocaleString("pt-BR") : "—"}
          hint={percentualMeta !== null ? `${percentualMeta}% atingido pela campanha selecionada` : undefined}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Municípios" value={counts.municipios.toLocaleString("pt-BR")} />
        <KpiCard label="Bairros" value={counts.bairros.toLocaleString("pt-BR")} />
        <KpiCard label="Zonas" value={counts.zonas.toLocaleString("pt-BR")} />
        <KpiCard label="Seções" value={counts.secoes.toLocaleString("pt-BR")} />
      </div>

      {campanhaId && (
        <>
          <VotesBarChart
            title="Top 5 Municípios — campanha selecionada"
            categories={topItems.municipios.map((m) => m.label)}
            series={[{ name: "Votos", data: topItems.municipios.map((m) => m.votos) }]}
            isLoading={isLoadingTopItems}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <TopList title="Top Municípios" items={topItems.municipios} isLoading={isLoadingTopItems} />
            <TopList title="Top Bairros" items={topItems.bairros} isLoading={isLoadingTopItems} />
            <TopList title="Top Zonas" items={topItems.zonas} isLoading={isLoadingTopItems} />
            <TopList title="Top Seções" items={topItems.secoes} isLoading={isLoadingTopItems} />
          </div>

          <AnalisePanel campanhaId={campanhaId} />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Comparativo entre campanhas{" "}
            {nivelComparacao === "bairro" ? "(bairros de Fortaleza)" : "(municípios)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <Select
              items={NIVEIS_COMPARACAO}
              value={nivelComparacao}
              onValueChange={(v) => v && setNivelComparacao(v as ComparacaoNivel)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(NIVEIS_COMPARACAO).map(([valor, rotulo]) => (
                  <SelectItem key={valor} value={valor}>
                    {rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={campanhaItems} value={campanhaA} onValueChange={handleCampanhaAChange}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Campanha A" />
              </SelectTrigger>
              <SelectContent>
                {campanhas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={campanhaItems} value={campanhaB} onValueChange={handleCampanhaBChange}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Campanha B" />
              </SelectTrigger>
              <SelectContent>
                {campanhas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">Maior crescimento</h3>
              <ComparacaoTable rows={maioresCrescimentos} rotulo={rotuloTerritorio} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Maior queda</h3>
              <ComparacaoTable rows={maioresQuedas} rotulo={rotuloTerritorio} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const ComparacaoTable = memo(function ComparacaoTableComponent({
  rows,
  rotulo,
}: {
  rows: (ComparacaoRow & { nome: string })[];
  rotulo: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{rotulo}</TableHead>
          <TableHead className="text-right">Variação</TableHead>
          <TableHead className="text-right">%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.territorio_id}>
            <TableCell>{r.nome}</TableCell>
            <TableCell
              className={`text-right tabular-nums ${r.variacao_absoluta >= 0 ? "text-emerald-600" : "text-destructive"}`}
            >
              {r.variacao_absoluta >= 0 ? "+" : ""}
              {r.variacao_absoluta.toLocaleString("pt-BR")}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {r.variacao_percentual !== null ? `${r.variacao_percentual}%` : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
});
