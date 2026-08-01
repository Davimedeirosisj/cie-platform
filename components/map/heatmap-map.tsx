"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createClient } from "@/lib/supabase/client";
import { useCampaignStore } from "@/stores/campaign-store";
import type { Campanha } from "@/lib/types/campanha";
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "@/lib/map/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const SOURCE_ID = "heatmap-pontos";
const LAYER_ID = "heatmap-layer";
const META_OPTION = "__meta__";

export function HeatmapMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);

  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [camada, setCamada] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("campanhas")
      .select("id, nome, cargo, ano, status, is_campanha_meta")
      .order("ano", { ascending: false })
      .then(({ data }) => {
        const lista = (data ?? []) as Campanha[];
        setCampanhas(lista);
        // Open on the campaign the user is already looking at. Defaulting to
        // lista[0] (newest by ano) landed on the future/meta campaign, which
        // has no votes yet, so the layer rendered empty for no obvious reason.
        const global = useCampaignStore.getState().selectedCampanhaId;
        setCamada(
          (prev) =>
            prev || (global && lista.some((c) => c.id === global) ? global : lista[0]?.id) || "",
        );
      });
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.on("load", () => setReady(true));
    // Without this the map fails silently: the container just stays blank,
    // with nothing in the console explaining why (bad token, blocked tiles,
    // no WebGL...).
    map.current.on("error", (e) => {
      const msg = e.error?.message ?? "Falha ao carregar o mapa.";
      console.error("[Mapbox]", msg, e.error);
      setErro(msg);
    });
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current || !camada) return;
    let cancelled = false;

    async function loadAndRender() {
      const supabase = createClient();

      // Plot bairros when they have coordinates: a heatmap over municípios
      // alone is a single blob in a one-city campaign. Falls back to
      // municípios so the layer still works before bairros are geocoded.
      const { data: bairros } = await supabase
        .from("bairros")
        .select("id, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      const usarBairros = (bairros ?? []).length > 0;

      const { data: municipios } = usarBairros
        ? { data: null }
        : await supabase
            .from("municipios")
            .select("id, latitude, longitude")
            .not("latitude", "is", null)
            .not("longitude", "is", null);

      const pontos = usarBairros ? bairros! : (municipios ?? []);
      const nivel = usarBairros ? "bairro" : "municipio";
      const fkColuna = usarBairros ? "bairro_id" : "municipio_id";
      const vista = usarBairros ? "vw_votos_bairro" : "vw_votos_municipio";

      let pesoById = new Map<string, number>();

      if (camada === META_OPTION) {
        const campanhaMeta = campanhas.find((c) => c.is_campanha_meta);
        if (campanhaMeta) {
          const { data: metas } = await supabase
            .from("metas")
            .select(`${fkColuna}, valor_meta`)
            .eq("campanha_id", campanhaMeta.id)
            .eq("nivel", nivel);
          pesoById = new Map(
            ((metas ?? []) as unknown as Record<string, unknown>[]).map((m) => [
              m[fkColuna] as string,
              m.valor_meta as number,
            ]),
          );
        }
      } else {
        const { data: votos } = await supabase
          .from(vista)
          .select(`${fkColuna}, total_votos`)
          .eq("campanha_id", camada);
        pesoById = new Map(
          ((votos ?? []) as unknown as Record<string, unknown>[]).map((v) => [
            v[fkColuna] as string,
            v.total_votos as number,
          ]),
        );
      }

      if (cancelled || !map.current) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: pontos.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.longitude!, p.latitude!] },
          properties: { peso: pesoById.get(p.id) ?? 0 },
        })),
      };

      // Scale the weight to the layer's own maximum: a fixed ceiling made
      // bairro-level data (hundreds of votes) render almost invisible after
      // being calibrated for município totals (thousands).
      const maxPeso = Math.max(1, ...pontos.map((p) => pesoById.get(p.id) ?? 0));

      const source = map.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
        map.current.setPaintProperty(LAYER_ID, "heatmap-weight", [
          "interpolate",
          ["linear"],
          ["get", "peso"],
          0,
          0,
          maxPeso,
          1,
        ]);
      } else {
        map.current.addSource(SOURCE_ID, { type: "geojson", data: geojson });
        map.current.addLayer({
          id: LAYER_ID,
          type: "heatmap",
          source: SOURCE_ID,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "peso"], 0, 0, maxPeso, 1],
            "heatmap-intensity": 1,
            "heatmap-radius": 40,
            "heatmap-opacity": 0.8,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0,0,0,0)",
              0.2,
              "#1d4ed8",
              0.4,
              "#0ea5e9",
              0.6,
              "#facc15",
              0.8,
              "#f97316",
              1,
              "#dc2626",
            ],
          },
        });
      }
    }

    loadAndRender();
    return () => {
      cancelled = true;
    };
  }, [ready, camada, campanhas]);

  // Base UI resolves the trigger label from this map, not from the items.
  const camadaItems = useMemo(
    () => ({
      ...Object.fromEntries(campanhas.map((c) => [c.id, c.nome])),
      [META_OPTION]: "Meta 2026",
    }),
    [campanhas],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <Select items={camadaItems} value={camada} onValueChange={(v) => v && setCamada(v)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Camada" />
          </SelectTrigger>
          <SelectContent>
            {campanhas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
            <SelectItem value={META_OPTION}>Meta 2026</SelectItem>
          </SelectContent>
        </Select>

        <Card className="w-fit">
          <CardContent className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <span>Baixa</span>
            <div className="h-2 w-32 rounded-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600" />
            <span>Alta</span>
          </CardContent>
        </Card>
      </div>

      {erro && (
        <p className="text-sm text-destructive">
          Não foi possível carregar o mapa: {erro}
        </p>
      )}

      <div ref={mapContainer} className="h-[600px] w-full rounded-lg border" />
    </div>
  );
}
