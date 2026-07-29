"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaignStore } from "@/stores/campaign-store";
import type { MetaNivel } from "@/lib/types/territorio";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const TARGET_COLUMN: Record<MetaNivel, string> = {
  municipio: "municipio_id",
  bairro: "bairro_id",
  zona: "zona_id",
  secao: "secao_id",
};

export function MetaEditor({ nivel, targetId }: { nivel: MetaNivel; targetId: string }) {
  const campanhaId = useCampaignStore((s) => s.selectedCampanhaId);
  const [valor, setValor] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!campanhaId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("metas")
        .select("valor_meta")
        .eq("campanha_id", campanhaId)
        .eq("nivel", nivel)
        .eq(TARGET_COLUMN[nivel], targetId)
        .maybeSingle();
      if (!cancelled) {
        setValor(data ? String(data.valor_meta) : "");
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [campanhaId, nivel, targetId]);

  async function handleSave() {
    if (!campanhaId || valor === "") return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("fn_upsert_meta", {
      p_campanha_id: campanhaId,
      p_nivel: nivel,
      p_target_id: targetId,
      p_valor_meta: Number(valor),
    });
    setSaving(false);
    if (!error) setSavedAt(Date.now());
  }

  if (!campanhaId) {
    return <p className="text-sm text-muted-foreground">Selecione uma campanha.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="meta-valor">Meta (votos)</Label>
      <div className="flex items-center gap-2">
        <Input
          id="meta-valor"
          type="number"
          min={0}
          disabled={loading}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-40"
        />
        <Button onClick={handleSave} disabled={loading || saving} variant="outline">
          {saving ? "Salvando..." : "Salvar meta"}
        </Button>
        {savedAt && <span className="text-xs text-muted-foreground">Salvo</span>}
      </div>
    </div>
  );
}
