"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createClient } from "@/lib/supabase/client";
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

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("campanhas")
      .select("id, nome, cargo, ano, status, is_campanha_meta")
      .order("ano", { ascending: false })
      .then(({ data }) => {
        const lista = (data ?? []) as Campanha[];
        setCampanhas(lista);
        setCamada((prev) => prev || lista[0]?.id || "");
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
      const { data: municipios } = await supabase
        .from("municipios")
        .select("id, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      let pesoById = new Map<string, number>();

      if (camada === META_OPTION) {
        const campanhaMeta = campanhas.find((c) => c.is_campanha_meta);
        if (campanhaMeta) {
          const { data: metas } = await supabase
            .from("metas")
            .select("municipio_id, valor_meta")
            .eq("campanha_id", campanhaMeta.id)
            .eq("nivel", "municipio");
          pesoById = new Map((metas ?? []).map((m) => [m.municipio_id!, m.valor_meta]));
        }
      } else {
        const { data: votos } = await supabase
          .from("vw_votos_municipio")
          .select("municipio_id, total_votos")
          .eq("campanha_id", camada);
        pesoById = new Map((votos ?? []).map((v) => [v.municipio_id, v.total_votos]));
      }

      if (cancelled || !map.current) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: (municipios ?? []).map((m) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [m.longitude!, m.latitude!] },
          properties: { peso: pesoById.get(m.id) ?? 0 },
        })),
      };

      const source = map.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      } else {
        map.current.addSource(SOURCE_ID, { type: "geojson", data: geojson });
        map.current.addLayer({
          id: LAYER_ID,
          type: "heatmap",
          source: SOURCE_ID,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "peso"], 0, 0, 5000, 1],
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

      <div ref={mapContainer} className="h-[600px] w-full rounded-lg border" />
    </div>
  );
}
