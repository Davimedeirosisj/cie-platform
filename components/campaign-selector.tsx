"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaignStore } from "@/stores/campaign-store";
import type { Campanha } from "@/lib/types/campanha";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CampaignSelector() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedCampanhaId = useCampaignStore((s) => s.selectedCampanhaId);
  const setSelectedCampanhaId = useCampaignStore((s) => s.setSelectedCampanhaId);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("campanhas")
      .select("id, nome, cargo, ano, status, is_campanha_meta")
      .order("ano", { ascending: false })
      .then(({ data }) => {
        const lista = (data ?? []) as Campanha[];
        setCampanhas(lista);
        setLoading(false);

        const aindaValida = lista.some((c) => c.id === selectedCampanhaId);
        if (!aindaValida && lista.length > 0) {
          const ativa = lista.find((c) => c.status === "ativa") ?? lista[0];
          setSelectedCampanhaId(ativa.id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <Select
      value={selectedCampanhaId ?? undefined}
      onValueChange={(value) => value && setSelectedCampanhaId(value)}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Selecione a campanha" />
      </SelectTrigger>
      <SelectContent>
        {campanhas.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome} — {c.cargo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
