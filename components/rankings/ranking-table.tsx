"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MetaNivel } from "@/lib/types/territorio";
import { RANKING_FETCHERS, type RankingRow } from "@/lib/queries/rankings";
import { fetchCampanhaMeta } from "@/lib/queries/campanha-meta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function RankingTable({ nivel, campanhaId }: { nivel: MetaNivel; campanhaId: string }) {
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [nomeCampanhaMeta, setNomeCampanhaMeta] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setRows(null);
      const [data, campanhaMeta] = await Promise.all([
        RANKING_FETCHERS[nivel](campanhaId),
        fetchCampanhaMeta(),
      ]);
      if (cancelled) return;
      setRows(data);
      setNomeCampanhaMeta(campanhaMeta?.nome ?? null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [nivel, campanhaId]);

  if (rows === null) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem votos registrados para esta campanha.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Território</TableHead>
          <TableHead className="text-right">Votos</TableHead>
          <TableHead className="text-right">
            {nomeCampanhaMeta ? `Meta — ${nomeCampanhaMeta}` : "Meta"}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="text-muted-foreground">{row.ranking}</TableCell>
            <TableCell>
              <Link href={row.href} className="font-medium underline-offset-4 hover:underline">
                {row.label}
              </Link>
              {row.sublabel && <span className="ml-2 text-xs text-muted-foreground">{row.sublabel}</span>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{row.votos.toLocaleString("pt-BR")}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {row.meta !== null ? row.meta.toLocaleString("pt-BR") : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
