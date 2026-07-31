"use client";

import { useEffect, useMemo, useState } from "react";
import { useCampaignStore } from "@/stores/campaign-store";
import type { MetaNivel } from "@/lib/types/territorio";
import { RANKING_FETCHERS, type RankingRow } from "@/lib/queries/rankings";
import { downloadCsv } from "@/lib/reports/export-csv";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NIVEL_LABELS: Record<MetaNivel, string> = {
  municipio: "Municípios",
  bairro: "Bairros",
  zona: "Zonas",
  secao: "Seções",
};

export default function RelatoriosPage() {
  const campanhaId = useCampaignStore((s) => s.selectedCampanhaId);
  const [nivel, setNivel] = useState<MetaNivel>("municipio");
  const [filtro, setFiltro] = useState("");
  const [rows, setRows] = useState<RankingRow[] | null>(null);

  useEffect(() => {
    if (!campanhaId) return;
    let cancelled = false;
    async function load() {
      setRows(null);
      const data = await RANKING_FETCHERS[nivel](campanhaId!);
      if (!cancelled) setRows(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [nivel, campanhaId]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const termo = filtro.trim().toLowerCase();
    if (!termo) return rows;
    return rows.filter(
      (r) => r.label.toLowerCase().includes(termo) || r.sublabel?.toLowerCase().includes(termo),
    );
  }, [rows, filtro]);

  const totalVotos = filteredRows.reduce((sum, r) => sum + r.votos, 0);
  const totalMeta = filteredRows.reduce((sum, r) => sum + (r.meta ?? 0), 0);

  function handleExportCsv() {
    downloadCsv(
      `relatorio-${nivel}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Ranking", "Território", "Votos", "Meta 2026"],
      filteredRows.map((r) => [r.ranking, r.label, r.votos, r.meta ?? ""]),
    );
  }

  return (
    <div className="flex flex-col gap-4 print:gap-2">
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Relatórios</CardTitle>
          <CardDescription>
            Selecione o nível territorial e a campanha (no topo da página) para montar o relatório.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nível</Label>
            <Select items={NIVEL_LABELS} value={nivel} onValueChange={(v) => v && setNivel(v as MetaNivel)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(NIVEL_LABELS) as MetaNivel[]).map((n) => (
                  <SelectItem key={n} value={n}>
                    {NIVEL_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={!rows}>
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!rows}>
              Imprimir / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {NIVEL_LABELS[nivel]} — {filteredRows.length} registros
          </CardTitle>
          <CardDescription>
            Total de votos: {totalVotos.toLocaleString("pt-BR")} · Total de meta:{" "}
            {totalMeta.toLocaleString("pt-BR")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!campanhaId ? (
            <p className="text-sm text-muted-foreground">Selecione uma campanha no topo da página.</p>
          ) : !rows ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Território</TableHead>
                  <TableHead className="text-right">Votos</TableHead>
                  <TableHead className="text-right">Meta 2026</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{row.ranking}</TableCell>
                    <TableCell>
                      {row.label}
                      {row.sublabel && (
                        <span className="ml-2 text-xs text-muted-foreground">{row.sublabel}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.votos.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.meta !== null ? row.meta.toLocaleString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum registro encontrado.
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
