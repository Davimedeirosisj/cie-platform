import { hasMapboxToken } from "@/lib/map/config";
import { MapboxTokenNotice } from "@/components/map/mapbox-token-notice";
import { InteractiveMap } from "@/components/map/interactive-map";

export default function MapaPage() {
  if (!hasMapboxToken()) return <MapboxTokenNotice />;
  return <InteractiveMap />;
}
