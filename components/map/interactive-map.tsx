"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createClient } from "@/lib/supabase/client";
import { useCampaignStore } from "@/stores/campaign-store";
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_MUNICIPIO_ZOOM,
  MAP_SECAO_ZOOM,
} from "@/lib/map/config";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MetaEditor } from "@/components/territory/meta-editor";

type Nivel = "municipio" | "bairro" | "secao";
type GeoPoint = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  votos: number;
  sublabel?: string;
};
type PanelState = {
  nivel: Nivel;
  id: string;
  nome: string;
  votos: number;
  sublabel?: string;
} | null;

// Seções are the level campaign work actually happens at, so they get their
// own colour and a smaller dot -- a bairro can hold dozens of them.
const ESTILO_MARCADOR: Record<Nivel, { cor: string; tamanho: string }> = {
  municipio: { cor: "#2563eb", tamanho: "14px" },
  bairro: { cor: "#16a34a", tamanho: "14px" },
  secao: { cor: "#ea580c", tamanho: "10px" },
};

export function InteractiveMap() {
  const campanhaId = useCampaignStore((s) => s.selectedCampanhaId);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  const [nivel, setNivel] = useState<Nivel>("municipio");
  const [municipioAtual, setMunicipioAtual] = useState<{ id: string; nome: string } | null>(null);
  const [bairroAtual, setBairroAtual] = useState<{ id: string; nome: string } | null>(null);
  const [panel, setPanel] = useState<PanelState>(null);
  // Root of the drill-down breadcrumb: read from the DB rather than hardcoded,
  // so changing the estado doesn't leave a stale name on the map.
  const [estadoNome, setEstadoNome] = useState("Estado");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("estados")
      .select("nome")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nome) setEstadoNome(data.nome);
      });
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: MAP_DEFAULT_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    // Surface Mapbox failures instead of leaving a blank container.
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

  // Fetch + render markers whenever level/município/campanha changes
  useEffect(() => {
    if (!map.current || !campanhaId) return;
    let cancelled = false;

    async function loadAndRender() {
      const supabase = createClient();
      let pontos: GeoPoint[] = [];

      if (nivel === "municipio") {
        const [{ data: municipios }, { data: votos }] = await Promise.all([
          supabase
            .from("municipios")
            .select("id, nome, latitude, longitude")
            .not("latitude", "is", null)
            .not("longitude", "is", null),
          supabase
            .from("vw_votos_municipio")
            .select("municipio_id, total_votos")
            .eq("campanha_id", campanhaId!),
        ]);
        const votosById = new Map((votos ?? []).map((v) => [v.municipio_id, v.total_votos]));
        pontos = (municipios ?? []).map((m) => ({
          id: m.id,
          nome: m.nome,
          latitude: m.latitude!,
          longitude: m.longitude!,
          votos: votosById.get(m.id) ?? 0,
        }));
      } else if (nivel === "secao" && bairroAtual) {
        // Seções carry TSE's own polling-place coordinates, so this level is
        // the one that says where to physically send people.
        const [{ data: secoes }, { data: votos }] = await Promise.all([
          supabase
            .from("secoes")
            .select("id, numero_secao, local_votacao, latitude, longitude")
            .eq("bairro_id", bairroAtual.id)
            .not("latitude", "is", null)
            .not("longitude", "is", null)
            .order("numero_secao"),
          supabase
            .from("votos")
            .select("secao_id, quantidade_votos")
            .eq("campanha_id", campanhaId!)
            .eq("nivel", "secao"),
        ]);
        const votosById = new Map(
          (votos ?? []).map((v) => [v.secao_id, v.quantidade_votos]),
        );
        pontos = (secoes ?? []).map((s) => ({
          id: s.id,
          nome: `Seção ${s.numero_secao}`,
          sublabel: s.local_votacao ?? undefined,
          latitude: s.latitude!,
          longitude: s.longitude!,
          votos: votosById.get(s.id) ?? 0,
        }));
      } else if (municipioAtual) {
        const [{ data: bairros }, { data: votos }] = await Promise.all([
          supabase
            .from("bairros")
            .select("id, nome, latitude, longitude")
            .eq("municipio_id", municipioAtual.id)
            .not("latitude", "is", null)
            .not("longitude", "is", null),
          supabase
            .from("vw_votos_bairro")
            .select("bairro_id, total_votos")
            .eq("campanha_id", campanhaId!),
        ]);
        const votosById = new Map((votos ?? []).map((v) => [v.bairro_id, v.total_votos]));
        pontos = (bairros ?? []).map((b) => ({
          id: b.id,
          nome: b.nome,
          latitude: b.latitude!,
          longitude: b.longitude!,
          votos: votosById.get(b.id) ?? 0,
        }));
      }

      if (cancelled || !map.current) return;

      markers.current.forEach((m) => m.remove());
      markers.current = [];

      for (const ponto of pontos) {
        const estilo = ESTILO_MARCADOR[nivel];
        const el = document.createElement("button");
        el.setAttribute("aria-label", ponto.nome);
        el.title = ponto.sublabel ? `${ponto.nome} - ${ponto.sublabel}` : ponto.nome;
        el.style.width = estilo.tamanho;
        el.style.height = estilo.tamanho;
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.background = estilo.cor;
        el.style.cursor = "pointer";
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.4)";

        el.addEventListener("click", () => {
          setPanel({
            nivel,
            id: ponto.id,
            nome: ponto.nome,
            votos: ponto.votos,
            sublabel: ponto.sublabel,
          });
          map.current?.flyTo({
            center: [ponto.longitude, ponto.latitude],
            zoom: nivel === "secao" ? MAP_SECAO_ZOOM : MAP_MUNICIPIO_ZOOM,
          });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([ponto.longitude, ponto.latitude])
          .addTo(map.current);
        markers.current.push(marker);
      }
    }

    loadAndRender();
    return () => {
      cancelled = true;
    };
  }, [nivel, municipioAtual, bairroAtual, campanhaId]);

  function handleVoltar() {
    setNivel("municipio");
    setMunicipioAtual(null);
    setBairroAtual(null);
    setPanel(null);
    map.current?.flyTo({ center: MAP_DEFAULT_CENTER, zoom: MAP_DEFAULT_ZOOM });
  }

  function handleVoltarAoMunicipio() {
    if (!municipioAtual) return;
    setNivel("bairro");
    setBairroAtual(null);
    setPanel(null);
  }

  function handleVerBairros() {
    if (panel?.nivel !== "municipio") return;
    setMunicipioAtual({ id: panel.id, nome: panel.nome });
    setBairroAtual(null);
    setNivel("bairro");
    setPanel(null);
  }

  function handleVerSecoes() {
    if (panel?.nivel !== "bairro") return;
    setBairroAtual({ id: panel.id, nome: panel.nome });
    setNivel("secao");
    setPanel(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={handleVoltar} className="text-muted-foreground hover:underline">
          {estadoNome}
        </button>
        {municipioAtual && (
          <>
            <span className="text-muted-foreground">/</span>
            {bairroAtual ? (
              <button
                onClick={handleVoltarAoMunicipio}
                className="text-muted-foreground hover:underline"
              >
                {municipioAtual.nome}
              </button>
            ) : (
              <span className="font-medium">{municipioAtual.nome}</span>
            )}
          </>
        )}
        {bairroAtual && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{bairroAtual.nome}</span>
          </>
        )}
      </div>

      {!campanhaId && (
        <p className="text-sm text-muted-foreground">
          Selecione uma campanha no topo da página para ver os votos no mapa.
        </p>
      )}

      {erro && (
        <p className="text-sm text-destructive">Não foi possível carregar o mapa: {erro}</p>
      )}

      {/* Always mounted: the init effect runs once and bails if this ref is
          empty, and campanhaId arrives only after the persisted store
          rehydrates -- gating the container behind it left the map never
          initialised. Only the markers depend on the campanha. */}
      <div ref={mapContainer} className="h-[600px] w-full rounded-lg border" />

      <Sheet open={!!panel} onOpenChange={(open) => !open && setPanel(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{panel?.nome}</SheetTitle>
            <SheetDescription>
              {panel?.sublabel && <span className="block">{panel.sublabel}</span>}
              {panel?.votos.toLocaleString("pt-BR")} votos na campanha selecionada
            </SheetDescription>
          </SheetHeader>
          {panel && (
            <div className="flex flex-col gap-4 px-4">
              <MetaEditor nivel={panel.nivel} targetId={panel.id} />
              <div className="flex flex-wrap gap-2">
                {panel.nivel === "municipio" && (
                  <Button variant="outline" onClick={handleVerBairros}>
                    Ver bairros
                  </Button>
                )}
                {panel.nivel === "bairro" && (
                  <Button variant="outline" onClick={handleVerSecoes}>
                    Ver seções
                  </Button>
                )}
                {/* "secao" pluralises to "secoes", so the route is spelled out
                    rather than derived from the level. */}
                <Button
                  variant="outline"
                  render={
                    <Link
                      href={`/${panel.nivel === "secao" ? "secoes" : `${panel.nivel}s`}/${panel.id}`}
                    />
                  }
                >
                  Ver detalhes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
