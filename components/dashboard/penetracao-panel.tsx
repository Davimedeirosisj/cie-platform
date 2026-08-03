"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetchPenetracao, type PenetracaoNivel } from "@/lib/queries/penetracao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PenetracaoPanel({ campanhaId }: { campanhaId: string }) {
  const [nivel, setNivel] = useState<PenetracaoNivel>("bairro");

  const { data, isLoading } = useSWR(
    campanhaId ? ["penetracao", campanhaId, nivel] : null,
    () => fetchPenetracao(campanhaId, nivel),
  );

  const linhas = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onde a campanha é mais forte</CardTitle>
        <CardDescription>
          Percentual dos votos do território que foram para a campanha, sobre o total oficial do
          TSE para a mesma eleição. Ordena por força, não por volume.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs value={nivel} onValueChange={(v) => setNivel(v as PenetracaoNivel)}>
          <TabsList>
            <TabsTrigger value="bairro">Bairros</TabsTrigger>
            <TabsTrigger value="municipio">Municípios</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem denominador do TSE para esta campanha. Hoje só a eleição de 2022 (Deputada
            Federal) tem o total oficial carregado — comparar com outra eleição misturaria
            disputas e eleitorados diferentes.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Território</TableHead>
                  <TableHead className="text-right">Votos</TableHead>
                  <TableHead className="text-right">Total do território</TableHead>
                  <TableHead className="text-right">Penetração</TableHead>
                  <TableHead className="text-right">Pos. no volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((r) => (
                  <TableRow key={`${r.nome}-${r.contexto}`}>
                    <TableCell>
                      <span className="font-medium">{r.nome}</span>
                      {r.contexto && (
                        <span className="ml-2 text-xs text-muted-foreground">{r.contexto}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.votos.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.total_territorio.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-emerald-600">
                      {r.penetracao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%
                    </TableCell>
                    {/* Quem está no topo da força e longe no volume é justamente
                        o reduto que o ranking por votos escondia. */}
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.posicao_volume}º
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Territórios com menos de 20 votos ficam de fora: percentual sobre base pequena vira
              ruído. Os denominadores somam apenas as seções presentes no sistema, então a
              penetração real é ligeiramente menor que a exibida.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
