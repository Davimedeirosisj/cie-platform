import { hasMapboxToken } from "@/lib/map/config";
import { MapboxTokenNotice } from "@/components/map/mapbox-token-notice";
import { HeatmapMap } from "@/components/map/heatmap-map";

export default function MapaCalorPage() {
  if (!hasMapboxToken()) return <MapboxTokenNotice />;
  return <HeatmapMap />;
}
