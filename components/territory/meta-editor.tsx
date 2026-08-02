"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

type CampanhaMeta = { id: string; nome: string };

/**
 * Deliberately NOT the toolbar campaign. That selector is a *view* filter, and
 * using it as the write target meant a goal typed under a card headed "Meta
 * 2026" was saved against whichever campaign happened to be selected -- so it
 * vanished, because the dashboard reads goals from the campanha_meta. Same
 * mistake the import wizard made before it got an explicit destination.
 *
 * A goal is always planning for the future election, so it targets the
 * campaign flagged is_campanha_meta, and says which one on screen.
 */
export function MetaEditor({ nivel, targetId }: { nivel: MetaNivel; targetId: string }) {
  const [campanha, setCampanha] = useState<CampanhaMeta | null>(null);
  const [valor, setValor] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: meta } = await supabase
        .from("campanhas")
        .select("id, nome")
        .eq("is_campanha_meta", true)
        .maybeSingle();

      if (cancelled) return;
      if (!meta) {
        setCampanha(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("metas")
        .select("valor_meta")
        .eq("campanha_id", meta.id)
        .eq("nivel", nivel)
        .eq(TARGET_COLUMN[nivel], targetId)
        .maybeSingle();

      if (cancelled) return;
      setCampanha(meta as CampanhaMeta);
      setValor(data ? String(data.valor_meta) : "");
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [nivel, targetId]);

  async function handleSave() {
    if (!campanha || valor === "") return;
    setSaving(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("fn_upsert_meta", {
      p_campanha_id: campanha.id,
      p_nivel: nivel,
      p_target_id: targetId,
      p_valor_meta: Number(valor),
    });
    setSaving(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSalvo(true);
  }

  if (!loading && !campanha) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma campanha marcada como campanha de metas. Marque uma em Configurações → Campanhas
        para poder definir metas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="meta-valor">
        Meta (votos){campanha ? ` — ${campanha.nome}` : ""}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="meta-valor"
          type="number"
          min={0}
          disabled={loading}
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setSalvo(false);
          }}
          className="w-40"
        />
        <Button onClick={handleSave} disabled={loading || saving} variant="outline">
          {saving ? "Salvando..." : "Salvar meta"}
        </Button>
        {salvo && <span className="text-xs text-emerald-600">Salvo</span>}
      </div>
      {erro && <p className="text-sm text-destructive">Não foi possível salvar: {erro}</p>}
    </div>
  );
}
