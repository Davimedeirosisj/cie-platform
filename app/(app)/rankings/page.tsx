"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { RankingTable } from "@/components/rankings/ranking-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RankingsPage() {
  const campanhaId = useCampaignStore((s) => s.selectedCampanhaId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        {!campanhaId ? (
          <p className="text-sm text-muted-foreground">Selecione uma campanha no topo da página.</p>
        ) : (
          <Tabs defaultValue="municipio">
            <TabsList>
              <TabsTrigger value="municipio">Municípios</TabsTrigger>
              <TabsTrigger value="bairro">Bairros</TabsTrigger>
              <TabsTrigger value="zona">Zonas</TabsTrigger>
              <TabsTrigger value="secao">Seções</TabsTrigger>
            </TabsList>
            <TabsContent value="municipio">
              <RankingTable nivel="municipio" campanhaId={campanhaId} />
            </TabsContent>
            <TabsContent value="bairro">
              <RankingTable nivel="bairro" campanhaId={campanhaId} />
            </TabsContent>
            <TabsContent value="zona">
              <RankingTable nivel="zona" campanhaId={campanhaId} />
            </TabsContent>
            <TabsContent value="secao">
              <RankingTable nivel="secao" campanhaId={campanhaId} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
