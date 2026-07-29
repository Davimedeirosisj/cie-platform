"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaignStore } from "@/stores/campaign-store";
import type { Campanha } from "@/lib/types/campanha";
import {
  fetchTotalVotosPorCampanha,
  fetchMetaTotalMunicipio,
  fetchComparacaoMunicipios,
  type TopItem,
  type ComparacaoRow,
} from "@/lib/queries/dashboard";
import { fetchAllTopItems } from "@/lib/queries/dashboard-optimized";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TopList } from "@/components/dashboard/top-list";
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

export function DashboardContent({ counts }: { counts: Counts }) {
  const campanhaId = useCampaignStore((s) => s.selectedCampanhaId);

  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [totaisPorCampanha, setTotaisPorCampanha] = useState<Record<string, number>>({});
  const [metaTotal, setMetaTotal] = useState<number | null>(null);

  const [topMunicipios, setTopMunicipios] = useState<TopItem[]>([]);
  const [topBairros, setTopBairros] = useState<TopItem[]>([]);
  const [topZonas, setTopZonas] = useState<TopItem[]>([]);
  const [topSecoes, setTopSecoes] = useState<TopItem[]>([]);

  const [campanhaA, setCampanhaA] = useState<string | undefined>();
  const [campanhaB, setCampanhaB] = useState<string | undefined>();
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
          setCampanhaA((prev) => prev ?? lista[0].id);
          setCampanhaB((prev) => prev ?? lista[1].id);
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
    if (!campanhaId) return;
    fetchAllTopItems(campanhaId).then((data) => {
      setTopMunicipios(data.municipios);
      setTopBairros(data.bairros);
      setTopZonas(data.zonas);
      setTopSecoes(data.secoes);
    });
  }, [campanhaId]);

  useEffect(() => {
    if (!campanhaA || !campanhaB) return;
    fetchComparacaoMunicipios(campanhaA, campanhaB).then(setComparacao);
  }, [campanhaA, campanhaB]);

  const totalSelecionada = campanhaId ? totaisPorCampanha[campanhaId] ?? 0 : 0;
  const percentualMeta =
    metaTotal && metaTotal > 0 ? Math.round((totalSelecionada / metaTotal) * 100) : null;

  const maioresCrescimentos = [...comparacao]
    .sort((a, b) => b.variacao_absoluta - a.variacao_absoluta)
    .slice(0, 5);
  const maioresQuedas = [...comparacao]
    .filter((r) => r.variacao_absoluta < 0)
    .sort((a, b) => a.variacao_absoluta - b.variacao_absoluta)
    .slice(0, 5);

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
            categories={topMunicipios.map((m) => m.label)}
            series={[{ name: "Votos", data: topMunicipios.map((m) => m.votos) }]}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <TopList title="Top Municípios" items={topMunicipios} />
            <TopList title="Top Bairros" items={topBairros} />
            <TopList title="Top Zonas" items={topZonas} />
            <TopList title="Top Seções" items={topSecoes} />
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo entre campanhas (municípios)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <Select value={campanhaA} onValueChange={(v) => v && setCampanhaA(v)}>
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
            <Select value={campanhaB} onValueChange={(v) => v && setCampanhaB(v)}>
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
              <ComparacaoTable rows={maioresCrescimentos} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Maior queda</h3>
              <ComparacaoTable rows={maioresQuedas} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComparacaoTable({ rows }: { rows: (ComparacaoRow & { nome: string })[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Município</TableHead>
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
}
