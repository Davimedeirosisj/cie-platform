"use client";

import { useEffect, useMemo, useState } from "react";
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

        // Read the CURRENT store value rather than the one this effect closed
        // over: zustand rehydrates the persisted selection around mount, so the
        // captured value can still be null here. Using it made every page load
        // decide the saved choice was "invalid" and silently reset the user
        // back to the newest campaign.
        const atual = useCampaignStore.getState().selectedCampanhaId;
        const aindaValida = lista.some((c) => c.id === atual);
        if (!aindaValida && lista.length > 0) {
          const ativa = lista.find((c) => c.status === "ativa") ?? lista[0];
          setSelectedCampanhaId(ativa.id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Base UI's <SelectValue> renders the raw value unless the root is given an
  // items map -- without this the trigger shows the campanha's UUID.
  const items = useMemo(
    () => Object.fromEntries(campanhas.map((c) => [c.id, `${c.nome} — ${c.cargo}`])),
    [campanhas],
  );

  if (loading) {
    return <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <Select
      items={items}
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
